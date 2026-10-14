import { describe, expect, it, vi } from 'vitest';
import { expandSchedule, type CalendarEvent } from '@reader/calendar-core';
import type { Habit } from '@reader/habit-core';
import type { CalendarRange, CalendarTask } from './api';
import { defaultPreferences } from './model';
import { deliverCalendarReminders, dueCalendarReminders } from './reminder-delivery';

const now = new Date('2026-10-14T03:20:00Z');
const event: CalendarEvent = { id: 'event', title: 'Read', description: '', location: '', color: 'green', start: '2026-10-14T09:00', end: '2026-10-14T09:30', allDay: false, timeZone: 'Asia/Kolkata', repeat: null, reminders: [10], taskId: null, habitId: null, version: 1, exceptions: [], createdAt: '', updatedAt: '' };
const habit: Habit = { id: 'habit', name: 'Read', description: '', icon: 'book', color: 'green', section: '', timezone: 'Asia/Kolkata', sortOrder: 0, version: 1, archivedAt: null, pauses: [], createdAt: '', updatedAt: '', logs: [], plans: [{ id: 'plan', effectiveFrom: '2026-10-01', startDate: '2026-10-01', endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'COUNT', target: 10, unit: 'pages', step: 1, reminders: [] }] };
const task: CalendarTask = { id: 'task', title: 'Read', description: null, status: 'todo', priority: 4, listId: null, parentId: null, dueDate: '2026-10-14', dueTime: '09:00', version: 1 };
const data = (patch: Partial<CalendarRange> = {}, linkedEvent = event): CalendarRange => ({ from: '2026-10-13', to: '2026-10-22', timeZone: 'UTC', preferences: defaultPreferences('UTC'), version: 1, tasks: [], lists: [], habits: [], focus: [], events: [linkedEvent], occurrences: expandSchedule(linkedEvent, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z'), ...patch });
const log = { id: 'log', habitId: habit.id, date: '2026-10-14', value: 10, status: 'RECORDED' as const, note: '', mood: null, version: 1, createdAt: '', updatedAt: '' };

describe('calendar reminders respect linked progress', () => {
  it('uses absolute time and a bounded catch-up window', () => {
    expect(dueCalendarReminders(data(), now)).toHaveLength(1);
    expect(dueCalendarReminders(data(), new Date(now.getTime() - 1))).toEqual([]);
    expect(dueCalendarReminders(data(), new Date(now.getTime() + 90000))).toHaveLength(1);
    expect(dueCalendarReminders(data(), new Date(now.getTime() + 90001))).toEqual([]);
    const occurrence = data().occurrences[0];
    for (const patch of [{ completed: true }, { cancelled: true }]) expect(dueCalendarReminders(data({ occurrences: [{ ...occurrence, ...patch }] }), now)).toEqual([]);
  });
  it('suppresses finished, cancelled and missing tasks', () => {
    const linked = { ...event, taskId: task.id };
    expect(dueCalendarReminders(data({ tasks: [task] }, linked), now)).toHaveLength(1);
    for (const tasks of [[], [{ ...task, status: 'done' }], [{ ...task, status: 'cancelled' }]]) expect(dueCalendarReminders(data({ tasks }, linked), now)).toEqual([]);
  });
  it('uses habit quantities, skip days, pauses and schedules instead of calendar completion', () => {
    const linked = { ...event, habitId: habit.id };
    expect(dueCalendarReminders(data({ habits: [{ ...habit, logs: [{ ...log, value: 4 }] }] }, linked), now)).toHaveLength(1);
    const inactive = [{ ...habit, logs: [log] }, { ...habit, logs: [{ ...log, value: 0, status: 'SKIPPED' as const }] }, { ...habit, archivedAt: now.toISOString() }, { ...habit, pauses: [{ from: '2026-10-13', to: null }] }, { ...habit, plans: [{ ...habit.plans[0], frequency: 'WEEKDAYS' as const, weekdays: [1] }] }];
    for (const item of inactive) expect(dueCalendarReminders(data({ habits: [item] }, linked), now)).toEqual([]);
    expect(dueCalendarReminders(data({}, linked), now)).toEqual([]);
  });
  it('does not nag after a flexible weekly goal has been met', () => {
    const weekly: Habit = { ...habit, plans: [{ ...habit.plans[0], frequency: 'WEEKLY', weeklyTarget: 1 }], logs: [{ ...log, date: '2026-10-12' }] };
    expect(dueCalendarReminders(data({ habits: [weekly] }, { ...event, habitId: habit.id }), now)).toEqual([]);
  });
});

describe('calendar browser delivery receipts', () => {
  it('retries a failed delivery without losing other reminders, and deduplicates successful ones', () => {
    const due = dueCalendarReminders(data(), now)[0], second = { ...due, key: `${due.key}-second` };
    const receipts = new Map<string, number>(), saved = new Map<string, string>();
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
    const notify = vi.fn().mockImplementationOnce(() => { throw Error('Browser temporarily refused'); });
    deliverCalendarReminders([due, second], 'account', now.getTime(), receipts, storage, notify);
    expect(saved.size).toBe(1);
    deliverCalendarReminders([due, second], 'account', now.getTime(), receipts, storage, notify);
    expect(notify).toHaveBeenCalledTimes(3); expect(saved.size).toBe(2);
    deliverCalendarReminders([due, second], 'account', now.getTime(), new Map(), storage, notify);
    expect(notify).toHaveBeenCalledTimes(3);
  });
  it('still delivers once when browser storage throws', () => {
    const storage = { getItem: () => { throw Error('Restricted'); }, setItem: () => { throw Error('Restricted'); } }, receipts = new Map<string, number>(), notify = vi.fn();
    for (let tick = 0; tick < 2; tick++) deliverCalendarReminders(dueCalendarReminders(data(), now), 'account', now.getTime(), receipts, storage, notify);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
