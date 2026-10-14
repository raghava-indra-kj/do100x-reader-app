import { randomUUID } from 'node:crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expandSchedule, type CalendarEvent } from '@reader/calendar-core';
import { attachSession, issueSession } from '../session';
import { taskHierarchyTransaction, updateHierarchyTask } from '../task-hierarchy';
import { createHabit, getHabit, recordHabit } from '../habits/habit-service';
import { createEventInput } from './calendar-contract';
import { createCalendarRouter } from './calendar-router';
import { calendarPreferences, calendarRange, saveCalendarPreferences, unscheduledTasks } from './calendar-query';
import { createCalendarEvent, deleteCalendarEvent, editCalendarEvent, getCalendarEvent, saveCalendarOccurrence } from './calendar-service';
import { addCalendarSource, exportCalendarSource, listCalendarSources, refreshCalendarSource, removeCalendarSource, sourceOccurrences, updateCalendarSource } from './calendar-sources';

const enabled = process.env.CALENDAR_DATABASE_TEST === '1';
const now = new Date('2026-10-14T12:00:00Z');
const draft = { title: 'Deep work', description: 'Focus on one thing', location: 'Desk', color: 'blue' as const, start: '2026-10-14T09:00', end: '2026-10-14T10:00', allDay: false, timeZone: 'Asia/Kolkata', repeat: null, reminders: [10], taskId: null, habitId: null };
const repeat = { frequency: 'DAILY' as const, interval: 1, weekdays: [1, 2, 3, 4, 5], monthlyMode: 'DATE' as const, count: 3, until: null };
const items = (event: CalendarEvent) => expandSchedule(event, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
describe('calendar input contract', () => {
  it('rejects invalid dates, missing durations, incompatible links and unknown fields', () => {
    const input = { ...draft, requestKey: randomUUID() };
    expect(createEventInput.safeParse(input).success).toBe(true);
    for (const patch of [{ start: '2026-02-30T09:00' }, { end: input.start }, { allDay: true }, { timeZone: 'invalid' }, { repeat: { ...repeat, weekdays: [1, 1] } }, { taskId: randomUUID(), habitId: randomUUID() }, { reminders: [10, 10] }, { userId: randomUUID() }, { newTask: { listId: null, priority: 0 } }, { taskId: randomUUID(), newTask: { listId: null, priority: 2 } }]) expect(createEventInput.safeParse({ ...input, ...patch }).success).toBe(false);
  });
});
describe.skipIf(!enabled)('calendar upgrade and lifecycle on isolated MySQL', () => {
  const db = new PrismaClient();
  let owner: string, stranger: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Refusing a non-isolated calendar test database.');
    const user = async () => (await db.appuser.create({ data: { email: `${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } })).id;
    owner = await user(); stranger = await user();
  });
  afterAll(async () => { await db.$disconnect(); });
  const create = (patch: Record<string, unknown> = {}) => createCalendarEvent(db, owner, { ...draft, requestKey: randomUUID(), ...patch });
  const task = (userId = owner) => db.task.create({ data: { userId, title: 'Read a chapter', createdAt: now, updatedAt: now } });
  const changeTask = (id: string, changes: Record<string, unknown>) => taskHierarchyTransaction(db, tx => updateHierarchyTask(tx, owner, id, changes));
  const occurrence = (event: CalendarEvent, date: string, patch: Record<string, unknown> = {}) => saveCalendarOccurrence(db, owner, event.id, date, { eventVersion: event.version, expectedVersion: event.exceptions.find(item => item.date === date)?.version ?? 0, start: null, end: null, allDay: null, completed: false, cancelled: false, ...patch });

  it('creates a task and its schedule together, deduplicates concurrent retries and advances repeats', async () => {
    const list = await db.task_list.create({ data: { userId: owner, name: 'Calendar-created work', createdAt: now, updatedAt: now } });
    const input = { ...draft, repeat, newTask: { listId: list.id, priority: 2 }, requestKey: randomUUID() };
    const before = await db.task.count({ where: { userId: owner } });
    const [first, retry] = await Promise.all([createCalendarEvent(db, owner, input), createCalendarEvent(db, owner, input)]);
    expect(retry.id).toBe(first.id); expect(retry.taskId).toBe(first.taskId);
    expect(await db.task.count({ where: { userId: owner } })).toBe(before + 1);
    expect(await db.task.findUnique({ where: { id: first.taskId! } })).toMatchObject({ listId: list.id, priority: 2, title: draft.title, description: draft.description, dueDate: new Date('2026-10-14'), dueTime: '09:00', status: 'todo' });
    await occurrence(first, '2026-10-14', { completed: true });
    expect(await db.task.findUnique({ where: { id: first.taskId! } })).toMatchObject({ dueDate: new Date('2026-10-15'), status: 'todo' });
    await expect(createCalendarEvent(db, owner, { ...input, newTask: { ...input.newTask, priority: 1 } })).rejects.toMatchObject({ status: 409 });
  });
  it('rejects foreign task destinations without leaving a task or event behind', async () => {
    const foreign = await db.task_list.create({ data: { userId: stranger, name: 'Private list', createdAt: now, updatedAt: now } });
    const tasksBefore = await db.task.count({ where: { userId: owner } }), eventsBefore = await db.calendar_event.count({ where: { userId: owner } });
    await expect(create({ newTask: { listId: foreign.id, priority: 2 } })).rejects.toMatchObject({ status: 404 });
    expect(await db.task.count({ where: { userId: owner } })).toBe(tasksBefore);
    expect(await db.calendar_event.count({ where: { userId: owner } })).toBe(eventsBefore);
  });

  it('filters unscheduled lists before pagination, including Inbox and account ownership', async () => {
    const account = await db.appuser.create({ data: { email: `${randomUUID()}@example.test` } });
    const list = await db.task_list.create({ data: { userId: account.id, name: 'Selected list', createdAt: now, updatedAt: now } });
    const other = await db.task_list.create({ data: { userId: account.id, name: 'Other list', createdAt: now, updatedAt: now } });
    await db.task.createMany({ data: Array.from({ length: 101 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, userId: account.id, listId: other.id, title: 'Earlier task', createdAt: now, updatedAt: now })) });
    const chosen = await db.task.create({ data: { id: 'ffffffff-ffff-4fff-8fff-fffffffffff1', userId: account.id, listId: list.id, title: 'Selected task', createdAt: now, updatedAt: now } });
    const inbox = await db.task.create({ data: { id: 'ffffffff-ffff-4fff-8fff-fffffffffff2', userId: account.id, title: 'Inbox task', createdAt: now, updatedAt: now } });
    expect((await unscheduledTasks(db, account.id, {})).items).toHaveLength(100);
    expect((await unscheduledTasks(db, account.id, { listId: list.id })).items.map(item => item.id)).toEqual([chosen.id]);
    expect((await unscheduledTasks(db, account.id, { listId: 'inbox' })).items.map(item => item.id)).toEqual([inbox.id]);
    expect((await unscheduledTasks(db, owner, { listId: list.id })).items).toEqual([]);
    const first = await unscheduledTasks(db, account.id, { listId: other.id });
    expect(first.nextCursor).not.toBeNull();
    const next = await unscheduledTasks(db, account.id, { listId: other.id, cursor: first.nextCursor });
    expect(next.items).toHaveLength(1); expect(next.items[0].listId).toBe(other.id); expect(next.nextCursor).toBeNull();
  });
  it('applies range list filters before focus limits and keeps that list’s deleted-task history', async () => {
    const account = await db.appuser.create({ data: { email: `${randomUUID()}@example.test` } });
    const list = await db.task_list.create({ data: { userId: account.id, name: 'Project', createdAt: now, updatedAt: now } });
    const outside = await db.task.create({ data: { userId: account.id, title: 'Inbox', createdAt: now, updatedAt: now } });
    const retained = await db.task.create({ data: { userId: account.id, listId: list.id, title: 'Retained project work', deletedAt: now, createdAt: now, updatedAt: now } });
    await db.time_session.createMany({ data: Array.from({ length: 5001 }, () => ({ id: randomUUID(), userId: account.id, taskId: outside.id, startTime: now, endTime: new Date(now.getTime() + 60000), durationSeconds: 60, createdAt: now, updatedAt: now })) });
    const session = await db.time_session.create({ data: { userId: account.id, taskId: retained.id, startTime: now, endTime: new Date(now.getTime() + 60000), durationSeconds: 60, createdAt: now, updatedAt: now } });
    const plain = await createCalendarEvent(db, account.id, { ...draft, requestKey: randomUUID() });
    const query = { from: '2026-10-14', to: '2026-10-15', timeZone: 'UTC' };
    await expect(calendarRange(db, account.id, query)).rejects.toMatchObject({ status: 400 });
    const filtered = await calendarRange(db, account.id, { ...query, listId: list.id });
    expect(filtered.listId).toBe(list.id);
    expect(filtered.focus).toEqual([expect.objectContaining({ id: session.id, title: 'Retained project work' })]);
    expect(filtered.events.some(event => event.id === plain.id)).toBe(false);
    expect(filtered.habits).toEqual([]); expect(filtered.external).toEqual([]);
  });

  it('imports full calendars idempotently, preserves originals and scopes visibility/edits', async () => {
    const content = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:private-import\r\nSUMMARY:Private imported event\r\nDTSTART:20261015T100000Z\r\nDTEND:20261015T110000Z\r\nRRULE:FREQ=DAILY;COUNT=2\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    const input = { name: 'Personal appointments', color: 'teal', timeZone: 'Asia/Kolkata', content };
    const source = await addCalendarSource(db, owner, input);
    expect((await addCalendarSource(db, owner, input)).id).toBe(source.id);
    expect(await exportCalendarSource(db, owner, source.id)).toBe(content);
    await expect(exportCalendarSource(db, stranger, source.id)).rejects.toMatchObject({ status: 404 });
    expect(await listCalendarSources(db, stranger)).toEqual([]);
    const shown = await sourceOccurrences(db, owner, '2026-10-15', '2026-10-17', 'America/New_York');
    expect(shown.sourceErrors).toEqual([]); expect(shown.external.map(item => item.start)).toEqual(['2026-10-15T06:00', '2026-10-16T06:00']);
    const hidden = await updateCalendarSource(db, owner, source.id, { name: source.name, color: 'rose', timeZone: source.timeZone, enabled: false, expectedVersion: source.version });
    expect((await sourceOccurrences(db, owner, '2026-10-15', '2026-10-17', 'UTC')).external).toEqual([]);
    await expect(removeCalendarSource(db, owner, source.id, { expectedVersion: source.version })).rejects.toMatchObject({ status: 409 });
    await removeCalendarSource(db, owner, source.id, { expectedVersion: hidden.version });
    await expect(exportCalendarSource(db, owner, source.id)).rejects.toMatchObject({ status: 404 });
  });
  it('retains subscription snapshots on failure, respects 304 and never resurrects a removed source', async () => {
    const content = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
    const createSource = () => db.calendar_source.create({ data: { userId: owner, sourceKey: randomUUID().replace(/-/g, '').padEnd(64, 'a'), name: 'Subscription', color: 'teal', timeZone: 'UTC', url: 'https://example.com/private?token=secret', content, etag: '"v1"', lastCheckedAt: new Date(0), lastSuccessAt: now } });
    const row = await createSource();
    const failed = await refreshCalendarSource(db, owner, row.id, async () => { throw new Error('private URL must not leak'); });
    expect(failed.error).not.toContain('secret'); expect(failed).not.toHaveProperty('url');
    expect(await exportCalendarSource(db, owner, row.id)).toBe(content);
    await db.calendar_source.update({ where: { id: row.id }, data: { lastCheckedAt: new Date(0) } });
    const unchanged = await refreshCalendarSource(db, owner, row.id, async (_url, etag) => { expect(etag).toBe('"v1"'); return { etag: null, lastModified: null }; });
    expect(unchanged.error).toBeNull(); expect(await exportCalendarSource(db, owner, row.id)).toBe(content);
    await db.calendar_source.update({ where: { id: row.id }, data: { lastCheckedAt: new Date(0) } });
    await expect(refreshCalendarSource(db, owner, row.id, async () => { await removeCalendarSource(db, owner, row.id, { expectedVersion: unchanged.version }); return { content, etag: '"v2"', lastModified: null }; })).rejects.toMatchObject({ status: 404 });
    expect(await db.calendar_source.count({ where: { id: row.id } })).toBe(0);
  });
  it('rejects malformed imported data and private subscription addresses before persistence', async () => {
    const before = await db.calendar_source.count({ where: { userId: owner } });
    await expect(addCalendarSource(db, owner, { name: 'Broken', color: 'blue', timeZone: 'UTC', content: 'not a calendar' })).rejects.toMatchObject({ status: 400 });
    await expect(addCalendarSource(db, owner, { name: 'Private', color: 'blue', timeZone: 'UTC', url: 'https://127.0.0.1/private' })).rejects.toMatchObject({ status: 400 });
    expect(await db.calendar_source.count({ where: { userId: owner } })).toBe(before);
  });

  it('persists and deduplicates creation, scopes reads and rejects foreign links', async () => {
    const input = { ...draft, requestKey: randomUUID() }, event = await createCalendarEvent(db, owner, input);
    expect((await createCalendarEvent(db, owner, input)).id).toBe(event.id);
    await expect(createCalendarEvent(db, owner, { ...input, title: 'Different' })).rejects.toMatchObject({ status: 409 });
    expect((await getCalendarEvent(db, owner, event.id)).start).toBe(draft.start);
    await expect(getCalendarEvent(db, stranger, event.id)).rejects.toMatchObject({ status: 404 });
    await expect(create({ taskId: (await task(stranger)).id })).rejects.toMatchObject({ status: 404 });
  });
  it('keeps all-day dates visible across the international date line', async () => {
    const event = await create({ timeZone: 'Etc/GMT+12', allDay: true, start: '2026-10-15T00:00', end: '2026-10-16T00:00' });
    const result = await calendarRange(db, owner, { from: '2026-10-15', to: '2026-10-16', timeZone: 'Pacific/Kiritimati' });
    expect(result.occurrences.find(item => item.eventId === event.id)).toMatchObject({ date: '2026-10-15', allDay: true });
  });
  it('preserves completed instants when the series timezone changes', async () => {
    let event = await create({ repeat });
    event = await occurrence(event, '2026-10-14', { completed: true });
    const before = items(event).find(item => item.completed)!;
    event = await editCalendarEvent(db, owner, event.id, { ...draft, repeat, timeZone: 'America/New_York', expectedVersion: event.version });
    expect(items(event).find(item => item.completed)!.startInstant).toBe(before.startInstant);
  });
  it('completes the real first repeat when scheduling an already finished task', async () => {
    const row = await task(); await db.task.update({ where: { id: row.id }, data: { status: 'done' } });
    const event = await create({ taskId: row.id, repeat: { ...repeat, frequency: 'WEEKLY', weekdays: [5], count: 2 } });
    expect(items(event).map(item => [item.date, item.completed])).toEqual([['2026-10-16', true], ['2026-10-23', false]]);
    await expect(create({ repeat: { ...repeat, frequency: 'WEEKLY', weekdays: [5], until: '2026-10-14' } })).rejects.toMatchObject({ status: 400 });
  });
  it('serializes conflicting occurrence writes and rejects stale metadata', async () => {
    const event = await create({ repeat });
    const result = await Promise.allSettled([occurrence(event, '2026-10-14', { completed: true }), occurrence(event, '2026-10-14', { cancelled: true })]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter(item => item.status === 'rejected')).toHaveLength(1);
    await expect(editCalendarEvent(db, owner, event.id, { ...draft, title: 'Stale title', repeat, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
    const fresh = await getCalendarEvent(db, owner, event.id);
    const changed = await editCalendarEvent(db, owner, event.id, { ...draft, title: 'Renamed', repeat, expectedVersion: fresh.version });
    expect(changed.version).toBe(fresh.version + 1);
    await expect(editCalendarEvent(db, owner, event.id, { ...draft, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
  });
  it('moves an occurrence outside its original range and keeps its ID and duration', async () => {
    const event = await create({ repeat });
    await occurrence(event, '2026-10-14', { start: '2026-11-04T12:00', end: '2026-11-04T13:30' });
    const range = await calendarRange(db, owner, { from: '2026-11-04', to: '2026-11-05', timeZone: 'Asia/Kolkata' });
    expect(range.occurrences.find(item => item.eventId === event.id)).toMatchObject({ date: '2026-10-14', start: '2026-11-04T12:00', end: '2026-11-04T13:30' });
  });
  it('splits following instances without duplicating a completed future occurrence', async () => {
    const original = await create({ repeat });
    const event = await occurrence(original, '2026-10-16', { completed: true });
    const following = await editCalendarEvent(db, owner, event.id, { ...draft, start: '2026-10-15T11:00', end: '2026-10-15T12:00', repeat: { ...repeat, count: 2 }, expectedVersion: event.version, scope: 'following', fromDate: '2026-10-15' });
    const before = await getCalendarEvent(db, owner, event.id);
    expect(items(before).map(item => item.date)).toEqual(['2026-10-14']);
    expect(items(following).map(item => [item.date, item.completed])).toEqual([['2026-10-15', false], ['2026-10-16', true]]);
  });
  it('completes recurring tasks one instance at a time and reopens the last instance', async () => {
    const row = await task(), event = await create({ taskId: row.id, repeat });
    let current = await db.task.findUniqueOrThrow({ where: { id: row.id } });
    expect(current.dueDate?.toISOString().slice(0, 10)).toBe('2026-10-14');
    const initialVersion = current.version;
    current = await changeTask(row.id, { status: 'done', expectedVersion: initialVersion });
    expect(current.status).toBe('todo'); expect(current.dueDate?.toISOString().slice(0, 10)).toBe('2026-10-15');
    await expect(changeTask(row.id, { status: 'done', expectedVersion: initialVersion })).rejects.toMatchObject({ status: 409 });
    current = await changeTask(row.id, { status: 'done', expectedVersion: current.version });
    current = await changeTask(row.id, { status: 'done', expectedVersion: current.version });
    expect(current.status).toBe('done');
    current = await changeTask(row.id, { status: 'todo', expectedVersion: current.version });
    expect(current.status).toBe('todo'); expect(current.dueDate?.toISOString().slice(0, 10)).toBe('2026-10-16');
    expect(items(await getCalendarEvent(db, owner, event.id)).map(item => item.completed)).toEqual([true, true, false]);
  });
  it('updates task dates and names in both directions, then unschedules without deleting the task', async () => {
    const row = await task(), event = await create({ taskId: row.id });
    let current = await changeTask(row.id, { title: 'Read carefully', dueDate: new Date('2026-10-20'), dueTime: '14:30' });
    let saved = await getCalendarEvent(db, owner, event.id);
    expect(saved.title).toBe('Read carefully'); expect(items(saved)[0].start).toBe('2026-10-20T14:30');
    saved = await occurrence(saved, '2026-10-14', { start: '2026-10-21T00:00', end: '2026-10-22T00:00', allDay: true });
    current = await db.task.findUniqueOrThrow({ where: { id: row.id } });
    expect(current.dueDate?.toISOString().slice(0, 10)).toBe('2026-10-21'); expect(current.dueTime).toBeNull();
    await deleteCalendarEvent(db, owner, event.id, { expectedVersion: saved.version });
    expect(await db.task.findUnique({ where: { id: row.id } })).toMatchObject({ title: 'Read carefully', dueDate: null, dueTime: null, deletedAt: null });
    expect((await unscheduledTasks(db, owner, {})).items.some(item => item.id === row.id)).toBe(true);
  });
  it('edits a moved one-time event without leaving a duplicate override or losing completion', async () => {
    const row = await task();
    let event = await create({ taskId: row.id });
    event = await occurrence(event, '2026-10-14', { start: '2026-10-20T12:00', end: '2026-10-20T13:00', completed: true });
    event = await editCalendarEvent(db, owner, event.id, { ...draft, taskId: row.id, title: 'Read together', start: '2026-10-21T14:00', end: '2026-10-21T15:30', expectedVersion: event.version });
    expect(items(event)).toHaveLength(1);
    expect(items(event)[0]).toMatchObject({ date: '2026-10-21', start: '2026-10-21T14:00', end: '2026-10-21T15:30', completed: true });
    expect(await db.task.findUnique({ where: { id: row.id } })).toMatchObject({ title: 'Read together', status: 'done' });
    event = await occurrence(event, '2026-10-21', { completed: false });
    expect(await db.task.findUnique({ where: { id: row.id } })).toMatchObject({ dueDate: new Date('2026-10-21'), dueTime: '14:00', status: 'todo' });
  });
  it('rejects calendar edits after a linked task changes its time or completion in another tab', async () => {
    const row = await task(), event = await create({ taskId: row.id });
    await changeTask(row.id, { dueTime: '11:30' });
    await expect(editCalendarEvent(db, owner, event.id, { ...draft, taskId: row.id, expectedVersion: event.version })).rejects.toMatchObject({ status: 409 });
    const fresh = await getCalendarEvent(db, owner, event.id);
    await changeTask(row.id, { status: 'done' });
    await expect(occurrence(fresh, '2026-10-14', { start: '2026-10-20T12:00', end: '2026-10-20T13:00' })).rejects.toMatchObject({ status: 409 });
  });
  it('keeps completed task date edits and combined reopen/reschedule synchronized', async () => {
    const row = await task(), event = await create({ taskId: row.id });
    await changeTask(row.id, { status: 'done' });
    let current = await changeTask(row.id, { dueDate: new Date('2026-10-18'), dueTime: '13:00' });
    expect(current).toMatchObject({ status: 'done', dueDate: new Date('2026-10-18'), dueTime: '13:00' });
    expect(items(await getCalendarEvent(db, owner, event.id))).toEqual([expect.objectContaining({ start: '2026-10-18T13:00', end: '2026-10-18T14:00', completed: true })]);
    current = await changeTask(row.id, { status: 'todo', dueDate: new Date('2026-10-20'), dueTime: '11:45', expectedVersion: current.version });
    expect(current).toMatchObject({ status: 'todo', dueDate: new Date('2026-10-20'), dueTime: '11:45' });
    expect(items(await getCalendarEvent(db, owner, event.id))).toEqual([expect.objectContaining({ start: '2026-10-20T11:45', end: '2026-10-20T12:45', completed: false })]);
  });
  it('converts a moved one-time event into a series without keeping the old override', async () => {
    for (const completed of [false, true]) {
      let event = await create();
      event = await occurrence(event, '2026-10-14', { start: '2026-10-20T12:00', end: '2026-10-20T13:00', completed });
      event = await editCalendarEvent(db, owner, event.id, { ...draft, repeat: { ...repeat, frequency: 'WEEKLY', weekdays: [5], count: 2 }, expectedVersion: event.version });
      expect(items(event).map(item => [item.date, item.start, item.completed])).toEqual([['2026-10-16', '2026-10-16T09:00', completed], ['2026-10-23', '2026-10-23T09:00', false]]);
    }
  });
  it('drops obsolete pending overrides when a repeat rule changes while retaining completed history', async () => {
    let event = await create({ repeat });
    event = await occurrence(event, '2026-10-14', { completed: true });
    const completedTime = items(event)[0].startInstant;
    event = await occurrence(event, '2026-10-15', { start: '2026-10-20T12:00', end: '2026-10-20T13:00' });
    event = await editCalendarEvent(db, owner, event.id, { ...draft, start: '2026-10-16T14:00', end: '2026-10-16T15:00', repeat: { ...repeat, frequency: 'WEEKLY', weekdays: [5], count: 2 }, expectedVersion: event.version });
    expect(items(event).map(item => [item.date, item.start])).toEqual([['2026-10-14', '2026-10-14T09:00'], ['2026-10-16', '2026-10-16T14:00'], ['2026-10-23', '2026-10-23T14:00']]);
    event = await occurrence(event, '2026-10-16', { start: '2026-10-19T12:00', end: '2026-10-19T13:00' });
    event = await editCalendarEvent(db, owner, event.id, { ...draft, start: '2026-10-16T16:00', end: '2026-10-16T17:00', expectedVersion: event.version });
    expect(items(event).map(item => item.start)).toEqual(['2026-10-14T09:00', '2026-10-16T16:00']);
    expect(items(event)[0].startInstant).toBe(completedTime);
  });
  it('applies new start times to a moved split occurrence and rejects collisions atomically', async () => {
    let event = await create({ repeat });
    event = await occurrence(event, '2026-10-15', { start: '2026-10-20T12:00', end: '2026-10-20T13:00' });
    const following = await editCalendarEvent(db, owner, event.id, { ...draft, start: '2026-10-15T14:00', end: '2026-10-15T15:00', repeat: { ...repeat, count: 2 }, expectedVersion: event.version, scope: 'following', fromDate: '2026-10-15' });
    expect(items(following).map(item => item.start)).toEqual(['2026-10-15T14:00', '2026-10-16T14:00']);
    expect(items(await getCalendarEvent(db, owner, event.id)).map(item => item.date)).toEqual(['2026-10-14']);
    let conflict = await create({ repeat });
    conflict = await occurrence(conflict, '2026-10-15', { start: '2026-10-20T12:00', end: '2026-10-20T13:00' });
    conflict = await occurrence(conflict, '2026-10-16', { completed: true });
    const count = await db.calendar_event.count({ where: { userId: owner } });
    await expect(editCalendarEvent(db, owner, conflict.id, { ...draft, start: '2026-10-16T14:00', end: '2026-10-16T15:00', repeat, expectedVersion: conflict.version, scope: 'following', fromDate: '2026-10-15' })).rejects.toMatchObject({ status: 409 });
    expect(await db.calendar_event.count({ where: { userId: owner } })).toBe(count);
    expect(await getCalendarEvent(db, owner, conflict.id)).toEqual(conflict);
  });
  it('keeps failed task changes atomic and does not complete another account’s task', async () => {
    const row = await task(), event = await create({ taskId: row.id, timeZone: 'America/New_York', start: '2026-03-07T02:30', end: '2026-03-07T03:30' });
    const before = await db.task.findUniqueOrThrow({ where: { id: row.id } });
    await expect(changeTask(row.id, { title: 'Must roll back', dueDate: new Date('2026-03-08'), dueTime: '02:30' })).rejects.toMatchObject({ status: 400 });
    expect(await db.task.findUnique({ where: { id: row.id } })).toEqual(before);
    expect((await getCalendarEvent(db, owner, event.id)).title).toBe(draft.title);
    await expect(saveCalendarOccurrence(db, stranger, event.id, '2026-03-07', { expectedVersion: 0, eventVersion: 1, start: null, end: null, allDay: null, completed: true, cancelled: false })).rejects.toMatchObject({ status: 404 });
  });
  it('keeps habit check-ins independent from time reservations', async () => {
    const habit = await createHabit(db, owner, { requestKey: randomUUID(), name: 'Read', description: '', icon: 'book', color: 'orange', section: 'Learning', timezone: 'Asia/Kolkata', plan: { startDate: '2026-10-01', endDate: null, frequency: 'DAILY', weekdays: [1, 2, 3, 4, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'COUNT', target: 2, unit: 'pages', step: 1, reminders: [] } }, now);
    await recordHabit(db, owner, habit.id, '2026-10-14', { expectedVersion: 0, habitVersion: 1, value: 2, status: 'RECORDED', note: 'Keep this reflection', mood: 5 }, now);
    const event = await create({ habitId: habit.id });
    await expect(occurrence(event, '2026-10-14', { completed: true })).rejects.toMatchObject({ status: 400 });
    await occurrence(event, '2026-10-14', { start: '2026-10-14T15:00', end: '2026-10-14T15:30' });
    expect((await getHabit(db, owner, habit.id)).logs[0]).toMatchObject({ value: 2, note: 'Keep this reflection', mood: 5, version: 1 });
  });
  it('persists account-specific preferences with conflict detection', async () => {
    const before = await calendarPreferences(db, owner, 'Asia/Kolkata');
    expect(before.version).toBe(0);
    await saveCalendarPreferences(db, owner, { expectedVersion: 0, preferences: { ...before.preferences, defaultView: 'month' } });
    expect((await calendarPreferences(db, owner)).preferences.defaultView).toBe('month');
    expect((await calendarPreferences(db, stranger)).preferences.defaultView).toBe('week');
    await expect(saveCalendarPreferences(db, owner, { expectedVersion: 0, preferences: before.preferences })).rejects.toMatchObject({ status: 409 });
  });
  it('includes earlier local-week progress in a narrow calendar range', async () => {
    const habit = await createHabit(db, owner, { requestKey: randomUUID(), name: 'Weekly reading', description: '', icon: 'book', color: 'green', section: 'Learning', timezone: 'Asia/Kolkata', plan: { startDate: '2026-10-01', endDate: null, frequency: 'WEEKLY', weekdays: [], intervalDays: 1, weeklyTarget: 1, goalType: 'CHECK', target: 1, unit: '', step: 1, reminders: [] } }, now);
    await recordHabit(db, owner, habit.id, '2026-10-12', { expectedVersion: 0, habitVersion: 1, value: 1, status: 'RECORDED', note: 'Weekly goal reached', mood: null }, now);
    const range = await calendarRange(db, owner, { from: '2026-10-14', to: '2026-10-15', timeZone: 'America/Los_Angeles' });
    expect(range.habits.find(item => item.id === habit.id)?.logs).toEqual([expect.objectContaining({ date: '2026-10-12', value: 1, note: 'Weekly goal reached' })]);
  });
  it('requires signed sessions and trusted origins and validates HTTP inputs', async () => {
    const app = express(); app.use(express.json()); app.use(attachSession(db));
    app.get('/login/:id', (req, res) => { issueSession(res, req.params.id as string); res.end(); });
    app.use('/calendar', createCalendarRouter(db)); const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      expect((await fetch(`${base}/calendar`)).status).toBe(401);
      const cookie = (await fetch(`${base}/login/${owner}`)).headers.get('set-cookie')!.split(';')[0];
      const send = (origin: string, body: unknown) => fetch(`${base}/calendar/events`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      expect((await send('https://untrusted.example', { ...draft, requestKey: randomUUID() })).status).toBe(403);
      const origin = process.env.APP_ORIGINS!;
      expect((await send(origin, { ...draft, requestKey: randomUUID(), userId: stranger })).status).toBe(400);
      expect((await send(origin, { ...draft, requestKey: randomUUID() })).status).toBe(201);
      const range = await fetch(`${base}/calendar?from=2026-10-01&to=2026-11-01&timeZone=Asia%2FKolkata`, { headers: { Cookie: cookie } });
      expect(range.status).toBe(200); expect((await range.json() as { occurrences: unknown[] }).occurrences.length).toBeGreaterThan(0);
      expect(range.headers.get('cache-control')).toBe('private, no-store');
      const content = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:http-private\r\nSUMMARY:Private HTTP event\r\nDTSTART:20261015T100000Z\r\nDTEND:20261015T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
      const sourceInput = { name: 'HTTP import', color: 'teal', timeZone: 'UTC', content };
      const headers = { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' };
      expect((await fetch(`${base}/calendar/sources`, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.example' }, body: JSON.stringify(sourceInput) })).status).toBe(403);
      const imported = await fetch(`${base}/calendar/sources`, { method: 'POST', headers, body: JSON.stringify(sourceInput) });
      expect(imported.status).toBe(201);
      const source = await imported.json() as { id: string; version: number };
      expect(source).not.toHaveProperty('content'); expect(source).not.toHaveProperty('url');
      const otherCookie = (await fetch(`${base}/login/${stranger}`)).headers.get('set-cookie')!.split(';')[0];
      for (const [method, suffix, body] of [['GET', '/export', undefined], ['POST', '/refresh', undefined], ['PUT', '', { ...sourceInput, content: undefined, enabled: true, expectedVersion: source.version }], ['DELETE', '', { expectedVersion: source.version }]] as const) {
        const forbidden = await fetch(`${base}/calendar/sources/${source.id}${suffix}`, { method, headers: { ...headers, Cookie: otherCookie }, ...(body ? { body: JSON.stringify(body) } : {}) });
        expect(forbidden.status).toBe(404);
      }
      const exported = await fetch(`${base}/calendar/sources/${source.id}/export`, { headers: { Cookie: cookie } });
      expect(exported.status).toBe(200); expect(exported.headers.get('content-type')).toContain('text/calendar'); expect(await exported.text()).toBe(content);
      const ownExport = await fetch(`${base}/calendar/export?from=2026-10-01&to=2026-11-01&timeZone=UTC`, { headers: { Cookie: cookie } });
      expect(ownExport.status).toBe(200); expect(await ownExport.text()).not.toContain('Private HTTP event');
      expect((await fetch(`${base}/calendar/sources/${source.id}`, { method: 'DELETE', headers, body: JSON.stringify({ expectedVersion: source.version + 1 }) })).status).toBe(409);
      expect((await fetch(`${base}/calendar/sources/${source.id}`, { method: 'DELETE', headers, body: JSON.stringify({ expectedVersion: source.version }) })).status).toBe(204);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});
