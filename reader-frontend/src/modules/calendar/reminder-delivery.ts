import type { CalendarEvent, Occurrence } from '@reader/calendar-core';
import { dayStatus, localDate, planOn, scheduled, weekProgress } from '@reader/habit-core';
import type { CalendarRange } from './api';

export type DueCalendarReminder = { event: CalendarEvent; occurrence: Occurrence; due: number; key: string };

/** The linked task or habit remains the authority for whether a reminder is useful. */
export function dueCalendarReminders(data: CalendarRange, now: Date): DueCalendarReminder[] {
  const events = new Map(data.events.map(event => [event.id, event]));
  const tasks = new Map(data.tasks.map(task => [task.id, task]));
  const habits = new Map(data.habits.map(habit => [habit.id, habit]));
  return data.occurrences.flatMap(occurrence => {
    const event = events.get(occurrence.eventId);
    if (!event || occurrence.completed || occurrence.cancelled) return [];
    if (event.taskId) {
      const task = tasks.get(event.taskId);
      if (!task || task.status === 'done' || task.status === 'cancelled') return [];
    }
    if (event.habitId) {
      const habit = habits.get(event.habitId), date = occurrence.start.slice(0, 10);
      if (!habit || habit.archivedAt || !scheduled(habit, date)) return [];
      const today = localDate(habit.timezone, now), plan = planOn(habit, date);
      if (['done', 'skipped'].includes(dayStatus(habit, date, today))) return [];
      if (plan?.frequency === 'WEEKLY') {
        const progress = weekProgress(habit, date, today);
        if (progress.done >= progress.target) return [];
      }
    }
    return event.reminders.flatMap(minutes => {
      const due = Date.parse(occurrence.startInstant) - minutes * 60000;
      return due <= now.getTime() && due >= now.getTime() - 90000
        ? [{ event, occurrence, due, key: `${occurrence.key}/${due}` }] : [];
    });
  });
}

type ReceiptStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** A failed browser delivery stays retryable; restricted storage must not disable reminders. */
export function deliverCalendarReminders(reminders: DueCalendarReminder[], prefix: string, now: number, delivered: Map<string, number>, storage: ReceiptStorage | null, notify: (reminder: DueCalendarReminder, receipt: string) => void) {
  for (const reminder of reminders) {
    const receipt = `${prefix}.sent.${reminder.key}`;
    if (delivered.has(receipt)) continue;
    try { if (storage?.getItem(receipt)) continue; } catch { /* Use this page's receipts. */ }
    try { notify(reminder, receipt); } catch { continue; }
    delivered.set(receipt, now);
    try { storage?.setItem(receipt, String(now)); } catch { /* The in-memory receipt still prevents repeat delivery. */ }
  }
  for (const [receipt, sent] of delivered) if (sent < now - 8 * 86400000) delivered.delete(receipt);
}
