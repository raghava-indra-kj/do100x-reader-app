import { z } from 'zod';
import { addDays, validDate, validZone, wallAt } from '@reader/calendar-core';
import { TaskHierarchyError } from './task-errors';

export const taskDate = z.string().refine(value => (validDate(value) || /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(value)) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value)), 'Choose a valid task date.').transform(value => new Date(`${value.slice(0, 10)}T00:00:00.000Z`)).nullable();
export const taskFields = z.object({
  title: z.string().trim().min(1, 'Enter a task title.').max(1000),
  description: z.string().max(100_000).nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
  priority: z.number().int().min(1).max(4),
  dueDate: taskDate,
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.').nullable(),
  listId: z.string().max(36).nullable(), parentId: z.string().max(36).nullable(),
  sortOrder: z.number().int().min(0).max(2_000_000_000),
});
export const createTaskInput = taskFields.partial().extend({ title: taskFields.shape.title }).strict();
export const updateTaskInput = taskFields.partial().extend({ expectedVersion: z.number().int().positive().optional() }).strict();
export const listFields = z.object({ name: z.string().trim().min(1, 'Enter a list name.').max(255), color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).nullable(), icon: z.string().max(50).nullable(), sortOrder: z.number().int().min(0).max(2_000_000_000) });
export const createListInput = listFields.partial().extend({ name: listFields.shape.name }).strict();
export const updateListInput = listFields.partial().strict();
export function parseTaskInput<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new TaskHierarchyError(400, result.error.issues[0]?.message ?? 'Check the entered values.');
  return result.data;
}
/** Stored task due dates are calendar keys at UTC midnight, not local instants. */
export function taskDueFilter(due: unknown, zone: unknown = 'UTC', now = new Date()) {
  if (typeof zone !== 'string' || !validZone(zone)) throw new TaskHierarchyError(400, 'Choose a valid timezone.');
  if (!['all', 'today', 'tomorrow', 'next7', 'overdue'].includes(due as string)) throw new TaskHierarchyError(400, 'Choose a valid due-date filter.');
  if (due === 'all') return undefined;
  const today = wallAt(now, zone).slice(0, 10), at = (date: string) => new Date(`${date}T00:00:00.000Z`);
  if (due === 'overdue') return { lt: at(today) };
  const start = due === 'tomorrow' ? addDays(today, 1) : today;
  return { gte: at(start), lt: at(addDays(start, due === 'next7' ? 7 : 1)) };
}
