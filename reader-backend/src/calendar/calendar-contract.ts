import { z } from 'zod';
import { scheduleError, validDate, validWall, validZone } from '@reader/calendar-core';
export const calendarDateInput = z.string().refine(value => validDate(value) && value >= '1900-01-01' && value < '9999-01-01', 'Choose a date between 1900 and 9998.');
const wall = z.string().refine(validWall, 'Choose a valid date and time.');
export const repeatInput = z.object({ frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']), interval: z.number().int().min(1).max(365), weekdays: z.array(z.number().int().min(0).max(6)).max(7), monthlyMode: z.enum(['DATE', 'WEEKDAY']), count: z.number().int().min(1).max(10000).nullable(), until: calendarDateInput.nullable() }).strict().nullable();
export const eventFields = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(1000), description: z.string().trim().max(15000), location: z.string().trim().max(1000),
  color: z.enum(['orange', 'green', 'blue', 'violet', 'rose', 'teal']), timeZone: z.string().max(100).refine(validZone, 'Choose a valid timezone.'),
  start: wall, end: wall, allDay: z.boolean(), repeat: repeatInput,
  taskId: z.string().uuid().nullable(), habitId: z.string().uuid().nullable(),
  reminders: z.array(z.number().int().min(0).max(10080)).max(5),
}).strict();
function validateEvent(value: z.infer<typeof eventFields>, ctx: z.RefinementCtx) {
  const error = scheduleError(value);
  if (error) ctx.addIssue({ code: 'custom', message: error });
  if (value.taskId && value.habitId) ctx.addIssue({ code: 'custom', message: 'Link either a task or a habit.' });
  if (new Set(value.reminders).size !== value.reminders.length) ctx.addIssue({ code: 'custom', message: 'Reminder offsets must be unique.' });
}
export const createEventInput = eventFields.extend({ requestKey: z.string().uuid(), newTask: z.object({ listId: z.string().uuid().nullable(), priority: z.number().int().min(1).max(4) }).strict().optional() }).superRefine((value, ctx) => {
  validateEvent(value, ctx);
  if (value.newTask && (value.taskId || value.habitId)) ctx.addIssue({ code: 'custom', message: 'Create a new task or link an existing item, not both.' });
});
export const editEventInput = eventFields.extend({ expectedVersion: z.number().int().positive(), scope: z.enum(['series', 'following']).default('series'), fromDate: calendarDateInput.optional() }).superRefine(validateEvent);
export const occurrenceInput = z.object({ expectedVersion: z.number().int().nonnegative(), eventVersion: z.number().int().positive(), start: wall.nullable(), end: wall.nullable(), allDay: z.boolean().nullable(), completed: z.boolean(), cancelled: z.boolean() }).strict().superRefine((value, ctx) => {
  if (!!value.start !== !!value.end || (value.start && value.end! <= value.start)) ctx.addIssue({ code: 'custom', message: 'Choose a complete, ordered time range.' });
  if (value.completed && value.cancelled) ctx.addIssue({ code: 'custom', message: 'A completed occurrence cannot also be cancelled.' });
});
export const calendarVersionInput = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const preferencesInput = z.object({
  timeZone: z.string().max(100).refine(validZone), firstDay: z.union([z.literal(0), z.literal(1)]),
  defaultView: z.enum(['day', 'week', 'month', 'year', 'agenda']), workStart: z.number().int().min(0).max(23), workEnd: z.number().int().min(1).max(24),
  workDays: z.array(z.number().int().min(0).max(6)).max(7), defaultMinutes: z.number().int().min(5).max(480),
  showHabits: z.boolean(), showFocus: z.boolean(), showCompleted: z.boolean(), colorBy: z.enum(['event', 'list', 'priority']),
}).strict().refine(value => value.workEnd > value.workStart && new Set(value.workDays).size === value.workDays.length, 'Choose valid working hours and days.');
export type EventDraft = z.infer<typeof eventFields>;
