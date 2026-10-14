import { describe, expect, it } from 'vitest';
import { expandSchedule, type CalendarEvent } from '@reader/calendar-core';
import { calendarItems, defaultPreferences, displaySegmentsOn, itemsOn, movePeriod, plannedMinutes, segmentsOn, taskScheduleTarget, viewRange } from './model';
import type { CalendarRange, CalendarTask } from './api';

const preferences = defaultPreferences('America/Los_Angeles');
const task = (patch: Partial<CalendarTask> = {}): CalendarTask => ({ id: 'task', title: 'Finish report', description: null, status: 'todo', priority: 2, listId: null, parentId: null, dueDate: '2026-10-15T00:00:00.000Z', dueTime: '17:00', version: 1, ...patch });
const event = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({ id: 'event', title: 'Read', description: '', location: '', color: 'green', start: '2026-10-15T00:00', end: '2026-10-16T00:00', timeZone: 'Asia/Tokyo', allDay: true, taskId: null, habitId: null, repeat: null, reminders: [], version: 1, exceptions: [], createdAt: '', updatedAt: '', ...patch });
const range = (patch: Partial<CalendarRange> = {}): CalendarRange => ({ from: '2026-10-12', to: '2026-10-19', timeZone: preferences.timeZone, events: [], occurrences: [], tasks: [], lists: [], habits: [], focus: [], preferences, version: 0, ...patch });
function withEvent(value: CalendarEvent): CalendarRange { return range({ events: [value], occurrences: expandSchedule(value, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z') }); }
describe('calendar view dates and joined items', () => {
  it('uses complete exclusive ranges across year and leap boundaries', () => {
    expect(viewRange('2024-02-29', 'year', 1)).toEqual({ from: '2024-01-01', to: '2025-01-01' });
    expect(viewRange('2026-10-15', 'week', 0)).toEqual({ from: '2026-10-11', to: '2026-10-18' });
    expect(viewRange('2026-10-15', 'week', 1)).toEqual({ from: '2026-10-12', to: '2026-10-19' });
    expect(movePeriod('2026-01-31', 'month', 1)).toBe('2026-02-01');
  });
  it('keeps all-day dates in their original calendar day across display timezones', () => {
    const items = calendarItems(withEvent(event()), preferences);
    expect(itemsOn(items, '2026-10-15')).toHaveLength(1);
    expect(itemsOn(items, '2026-10-14')).toHaveLength(0);
    expect(itemsOn(items, '2026-10-16')).toHaveLength(0);
  });
  it('converts timed events and clips overnight blocks per displayed day', () => {
    const items = calendarItems(withEvent(event({ start: '2026-10-15T15:00', end: '2026-10-15T17:00', allDay: false })), preferences);
    expect(items[0].start).toBe('2026-10-14T23:00');
    expect(segmentsOn(items, '2026-10-14')[0]).toMatchObject({ startMinute: 1380, endMinute: 1440 });
    expect(segmentsOn(items, '2026-10-15')[0]).toMatchObject({ startMinute: 0, endMinute: 60 });
  });
  it('represents task deadlines as points without fabricating busy duration', () => {
    const items = calendarItems(range({ tasks: [task()] }), preferences);
    expect(items[0]).toMatchObject({ start: '2026-10-15T17:00', end: '2026-10-15T17:00', kind: 'task' });
    expect(itemsOn(items, '2026-10-15')).toHaveLength(1);
    expect(itemsOn(items, '2026-10-16')).toHaveLength(0);
    expect(items[0].event).toBeUndefined();
  });
  it('does not duplicate a scheduled task as a deadline, and preserves focus even without the task', () => {
    const data = withEvent(event({ taskId: 'task' })); data.tasks = [task()];
    data.focus = [{ id: 'session', taskId: 'deleted', title: 'Earlier work', listId: null, start: '2026-10-15T17:00:00Z', end: '2026-10-15T17:25:00Z', durationSeconds: 1500, notes: 'Keep history' }];
    const items = calendarItems(data, preferences);
    expect(items.filter(item => item.kind === 'task')).toHaveLength(1);
    expect(items.find(item => item.kind === 'focus')).toMatchObject({ title: 'Earlier work', durationSeconds: 1500, start: '2026-10-15T10:00' });
  });
  it('counts actual short and overlapping reservations without inflating them to visual block height', () => {
    const first = event({ id: 'first', start: '2026-10-15T09:00', end: '2026-10-15T09:05', allDay: false, timeZone: 'America/Los_Angeles' });
    const second = { ...first, id: 'second', start: '2026-10-15T09:03', end: '2026-10-15T09:10' };
    const items = [...calendarItems(withEvent(first), preferences), ...calendarItems(withEvent(second), preferences), ...calendarItems(range({ tasks: [task()] }), preferences)];
    expect(plannedMinutes(items, '2026-10-15', preferences)).toBe(10);
    expect(segmentsOn(items, '2026-10-15')[0]).toMatchObject({ startMinute: 540, endMinute: 545 });
    expect(plannedMinutes(items.map(item => ({ ...item, completed: true })), '2026-10-15', preferences)).toBe(0);
  });
  it('keeps late-night hit targets inside the day without changing timestamps or planned time', () => {
    const schedule = event({ start: '2026-10-15T23:58', end: '2026-10-16T00:03', allDay: false, timeZone: preferences.timeZone });
    const items = [...calendarItems(withEvent(schedule), preferences), ...calendarItems(range({ tasks: [task({ dueTime: '23:59' })] }), preferences)];
    expect(displaySegmentsOn(items, '2026-10-15').map(({ startMinute, endMinute }) => [startMinute, endMinute])).toEqual([[1410, 1440], [1410, 1440]]);
    expect(displaySegmentsOn(items, '2026-10-16')[0]).toMatchObject({ startMinute: 0, endMinute: 30 });
    expect(segmentsOn(items, '2026-10-15')[0]).toMatchObject({ startMinute: 1438, endMinute: 1440 });
    expect(items[1].start).toBe('2026-10-15T23:59');
    expect(plannedMinutes(items, '2026-10-15', { ...preferences, workEnd: 24 })).toBe(2);
  });
  it('opens the earliest pending block across linked series, or the latest moved completed occurrence', () => {
    const completed = event({ id: 'completed', exceptions: [{ date: '2026-10-15', start: '2026-10-20T00:00', end: '2026-10-21T00:00', allDay: true, completed: true, cancelled: false, version: 2 }] });
    const later = event({ id: 'later', start: '2026-10-22T00:00', end: '2026-10-23T00:00' });
    expect(taskScheduleTarget([completed, later, event()])?.event.id).toBe('event');
    expect(taskScheduleTarget([completed])?.occurrence).toMatchObject({ start: '2026-10-20T00:00', date: '2026-10-15', completed: true, exceptionVersion: 2 });
    expect(taskScheduleTarget([])).toBeNull();
  });
});
