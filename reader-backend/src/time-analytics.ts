import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { addDays, instantAt, validDate, validZone, wallAt } from '@reader/calendar-core';
import { parseTaskInput } from './task-contract';
import { TaskHierarchyError } from './task-errors';

const inputSchema = z.object({
  preset: z.enum(['today', 'yesterday', '7', '14', '30', 'all', 'custom']).default('7'),
  days: z.coerce.number().int().min(1).max(3660).optional(),
  startDate: z.string().refine(validDate).optional(), endDate: z.string().refine(validDate).optional(),
  listId: z.string().max(36).optional(), taskId: z.string().max(36).optional(),
  timeZone: z.string().max(100).refine(validZone).default('UTC'),
}).strict().refine(value => !!value.startDate === !!value.endDate && (!value.startDate || value.startDate <= value.endDate!) && (value.preset !== 'custom' || !!value.startDate), 'Choose a complete, ordered report date range.');

export async function timeAnalytics(db: PrismaClient, userId: string, raw: unknown, now = new Date()) {
  const input = parseTaskInput(inputSchema, raw);
  const today = wallAt(now, input.timeZone).slice(0, 10);
  let first = today, last = today, periodLabel = 'Today';
  if (input.startDate && input.endDate) { first = input.startDate; last = input.endDate; periodLabel = `${first} to ${last}`; }
  else if (input.preset === 'yesterday') { first = last = addDays(today, -1); periodLabel = 'Yesterday'; }
  else if (input.preset === 'all') { first = '1970-01-01'; periodLabel = 'All time'; }
  else if (input.preset !== 'today') { const count = input.days ?? Number(input.preset); first = addDays(today, 1 - count); periodLabel = `Last ${count} days`; }
  const start = instantAt(`${first}T00:00`, input.timeZone), end = instantAt(`${addDays(last, 1)}T00:00`, input.timeZone);
  if (!start || !end) throw new TaskHierarchyError(400, 'This report boundary falls at a skipped local midnight. Choose another date.');
  const allTime = input.preset === 'all' && !input.startDate;
  const sessions = await db.time_session.findMany({ where: { userId, startTime: { ...(allTime ? {} : { gte: start }), lt: end }, ...(input.taskId && input.taskId !== 'all' ? { taskId: input.taskId } : {}) }, orderBy: { startTime: 'desc' } });
  const tasks = await db.task.findMany({ where: { userId, id: { in: [...new Set(sessions.map(item => item.taskId))] } }, select: { id: true, title: true, listId: true, deletedAt: true } });
  const taskMap = new Map(tasks.map(item => [item.id, item]));
  const lists = await db.task_list.findMany({ where: { userId }, select: { id: true, name: true, color: true, deletedAt: true } });
  const listMap = new Map(lists.map(item => [item.id, item]));
  const listFilter = input.listId && input.listId !== 'all' ? ['inbox', 'null'].includes(input.listId) ? null : input.listId : undefined;
  const included = sessions.filter(item => listFilter === undefined || (taskMap.has(item.taskId) && taskMap.get(item.taskId)!.listId === listFilter));
  const taskTotals = new Map<string, { taskId: string; title: string; seconds: number; listName: string; deleted: boolean }>();
  const listTotals = new Map<string, { listId: string | null; name: string; color: string; seconds: number }>();
  const dailyTimeline: Record<string, number> = {};
  let totalSeconds = 0;
  for (const session of included) {
    const task = taskMap.get(session.taskId), listId = task?.listId ?? null, list = listId ? listMap.get(listId) : null;
    const listName = list ? `${list.name}${list.deletedAt ? ' (deleted)' : ''}` : (listId ? 'Deleted list' : 'Inbox');
    const byTask = taskTotals.get(session.taskId) ?? { taskId: session.taskId, title: task?.title ?? 'Deleted task', seconds: 0, listName, deleted: !task || !!task.deletedAt };
    const byList = listTotals.get(listId ?? 'inbox') ?? { listId, name: listName, color: list?.color ?? '#3b82f6', seconds: 0 };
    totalSeconds += session.durationSeconds; byTask.seconds += session.durationSeconds; byList.seconds += session.durationSeconds;
    taskTotals.set(session.taskId, byTask); listTotals.set(listId ?? 'inbox', byList);
    // A saved session belongs to its start date in the caller's timezone.
    const date = wallAt(session.startTime, input.timeZone).slice(0, 10);
    dailyTimeline[date] = (dailyTimeline[date] ?? 0) + session.durationSeconds;
  }
  return { periodLabel, startDate: (allTime && included.length ? included[included.length - 1].startTime : start).toISOString(), endDate: end.toISOString(), timeZone: input.timeZone, attribution: 'session-start-date', totalSeconds, sessionsCount: included.length, byTask: [...taskTotals.values()].sort((a, b) => b.seconds - a.seconds), byList: [...listTotals.values()].sort((a, b) => b.seconds - a.seconds), dailyTimeline };
}
