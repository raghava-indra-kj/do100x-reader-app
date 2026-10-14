import { describe, expect, it } from 'vitest';
import { arrangeOverlaps, busyMinutes, expandSchedule, instantAt, nextPendingOccurrence, remainingOccurrenceCount, scheduledOccurrenceAt, scheduleError, wallAt, type CalendarEvent, type RepeatRule } from './index';
const repeat: RepeatRule = { frequency: 'DAILY', interval: 1, weekdays: [1, 2, 3, 4, 5], monthlyMode: 'DATE', count: null, until: null };
const event: CalendarEvent = { id: 'event', title: 'Read', description: '', location: '', color: 'orange', taskId: null, habitId: null, reminders: [], version: 1, exceptions: [], createdAt: '', updatedAt: '', start: '2026-03-07T09:00', end: '2026-03-07T10:00', allDay: false, timeZone: 'America/New_York', repeat };
const expand = (patch: Partial<CalendarEvent>, from = '2026-03-01T00:00:00Z', to = '2026-04-01T00:00:00Z') => expandSchedule({ ...event, ...patch }, from, to);
describe('calendar wall-clock scheduling', () => {
  it('distinguishes retained history from dates still in the current recurrence', () => {
    const shortened = { ...event, repeat: { ...repeat, count: 2 }, exceptions: [{ date: '2026-03-10', start: '2026-03-10T09:00', end: '2026-03-10T10:00', completed: true, cancelled: false, version: 1 }] };
    expect(expandSchedule(shortened, '2026-03-10T00:00:00Z', '2026-03-11T00:00:00Z')).toHaveLength(1);
    expect(scheduledOccurrenceAt(shortened, '2026-03-10')).toBeNull();
    expect(scheduledOccurrenceAt(shortened, '2026-03-08')?.date).toBe('2026-03-08');
    expect(scheduledOccurrenceAt({ ...event, repeat: { ...repeat, until: '2026-03-08' } }, '2026-03-09')).toBeNull();
    expect(scheduledOccurrenceAt({ ...event, repeat: null }, '2026-03-08')).toBeNull();
  });
  it('checks rule membership through missing month dates and DST without counting skipped times', () => {
    const gap = { ...event, start: '2026-03-07T02:30', end: '2026-03-07T03:30', repeat: { ...repeat, count: 2 } };
    expect(scheduledOccurrenceAt(gap, '2026-03-08')).toBeNull();
    expect(scheduledOccurrenceAt(gap, '2026-03-09')?.date).toBe('2026-03-09');
    expect(scheduledOccurrenceAt(gap, '2026-03-10')).toBeNull();
    const monthly = { ...event, start: '2026-01-31T09:00', end: '2026-01-31T10:00', repeat: { ...repeat, frequency: 'MONTHLY' as const, count: 2 } };
    expect(scheduledOccurrenceAt(monthly, '2026-02-28')).toBeNull();
    expect(scheduledOccurrenceAt(monthly, '2026-03-31')?.date).toBe('2026-03-31');
    expect(scheduledOccurrenceAt(monthly, '2026-05-31')).toBeNull();
  });
  it('retains only the remaining count when splitting, including skipped dates and DST gaps', () => {
    expect(remainingOccurrenceCount({ ...event, repeat: { ...repeat, count: 3 } }, '2026-03-08')).toBe(2);
    expect(remainingOccurrenceCount({ ...event, repeat: { ...repeat, count: 3 } }, '2026-03-07')).toBe(3);
    expect(remainingOccurrenceCount({ ...event, repeat: { ...repeat, count: 3 } }, '2026-03-10')).toBe(0);
    expect(remainingOccurrenceCount({ ...event, start: '2026-03-07T02:30', end: '2026-03-07T03:30', repeat: { ...repeat, count: 3 } }, '2026-03-09')).toBe(2);
    expect(remainingOccurrenceCount({ ...event, start: '2026-01-31T09:00', end: '2026-01-31T10:00', repeat: { ...repeat, frequency: 'MONTHLY', count: 3 } }, '2026-03-31')).toBe(2);
    expect(remainingOccurrenceCount(event, '2026-03-10')).toBeNull();
  });
  it('finds the next unfinished occurrence without a ten-year horizon', () => {
    const distant = { ...event, start: '2050-01-01T09:00', end: '2050-01-01T10:00', repeat: { ...repeat, frequency: 'YEARLY' as const, interval: 20 } };
    expect(nextPendingOccurrence(distant)?.date).toBe('2050-01-01');
    expect(nextPendingOccurrence({ ...distant, exceptions: [{ date: '2050-01-01', start: null, end: null, completed: true, cancelled: false, version: 1 }] })?.date).toBe('2070-01-01');
  });
  it('chooses overdue or moved pending work and stops at a recurrence count', () => {
    const moved = { date: '2026-03-07', start: '2026-03-20T09:00', end: '2026-03-20T10:00', completed: false, cancelled: false, version: 1 };
    expect(nextPendingOccurrence({ ...event, exceptions: [moved] })?.date).toBe('2026-03-08');
    expect(nextPendingOccurrence({ ...event, repeat: { ...repeat, count: 1 }, exceptions: [moved] })?.date).toBe('2026-03-07');
    expect(nextPendingOccurrence({ ...event, repeat: { ...repeat, count: 1 }, exceptions: [{ ...moved, completed: true }] })).toBeNull();
  });
  it('expands old finite series without a daily scan limit or losing COUNT', () => {
    expect(expand({ start: '1900-01-31T09:00', end: '1900-01-31T10:00', repeat: { ...repeat, frequency: 'YEARLY', count: 200 } }, '2050-01-01T00:00:00Z', '2051-01-01T00:00:00Z').map(row => row.date)).toEqual(['2050-01-31']);
    expect(expand({ start: '1900-01-31T09:00', end: '1900-01-31T10:00', repeat: { ...repeat, frequency: 'YEARLY', count: 100 } }, '2050-01-01T00:00:00Z', '2051-01-01T00:00:00Z')).toEqual([]);
  });
  it('resolves half-hour zones, spring gaps and fall folds deterministically', () => {
    expect(instantAt('2026-10-14T09:00', 'Asia/Kolkata')?.toISOString()).toBe('2026-10-14T03:30:00.000Z');
    expect(instantAt('2026-03-08T02:30', 'America/New_York')).toBeNull();
    expect(instantAt('2026-11-01T01:30', 'America/New_York')?.toISOString()).toBe('2026-11-01T05:30:00.000Z');
    expect(instantAt('2026-02-30T09:00', 'UTC')).toBeNull();
    expect(instantAt('2026-10-14T09:00', 'invalid')).toBeNull();
  });
  it('keeps recurring local time stable through daylight saving', () => {
    const rows = expand({ repeat: { ...repeat, count: 3 } });
    expect(rows.map(row => row.startInstant)).toEqual(['2026-03-07T14:00:00.000Z', '2026-03-08T13:00:00.000Z', '2026-03-09T13:00:00.000Z']);
    expect(rows.every(row => wallAt(row.startInstant, event.timeZone).endsWith('09:00'))).toBe(true);
  });
  it('does not count nonexistent repeated times toward the occurrence limit', () => {
    expect(expand({ start: '2026-03-07T02:30', end: '2026-03-07T03:30', repeat: { ...repeat, count: 2 } }).map(row => row.date)).toEqual(['2026-03-07', '2026-03-09']);
  });
  it('uses whole local dates for all-day events including 23-hour days', () => {
    const rows = expand({ start: '2026-03-08T00:00', end: '2026-03-09T00:00', allDay: true, repeat: null });
    expect((Date.parse(rows[0].endInstant) - Date.parse(rows[0].startInstant)) / 3600000).toBe(23);
  });
  it('handles selected weekdays and alternate weeks with a Monday boundary', () => {
    const rows = expand({ start: '2026-03-02T09:00', end: '2026-03-02T10:00', repeat: { ...repeat, frequency: 'WEEKLY', interval: 2, weekdays: [1, 5], until: '2026-03-20' } });
    expect(rows.map(row => row.date)).toEqual(['2026-03-02', '2026-03-06', '2026-03-16', '2026-03-20']);
  });
  it('skips impossible month dates and respects leap years', () => {
    const rows = expand({ start: '2026-01-31T09:00', end: '2026-01-31T10:00', repeat: { ...repeat, frequency: 'MONTHLY', count: 3 } }, '2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z');
    expect(rows.map(row => row.date)).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
    expect(expand({ start: '2024-02-29T09:00', end: '2024-02-29T10:00', repeat: { ...repeat, frequency: 'YEARLY', count: 2 } }, '2024-01-01T00:00:00Z', '2029-01-01T00:00:00Z').map(row => row.date)).toEqual(['2024-02-29', '2028-02-29']);
  });
  it('supports the last weekday of a month', () => {
    expect(expand({ start: '2026-01-30T09:00', end: '2026-01-30T10:00', repeat: { ...repeat, frequency: 'MONTHLY', monthlyMode: 'WEEKDAY', count: 3 } }, '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z').map(row => row.date)).toEqual(['2026-01-30', '2026-02-27', '2026-03-27']);
  });
  it('moves an occurrence across query boundaries without changing its identity', () => {
    const rows = expand({ repeat: { ...repeat, count: 1 }, exceptions: [{ date: '2026-03-07', start: '2026-04-02T12:00', end: '2026-04-02T14:00', completed: true, cancelled: false, version: 3 }] }, '2026-04-01T00:00:00Z', '2026-04-03T00:00:00Z');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'event/2026-03-07', completed: true, exceptionVersion: 3, start: '2026-04-02T12:00' });
    expect(expand({ repeat: null, exceptions: [{ date: '2026-03-07', start: null, end: null, completed: false, cancelled: true, version: 1 }] })).toEqual([]);
  });
  it('finds long events overlapping a query and excludes an adjacent boundary', () => {
    const patch = { start: '2026-02-28T09:00', end: '2026-03-02T10:00', repeat: null };
    expect(expand(patch)).toHaveLength(1);
    expect(expand(patch, '2026-03-02T15:00:00Z', '2026-03-03T00:00:00Z')).toEqual([]);
  });
  it('validates schedule errors before persistence', () => {
    expect(scheduleError({ ...event, end: event.start })).toMatch(/after start/);
    expect(scheduleError({ ...event, start: '2026-03-08T02:30', end: '2026-03-08T04:00' })).toMatch(/clocks change/);
    expect(scheduleError({ ...event, repeat: { ...repeat, interval: 0 } })).toMatch(/interval/);
    expect(scheduleError({ ...event, allDay: true })).toMatch(/whole calendar/);
  });
  it('lays out connected overlaps, reuses adjacent columns and avoids double-counting busy time', () => {
    const a = { startMinute: 60, endMinute: 120 }, b = { startMinute: 90, endMinute: 180 }, c = { startMinute: 120, endMinute: 150 }, d = { startMinute: 200, endMinute: 240 };
    expect(arrangeOverlaps([d, c, a, b]).map(item => [item.column, item.columns])).toEqual([[0, 2], [1, 2], [0, 2], [0, 1]]);
    expect(busyMinutes([a, b, c, d])).toBe(160);
    expect(busyMinutes([a, b, c, d], 100, 210)).toBe(90);
  });
});
