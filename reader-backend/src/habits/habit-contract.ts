import { z } from 'zod';
import { HABIT_COLORS, HABIT_ICONS, isDate, roundValue } from '@reader/habit-core';

export const dateInput = z.string().refine(isDate, 'Choose a valid calendar date.');
const amount = z.number().finite().min(0).max(999_999_999).refine(value => Math.abs(roundValue(value) - value) < 0.0000001, 'Use at most three decimal places.');
export const habitPlanInput = z.object({
  startDate: dateInput, endDate: dateInput.nullable(),
  frequency: z.enum(['DAILY', 'WEEKDAYS', 'WEEKLY', 'INTERVAL']),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  intervalDays: z.number().int().min(1).max(365), weeklyTarget: z.number().int().min(1).max(7),
  goalType: z.enum(['CHECK', 'COUNT']), target: amount.refine(value => value > 0, 'Set a goal greater than zero.'),
  unit: z.string().trim().max(30), step: amount.refine(value => value > 0, 'Set an increment greater than zero.'),
  reminders: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(8),
}).strict().superRefine((plan, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (plan.endDate && plan.endDate < plan.startDate) issue('End date must follow the start date.');
  if (new Set(plan.weekdays).size !== plan.weekdays.length || (plan.frequency === 'WEEKDAYS' && !plan.weekdays.length)) issue('Choose at least one unique weekday.');
  if (new Set(plan.reminders).size !== plan.reminders.length) issue('Reminder times must be unique.');
  if (plan.goalType === 'CHECK' && (plan.target !== 1 || plan.step !== 1)) issue('A check-off habit has a goal and increment of one.');
  if (plan.goalType === 'COUNT' && !plan.unit) issue('Name the unit you want to track.');
});
export const habitInput = z.object({
  name: z.string().trim().min(1, 'Name your habit.').max(160), description: z.string().trim().max(1000),
  icon: z.enum(HABIT_ICONS), color: z.enum(HABIT_COLORS), section: z.string().trim().min(1).max(80),
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; } }, 'Choose a valid timezone.'),
  plan: habitPlanInput,
}).strict();
export const createHabitInput = habitInput.extend({ requestKey: z.string().uuid() });
export const editHabitInput = habitInput.extend({ expectedVersion: z.number().int().positive() });
export const versionInput = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const completeInput = z.object({
  date: dateInput,
  items: z.array(z.object({ id: z.string().uuid(), habitVersion: z.number().int().positive(), expectedVersion: z.number().int().nonnegative() }).strict()).min(1).max(250),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Choose each habit only once.');
export const logInput = z.object({
  expectedVersion: z.number().int().nonnegative(), habitVersion: z.number().int().positive(),
  value: amount, status: z.enum(['RECORDED', 'SKIPPED', 'NONE']),
  note: z.string().trim().max(5000), mood: z.number().int().min(1).max(5).nullable(),
}).strict().superRefine((log, ctx) => {
  if (log.status !== 'RECORDED' && log.value !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Skipped or cleared days cannot have a completion amount.' });
  if (log.status === 'NONE' && (log.note || log.mood !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A cleared check-in cannot retain a note or mood.' });
});
