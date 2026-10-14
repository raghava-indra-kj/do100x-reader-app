import { describe, expect, it } from 'vitest';
import { addDays, dateRange, dayStatus, habitStats, isDate, localDate, localTime, monday, planOn, quantityTotals, scheduled, weekProgress, type Habit, type HabitLog, type HabitPlan } from './index';

const plan: HabitPlan = { id: 'p', effectiveFrom: '2026-10-01', startDate: '2026-10-01', endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'COUNT', target: 8, unit: 'glasses', step: 1, reminders: [] };
const habit = (overrides: Partial<Habit> = {}): Habit => ({ id: 'h', name: 'Water', description: '', icon: 'water', color: 'blue', section: 'Health', timezone: 'Asia/Kolkata', sortOrder: 0, version: 1, archivedAt: null, pauses: [], plans: [plan], logs: [], createdAt: '', updatedAt: '', ...overrides });
const log = (date: string, value = 8, status: HabitLog['status'] = 'RECORDED'): HabitLog => ({ id: date, habitId: 'h', date, value, status, note: '', mood: null, version: 1, createdAt: '', updatedAt: '' });

describe('calendar arithmetic', () => {
  it('validates real leap dates without silently rolling invalid days', () => {
    expect(isDate('2024-02-29')).toBe(true);
    for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', 'today']) expect(isDate(date)).toBe(false);
  });
  it('crosses months, years and leap days in UTC calendar space', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(monday('2027-01-01')).toBe('2026-12-28');
    expect(dateRange('2026-10-31', '2026-11-02')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });
  it('uses the habit timezone at midnight and across DST transitions', () => {
    expect(localDate('Asia/Kolkata', new Date('2026-10-14T19:00:00Z'))).toBe('2026-10-15');
    expect(localDate('America/Los_Angeles', new Date('2026-10-14T01:00:00Z'))).toBe('2026-10-13');
    expect(localTime('America/New_York', new Date('2026-03-08T07:05:00Z'))).toBe('03:05');
  });
});
describe('habit schedules and check-in states', () => {
  it('supports selected weekdays and intervals anchored to the original start', () => {
    const weekdays = habit({ plans: [{ ...plan, frequency: 'WEEKDAYS', weekdays: [1, 3, 5] }] });
    expect(scheduled(weekdays, '2026-10-14')).toBe(true);
    expect(scheduled(weekdays, '2026-10-15')).toBe(false);
    const interval = habit({ plans: [{ ...plan, frequency: 'INTERVAL', intervalDays: 3 }] });
    expect(scheduled(interval, '2026-10-04')).toBe(true);
    expect(scheduled(interval, '2026-10-05')).toBe(false);
  });
  it('respects inclusive start/end and exclusive pause end', () => {
    const h = habit({ plans: [{ ...plan, endDate: '2026-10-05' }], pauses: [{ from: '2026-10-02', to: '2026-10-04' }] });
    expect(scheduled(h, '2026-09-30')).toBe(false);
    expect(scheduled(h, '2026-10-01')).toBe(true);
    expect(scheduled(h, '2026-10-03')).toBe(false);
    expect(scheduled(h, '2026-10-04')).toBe(true);
    expect(scheduled(h, '2026-10-05')).toBe(true);
    expect(scheduled(h, '2026-10-06')).toBe(false);
  });
  it('keeps old target values when a future plan changes', () => {
    const h = habit({ plans: [plan, { ...plan, id: 'new', target: 10, effectiveFrom: '2026-10-15' }], logs: [log('2026-10-14')] });
    expect(planOn(h, '2026-10-14')?.target).toBe(8);
    expect(planOn(h, '2026-10-15')?.target).toBe(10);
    expect(dayStatus(h, '2026-10-14', '2026-10-15')).toBe('done');
  });
  it('distinguishes partial, excused, missed, pending and future days', () => {
    const h = habit({ logs: [log('2026-10-10', 2), log('2026-10-11', 0, 'SKIPPED'), log('2026-10-12', 0, 'NONE')] });
    expect(dayStatus(h, '2026-10-10', '2026-10-14')).toBe('partial');
    expect(dayStatus(h, '2026-10-11', '2026-10-14')).toBe('skipped');
    expect(dayStatus(h, '2026-10-12', '2026-10-14')).toBe('missed');
    expect(dayStatus(h, '2026-10-14', '2026-10-14')).toBe('pending');
    expect(dayStatus(h, '2026-10-15', '2026-10-14')).toBe('future');
  });
});
describe('statistics', () => {
  it('does not combine different units across goal changes', () => {
    const h = habit({ plans: [plan, { ...plan, id: 'minutes', effectiveFrom: '2026-10-03', unit: 'minutes' }], logs: [log('2026-10-01', 8), log('2026-10-03', 20), log('2026-10-04', 10)] });
    expect(quantityTotals(h, '2026-10-03')).toEqual([{ unit: 'glasses', value: 8 }, { unit: 'minutes', value: 20 }]);
  });
  it('does not break a current streak before today is over', () => {
    const h = habit({ logs: ['2026-10-11', '2026-10-12', '2026-10-13'].map(date => log(date)) });
    expect(habitStats(h, '2026-10-14')).toMatchObject({ currentStreak: 3, bestStreak: 3, completed: 3, expected: 13 });
    expect(habitStats(h, '2026-10-15').currentStreak).toBe(0);
  });
  it('excused days preserve a streak without inflating it or the denominator', () => {
    const h = habit({ logs: [log('2026-10-01'), log('2026-10-02', 0, 'SKIPPED'), log('2026-10-03')] });
    expect(habitStats(h, '2026-10-04')).toMatchObject({ currentStreak: 2, completionRate: 100, expected: 2 });
  });
  it('counts weekly goals once per week, caps partial first weeks and preserves the open week', () => {
    const h = habit({ plans: [{ ...plan, frequency: 'WEEKLY', weeklyTarget: 3 }], logs: [log('2026-10-01'), log('2026-10-02'), log('2026-10-03'), log('2026-10-05')] });
    expect(weekProgress(h, '2026-10-03', '2026-10-06')).toMatchObject({ done: 3, target: 3 });
    expect(habitStats(h, '2026-10-06')).toMatchObject({ currentStreak: 1, streakUnit: 'weeks', completionRate: 100 });
    expect(habitStats(h, '2026-10-12')).toMatchObject({ currentStreak: 0, bestStreak: 1, expected: 6, completionRate: 67 });
    expect(dayStatus(h, '2026-10-04', '2026-10-06')).toBe('available');
  });
  it('excludes future logs from totals and supports quantities with decimals', () => {
    const h = habit({ logs: [log('2026-10-01', 0.1), log('2026-10-02', 0.2), log('2026-10-10', 100)] });
    expect(habitStats(h, '2026-10-03').total).toBe(0.3);
  });
  it('does not penalize archived periods or unfinished future habits', () => {
    const h = habit({ logs: [log('2026-10-01'), log('2026-10-02')], pauses: [{ from: '2026-10-03', to: null }] });
    expect(habitStats(h, '2026-10-14')).toMatchObject({ currentStreak: 2, completionRate: 100 });
    expect(habitStats(h, '2026-09-30')).toMatchObject({ expected: 0, currentStreak: 0 });
  });
});
