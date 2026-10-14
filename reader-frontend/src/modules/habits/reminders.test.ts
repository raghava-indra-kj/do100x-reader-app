import { describe, expect, it } from 'vitest';
import type { Habit } from '@reader/habit-core';
import { dueReminders } from './reminders';

const habit: Habit = { id: 'habit', name: 'Read', description: '', icon: 'book', color: 'orange', section: 'Learning', timezone: 'Asia/Kolkata', sortOrder: 0, version: 1, archivedAt: null, pauses: [], createdAt: '', updatedAt: '', logs: [], plans: [{ id: 'plan', effectiveFrom: '2026-10-01', startDate: '2026-10-01', endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'CHECK', target: 1, unit: '', step: 1, reminders: ['09:00', '18:00'] }] };
describe('habit browser reminder eligibility', () => {
  it('uses local time and permits a one-minute polling delay without replaying old reminders', () => {
    expect(dueReminders([habit], new Date('2026-10-14T03:30:00Z'))[0]).toMatchObject({ date: '2026-10-14', time: '09:00', key: 'habit/2026-10-14/09:00' });
    expect(dueReminders([habit], new Date('2026-10-14T03:31:59Z'))).toHaveLength(1);
    expect(dueReminders([habit], new Date('2026-10-14T03:32:00Z'))).toHaveLength(0);
  });
  it('suppresses completed, skipped, archived, paused and unscheduled habits', () => {
    const now = new Date('2026-10-14T03:30:00Z');
    const log = { id: 'log', habitId: habit.id, date: '2026-10-14', value: 1, status: 'RECORDED' as const, note: '', mood: null, version: 1, createdAt: '', updatedAt: '' };
    for (const item of [{ ...habit, logs: [log] }, { ...habit, logs: [{ ...log, status: 'SKIPPED' as const, value: 0 }] }, { ...habit, archivedAt: now.toISOString() }, { ...habit, pauses: [{ from: '2026-10-13', to: null }] }, { ...habit, plans: [{ ...habit.plans[0], frequency: 'WEEKDAYS' as const, weekdays: [1] }] }]) expect(dueReminders([item], now)).toEqual([]);
  });
  it('stops reminding once a flexible weekly target is achieved', () => {
    const weekly: Habit = { ...habit, plans: [{ ...habit.plans[0], frequency: 'WEEKLY', weeklyTarget: 1 }], logs: [{ id: 'log', habitId: habit.id, date: '2026-10-12', value: 1, status: 'RECORDED', note: '', mood: null, version: 1, createdAt: '', updatedAt: '' }] };
    expect(dueReminders([weekly], new Date('2026-10-14T03:30:00Z'))).toEqual([]);
  });
});
