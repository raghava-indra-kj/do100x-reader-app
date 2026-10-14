import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { addDays, diffDays, expandSchedule, instantAt, validZone, weekStart } from '@reader/calendar-core';
import { habitDto } from '../habits/habit-service';
import { calendarDateInput, preferencesInput } from './calendar-contract';
import { CalendarError, calendarTransaction, eventDto } from './calendar-service';
import { listCalendarSources, sourceOccurrences } from './calendar-sources';

export const defaultCalendarPreferences = (timeZone = 'UTC'): z.infer<typeof preferencesInput> => ({ timeZone, firstDay: 1, defaultView: 'week', workStart: 8, workEnd: 20, workDays: [1, 2, 3, 4, 5], defaultMinutes: 30, showHabits: true, showFocus: false, showCompleted: true, colorBy: 'event' });
const listInput = z.union([z.string().uuid(), z.literal('inbox')]).optional();
const rangeInput = z.object({ from: calendarDateInput, to: calendarDateInput, timeZone: z.string().max(100).refine(validZone), listId: listInput }).strict().refine(value => value.from < value.to && diffDays(value.from, value.to) <= 370, 'Choose a calendar range of up to 370 days.');
const taskSelect = { id: true, title: true, description: true, status: true, priority: true, listId: true, parentId: true, dueDate: true, dueTime: true, version: true, updatedAt: true } as const;
export async function calendarPreferences(db: PrismaClient, userId: string, timeZone = 'UTC') {
  const row = await db.calendar_settings.findUnique({ where: { userId } });
  return { preferences: row ? preferencesInput.parse(row.preferences) : defaultCalendarPreferences(timeZone), version: row?.version ?? 0 };
}
export async function saveCalendarPreferences(db: PrismaClient, userId: string, raw: unknown) {
  const { preferences, expectedVersion } = z.object({ preferences: preferencesInput, expectedVersion: z.number().int().nonnegative() }).strict().parse(raw);
  return calendarTransaction(db, userId, async tx => {
    const current = await tx.calendar_settings.findUnique({ where: { userId } });
    if ((current?.version ?? 0) !== expectedVersion) throw new CalendarError(409, 'Calendar preferences changed in another tab. Reload before saving.');
    const row = await tx.calendar_settings.upsert({ where: { userId }, create: { userId, preferences }, update: { preferences, version: { increment: 1 } } });
    return { preferences: preferencesInput.parse(row.preferences), version: row.version };
  });
}
export async function unscheduledTasks(db: PrismaClient, userId: string, raw: unknown) {
  const { cursor, search, listId } = z.object({ cursor: z.string().uuid().optional(), search: z.string().max(200).default(''), listId: listInput }).strict().parse(raw);
  const rows = await db.task.findMany({ where: { userId, deletedAt: null, status: { in: ['todo', 'in_progress'] }, dueDate: null, calendarEvents: { none: { deletedAt: null } }, ...(listId ? { listId: listId === 'inbox' ? null : listId } : {}), ...(search ? { title: { contains: search } } : {}), ...(cursor ? { id: { gt: cursor } } : {}) }, select: taskSelect, orderBy: { id: 'asc' }, take: 101 });
  return { items: rows.slice(0, 100), nextCursor: rows.length > 100 ? rows[99].id : null };
}
export async function taskSchedules(db: PrismaClient, userId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, userId, deletedAt: null }, select: taskSelect });
  if (!task) throw new CalendarError(404, 'Task not found.');
  const events = await db.calendar_event.findMany({ where: { taskId: id, userId, deletedAt: null }, include: { exceptions: true }, orderBy: { startUtc: 'asc' } });
  return { task, events: events.map(eventDto) };
}
export async function calendarRange(db: PrismaClient, userId: string, raw: unknown, options: { includeSources?: boolean } = {}) {
  const { from, to, timeZone, listId } = rangeInput.parse(raw);
  const start = instantAt(`${from}T00:00`, timeZone), end = instantAt(`${to}T00:00`, timeZone);
  if (!start || !end) throw new CalendarError(400, 'This range starts or ends at a skipped local midnight. Choose another date.');
  const taskList = listId ? { listId: listId === 'inbox' ? null : listId } : {};
  // Filter before result limits, including retained focus belonging to soft-deleted tasks.
  const focusIds = listId ? (await db.task.findMany({ where: { userId, ...taskList }, select: { id: true } })).map(task => task.id) : null;
  const [rows, tasks, lists, habits, focus, settings] = await Promise.all([
    db.calendar_event.findMany({
      where: { userId, deletedAt: null, AND: [
        listId ? { task: { userId, deletedAt: null, ...taskList } } : { OR: [{ taskId: null }, { task: { deletedAt: null } }] },
        { OR: [
          { recurrence: { not: Prisma.DbNull } }, { startUtc: { lt: end }, endUtc: { gt: start } },
          { allDay: true, startLocal: { lt: `${to}T00:00` }, endLocal: { gt: `${from}T00:00` } },
          { exceptions: { some: { startLocal: { lt: `${addDays(to, 2)}T00:00` }, endLocal: { gt: `${addDays(from, -2)}T00:00` } } } },
        ] },
      ] },
      include: { exceptions: true }, orderBy: { startUtc: 'asc' },
    }),
    db.task.findMany({ where: { userId, deletedAt: null, ...taskList, OR: [{ dueDate: { gte: new Date(`${from}T00:00:00Z`), lt: new Date(`${to}T00:00:00Z`) } }, { calendarEvents: { some: { deletedAt: null } } }] }, select: taskSelect, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], take: 5001 }),
    db.task_list.findMany({ where: { userId, deletedAt: null }, select: { id: true, name: true, color: true }, orderBy: { sortOrder: 'asc' } }),
    // Include the whole local week for flexible weekly targets, also across display zones.
    listId ? [] : db.habit.findMany({ where: { userId, archivedAt: null }, include: { logs: { where: { date: { gte: weekStart(addDays(from, -2), 1), lt: addDays(to, 2) } } } }, orderBy: { sortOrder: 'asc' } }),
    db.time_session.findMany({ where: { userId, ...(focusIds ? { taskId: { in: focusIds } } : {}), startTime: { lt: end }, OR: [{ endTime: { gt: start } }, { endTime: null, startTime: { gte: start } }] }, orderBy: { startTime: 'asc' }, take: 5001 }),
    calendarPreferences(db, userId, timeZone),
  ]);
  if (tasks.length > 5000 || focus.length > 5000) throw new CalendarError(400, 'This view contains more than 5,000 tasks or focus sessions. Choose a shorter range or a task list.');
  // All-day dates float with the displayed calendar, even across the international date line.
  const events = rows.map(eventDto), occurrences = events.flatMap(event => expandSchedule(event, new Date(start.getTime() - 172800000).toISOString(), new Date(end.getTime() + 172800000).toISOString())).filter(item => item.allDay ? item.start < `${to}T00:00` && item.end > `${from}T00:00` : item.startInstant < end.toISOString() && item.endInstant > start.toISOString());
  if (occurrences.length > 20000) throw new CalendarError(400, 'This view contains more than 20,000 occurrences. Choose a shorter date range.');
  const focusTasks = new Map((await db.task.findMany({ where: { userId, id: { in: [...new Set(focus.map(item => item.taskId))] } }, select: { id: true, title: true, listId: true } })).map(item => [item.id, item]));
  const sources = options.includeSources === false ? { sources: [], external: [], sourceErrors: [] } : listId ? { sources: await listCalendarSources(db, userId), external: [], sourceErrors: [] } : await sourceOccurrences(db, userId, from, to, timeZone);
  return { from, to, timeZone, listId: listId ?? null, events, occurrences, tasks, lists, habits: habits.map(habitDto), focus: focus.map(item => ({ id: item.id, taskId: item.taskId, title: focusTasks.get(item.taskId)?.title ?? 'Deleted task', listId: focusTasks.get(item.taskId)?.listId ?? null, start: item.startTime.toISOString(), end: item.endTime?.toISOString() ?? new Date(item.startTime.getTime() + item.durationSeconds * 1000).toISOString(), durationSeconds: item.durationSeconds, notes: item.notes })), ...settings, ...sources };
}
