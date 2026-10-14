import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, type calendar_event, type calendar_occurrence } from '@prisma/client';
import { addDays, instantAt, nextPendingOccurrence, scheduledOccurrenceAt as findOccurrence, scheduleError, wallAt, type CalendarEvent, type Occurrence } from '@reader/calendar-core';
import { scheduled } from '@reader/habit-core';
import { habitDto } from '../habits/habit-service';
import { createEventInput, editEventInput, occurrenceInput, calendarVersionInput, type EventDraft } from './calendar-contract';
import { accountTransaction } from '../account-transaction';
import { createHierarchyTask } from '../task-hierarchy';

type Tx = Prisma.TransactionClient;
export class CalendarError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function calendarTransaction<T>(db: PrismaClient, userId: string, work: (tx: Tx) => Promise<T>) {
  return accountTransaction(db, userId, work);
}
export function eventDto(row: calendar_event & { exceptions?: calendar_occurrence[] }): CalendarEvent {
  return { id: row.id, title: row.title, description: row.description, location: row.location, color: row.color, taskId: row.taskId, habitId: row.habitId, start: row.startLocal, end: row.endLocal, allDay: row.allDay, timeZone: row.timeZone, repeat: row.recurrence as unknown as CalendarEvent['repeat'], reminders: row.reminders as number[], version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), exceptions: (row.exceptions ?? []).map(item => ({ date: item.date, start: item.startLocal, end: item.endLocal, allDay: item.allDay, completed: item.completed, cancelled: item.cancelled, version: item.version })) };
}
function eventData(draft: EventDraft) {
  const { start, end, repeat, ...fields } = draft;
  return { ...fields, startLocal: start, endLocal: end, startUtc: instantAt(start, draft.timeZone)!, endUtc: instantAt(end, draft.timeZone)!, recurrence: repeat ? repeat as Prisma.InputJsonValue : Prisma.DbNull, reminders: draft.reminders as Prisma.InputJsonValue };
}
async function ownEvent(tx: Tx, userId: string, id: string, version?: number) {
  const event = await tx.calendar_event.findFirst({ where: { id, userId, deletedAt: null }, include: { exceptions: true } });
  if (!event) throw new CalendarError(404, 'Calendar event not found.');
  if (version !== undefined && event.version !== version) throw new CalendarError(409, 'This event changed in another tab. Reload it before saving.');
  return event;
}
async function validateLinks(tx: Tx, userId: string, draft: Pick<EventDraft, 'taskId' | 'habitId' | 'start' | 'timeZone'>) {
  if (draft.taskId && !await tx.task.findFirst({ where: { id: draft.taskId, userId, deletedAt: null } })) throw new CalendarError(404, 'Task not found.');
  if (draft.habitId) {
    const row = await tx.habit.findFirst({ where: { id: draft.habitId, userId, archivedAt: null } });
    if (!row) throw new CalendarError(404, 'Active habit not found.');
    if (!scheduled(habitDto(row), draft.start.slice(0, 10))) throw new CalendarError(400, 'This habit is not scheduled on the chosen date.');
    if (row.timezone !== draft.timeZone) throw new CalendarError(400, 'A habit reservation must use the habit’s timezone so its check-in date stays correct.');
  }
}
export async function getCalendarEvent(db: PrismaClient, userId: string, id: string) {
  return eventDto(await ownEvent(db, userId, id));
}
/** Keep the task's next due date synchronized while preserving recurrence completion history. */
export async function syncTaskSchedule(tx: Tx, userId: string, taskId: string, now = new Date()) {
  const task = await tx.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) return;
  const rows = await tx.calendar_event.findMany({ where: { userId, taskId, deletedAt: null }, include: { exceptions: true } });
  if (!rows.length) return;
  const pending: Occurrence[] = [];
  for (const row of rows) {
    const next = nextPendingOccurrence(eventDto(row));
    if (next) pending.push(next);
  }
  pending.sort((a, b) => a.startInstant.localeCompare(b.startInstant));
  const next = pending[0];
  const data = next ? { dueDate: new Date(`${next.start.slice(0, 10)}T00:00:00Z`), dueTime: next.allDay ? null : next.start.slice(11), status: task.status === 'cancelled' ? 'cancelled' : task.status === 'in_progress' ? 'in_progress' : 'todo', completedAt: null }
    : { status: task.status === 'cancelled' ? 'cancelled' : 'done', completedAt: task.status === 'cancelled' ? null : task.completedAt ?? now };
  await tx.task.update({ where: { id: taskId }, data: { ...data, version: { increment: 1 }, updatedAt: now } });
}
export async function createCalendarEvent(db: PrismaClient, userId: string, raw: unknown) {
  const { requestKey, newTask, ...draft } = createEventInput.parse(raw);
  const first = nextPendingOccurrence({ ...draft, id: 'new', exceptions: [] });
  if (!first) throw new CalendarError(400, 'This repeat rule has no occurrence. Choose a later end date or another weekday.');
  const requestHash = createHash('sha256').update(JSON.stringify({ ...draft, ...(newTask ? { newTask } : {}) })).digest('hex');
  return calendarTransaction(db, userId, async tx => {
    const previous = await tx.calendar_event.findUnique({ where: { userId_requestKey: { userId, requestKey } }, include: { exceptions: true } });
    if (previous) {
      if (previous.requestHash !== requestHash || previous.deletedAt) throw new CalendarError(409, 'This creation request has already been used. Reload before creating another event.');
      return eventDto(previous);
    }
    await validateLinks(tx, userId, draft);
    if (await tx.calendar_event.count({ where: { userId, deletedAt: null } }) >= 2000) throw new CalendarError(409, 'Your calendar has 2,000 active series. Remove an unused series before adding more.');
    if (draft.taskId && await tx.calendar_event.findFirst({ where: { userId, taskId: draft.taskId, deletedAt: null } })) throw new CalendarError(409, 'This task already has a schedule. Edit its existing calendar event.');
    // Task and reservation share the account transaction and creation receipt.
    // A failed calendar write or a retried request cannot leave an orphan task.
    const target = newTask ? { ...draft, taskId: (await createHierarchyTask(tx, userId, { title: draft.title, description: draft.description, listId: newTask.listId, priority: newTask.priority, createdAt: new Date(), updatedAt: new Date() })).id } : draft;
    const row = await tx.calendar_event.create({ data: { id: randomUUID(), userId, requestKey, requestHash, ...eventData(target) } });
    if (target.taskId) {
      const task = await tx.task.findUniqueOrThrow({ where: { id: target.taskId } });
      if (task.status === 'done') await tx.calendar_occurrence.create({ data: { id: randomUUID(), userId, eventId: row.id, date: first.date, startLocal: first.start, endLocal: first.end, allDay: first.allDay, completed: true } });
      await syncTaskSchedule(tx, userId, target.taskId);
    }
    return eventDto(await ownEvent(tx, userId, row.id));
  });
}
export async function editCalendarEvent(db: PrismaClient, userId: string, id: string, raw: unknown) {
  const { expectedVersion, scope, fromDate, ...draft } = editEventInput.parse(raw);
  const first = nextPendingOccurrence({ ...draft, id, exceptions: [] });
  if (!first) throw new CalendarError(400, 'This repeat rule has no occurrence. Choose a later end date or another weekday.');
  return calendarTransaction(db, userId, async tx => {
    const existing = await ownEvent(tx, userId, id, expectedVersion), event = eventDto(existing);
    if (existing.taskId !== draft.taskId || existing.habitId !== draft.habitId) throw new CalendarError(400, 'Keep the existing linked task or habit. Create another event to change the link.');
    await validateLinks(tx, userId, draft);
    if (scope === 'following') {
      if (!event.repeat || !fromDate || !findOccurrence(event, fromDate)) throw new CalendarError(400, 'Choose an occurrence in this recurring series.');
      if (fromDate <= nextPendingOccurrence({ ...event, exceptions: [] })!.date) throw new CalendarError(400, 'Use the entire series option for its first occurrence.');
      if (draft.start.slice(0, 10) < fromDate) throw new CalendarError(400, 'The new series cannot begin before the selected occurrence.');
      if (await tx.calendar_event.count({ where: { userId, deletedAt: null } }) >= 2000) throw new CalendarError(409, 'Your calendar has 2,000 active series. Remove an unused series before splitting this one.');
      await tx.calendar_event.update({ where: { id }, data: { recurrence: { ...event.repeat, until: addDays(fromDate, -1) }, version: { increment: 1 } } });
      const row = await tx.calendar_event.create({ data: { id: randomUUID(), userId, requestKey: randomUUID(), requestHash: createHash('sha256').update(JSON.stringify(draft)).digest('hex'), ...eventData(draft) } });
      // Transfer matching future exceptions, including completion history, exactly once.
      // Completed exceptions outside the new rule remain attached to the historical series.
      for (const exception of existing.exceptions.filter(item => item.date >= fromDate)) {
        if (exception.date === fromDate && !exception.completed) {
          if (existing.exceptions.some(item => item.id !== exception.id && item.date === first.date)) throw new CalendarError(409, 'The new first date already has an edited occurrence. Choose another date.');
          await tx.calendar_occurrence.update({ where: { id: exception.id }, data: { eventId: row.id, date: first.date, startLocal: first.start, endLocal: first.end, allDay: first.allDay, version: { increment: 1 } } });
        }
        else if (findOccurrence(eventDto(row), exception.date)) await tx.calendar_occurrence.update({ where: { id: exception.id }, data: { eventId: row.id, ...preservedHistory(exception, event, draft), version: { increment: 1 } } });
        else if (!exception.completed) await tx.calendar_occurrence.update({ where: { id: exception.id }, data: { cancelled: true, version: { increment: 1 } } });
      }
      if (draft.taskId) {
        await tx.task.update({ where: { id: draft.taskId }, data: { title: draft.title } });
        await syncTaskSchedule(tx, userId, draft.taskId);
      }
      return eventDto(await ownEvent(tx, userId, row.id));
    }
    // A one-time event may have an override after dragging or editing its task.
    // Move that same occurrence with the event so the old override cannot win
    // over new times or become a duplicate on the previous date.
    const singleOverride = !event.repeat ? existing.exceptions.find(item => item.date === event.start.slice(0, 10)) : undefined;
    if (singleOverride) {
      const date = first.date;
      if (existing.exceptions.some(item => item.id !== singleOverride.id && item.date === date)) throw new CalendarError(409, 'This date already has saved calendar history. Choose another date.');
      await tx.calendar_occurrence.update({ where: { id: singleOverride.id }, data: { date, startLocal: first.start, endLocal: first.end, allDay: first.allDay, version: { increment: 1 } } });
    }
    // Changing a rule must not leave pending overrides outside that rule as
    // extra events. Completed history remains visible at its original time.
    for (const exception of existing.exceptions.filter(item => !item.completed && item.id !== singleOverride?.id)) {
      if (!draft.repeat || !findOccurrence({ ...event, ...draft }, exception.date)) await tx.calendar_occurrence.delete({ where: { id: exception.id } });
    }
    if (event.timeZone !== draft.timeZone) for (const exception of existing.exceptions.filter(item => item.completed && item.id !== singleOverride?.id)) {
      const data = preservedHistory(exception, event, draft);
      if (Object.keys(data).length) await tx.calendar_occurrence.update({ where: { id: exception.id }, data: { ...data, version: { increment: 1 } } });
    }
    const row = await tx.calendar_event.update({ where: { id }, data: { ...eventData(draft), version: { increment: 1 } }, include: { exceptions: true } });
    if (draft.taskId) {
      await tx.task.update({ where: { id: draft.taskId }, data: { title: draft.title } });
      await syncTaskSchedule(tx, userId, draft.taskId);
    }
    return eventDto(row);
  });
}
function preservedHistory(exception: calendar_occurrence, before: CalendarEvent, after: EventDraft) {
  if (!exception.completed || (exception.allDay ?? before.allDay) || before.timeZone === after.timeZone || !exception.startLocal || !exception.endLocal) return {};
  return { startLocal: wallAt(instantAt(exception.startLocal, before.timeZone)!, after.timeZone), endLocal: wallAt(instantAt(exception.endLocal, before.timeZone)!, after.timeZone), allDay: false };
}
export async function saveCalendarOccurrence(db: PrismaClient, userId: string, id: string, date: string, raw: unknown) {
  const input = occurrenceInput.parse(raw);
  return calendarTransaction(db, userId, async tx => {
    const row = await ownEvent(tx, userId, id, input.eventVersion), event = eventDto(row);
    const previous = row.exceptions.find(item => item.date === date);
    if ((previous?.version ?? 0) !== input.expectedVersion) throw new CalendarError(409, 'This occurrence changed in another tab. Reload before saving.');
    const original = findOccurrence(event, date);
    if (!original && !previous) throw new CalendarError(400, 'This date is not an occurrence of the event.');
    const start = input.start ?? previous?.startLocal ?? original?.start, end = input.end ?? previous?.endLocal ?? original?.end;
    if (!start || !end) throw new CalendarError(400, 'This occurrence no longer has a valid time. Edit the series instead.');
    const allDay = input.allDay ?? previous?.allDay ?? event.allDay;
    const error = scheduleError({ start, end, allDay, timeZone: event.timeZone, repeat: null });
    if (error) throw new CalendarError(400, error);
    if (row.habitId) {
      if (input.completed) throw new CalendarError(400, 'Record progress in the habit check-in editor. A calendar reservation does not complete a habit.');
      await validateLinks(tx, userId, { ...event, start });
    }
    await tx.calendar_occurrence.upsert({ where: { eventId_date: { eventId: id, date } }, create: { id: randomUUID(), userId, eventId: id, date, startLocal: start, endLocal: end, allDay, completed: input.completed, cancelled: input.cancelled }, update: { startLocal: start, endLocal: end, allDay, completed: input.completed, cancelled: input.cancelled, version: { increment: 1 } } });
    await tx.calendar_event.update({ where: { id }, data: { version: { increment: 1 } } });
    if (row.taskId) await syncTaskSchedule(tx, userId, row.taskId);
    return eventDto(await ownEvent(tx, userId, id));
  });
}
export async function deleteCalendarEvent(db: PrismaClient, userId: string, id: string, raw: unknown) {
  const { expectedVersion } = calendarVersionInput.parse(raw);
  return calendarTransaction(db, userId, async tx => {
    const row = await ownEvent(tx, userId, id, expectedVersion);
    await tx.calendar_event.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    if (row.taskId) {
      const remaining = await tx.calendar_event.count({ where: { userId, taskId: row.taskId, deletedAt: null } });
      if (remaining) await syncTaskSchedule(tx, userId, row.taskId);
      else await tx.task.updateMany({ where: { id: row.taskId, userId, deletedAt: null }, data: { dueDate: null, dueTime: null, version: { increment: 1 } } });
    }
  });
}
