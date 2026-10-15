import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import express from 'express';
import { addDays, localDate } from '@reader/habit-core';
import { createReaderMcpServer } from '../server';
import { prisma as db } from '../../prisma';
import { attachSession, issueSession } from '../../session';
import { createHabitsRouter } from '../../habits/habit-router';
import { createCalendarRouter } from '../../calendar/calendar-router';
import { createCapturesRouter } from '../../reader/captures';
import { purgeExpiredCaptures } from '../../reader/capture-cleanup';

// Only network I/O is replaced. Source validation, bounded ICS worker, storage,
// account isolation and MCP serialization all run through production code.
const { download } = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('../../calendar/feed-fetch', async importOriginal => ({ ...await importOriginal<typeof import('../../calendar/feed-fetch')>(), fetchCalendarFeed: download }));

const today = localDate('UTC'), yesterday = addDays(today, -1), tomorrow = addDays(today, 1);
const range = { from: yesterday, to: addDays(today, 7), timeZone: 'UTC' };
const plan = { startDate: yesterday, endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'COUNT', target: 10, unit: 'pages', step: 1, reminders: ['09:00'] };
const habitDraft = { name: 'Read', description: 'Read daily', icon: 'book', color: 'blue', section: 'Learning', timezone: 'UTC', plan };
const eventDraft = { title: 'Reading time', description: 'Focus', location: 'Desk', color: 'blue', timeZone: 'UTC', start: `${today}T09:00`, end: `${today}T10:00`, allDay: false, repeat: null, reminders: [10], taskId: null, habitId: null };
const repeat = { frequency: 'DAILY', interval: 1, weekdays: [], monthlyMode: 'DATE', count: 3, until: null };
const captureDraft = () => ({ captureKey: randomUUID(), title: 'Captured article', content: '# Article\n\nOriginal paragraph.', sourceUrl: 'https://example.com/article?token=secret#fragment' });
const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:mcp-fixture\r\nSUMMARY:Imported reading\r\nDTSTART:${today.replaceAll('-', '')}T120000Z\r\nDTEND:${today.replaceAll('-', '')}T130000Z\r\nRRULE:FREQ=DAILY;COUNT=2\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

describe.skipIf(process.env.MCP_FEATURE_DATABASE_TEST !== '1')('all new MCP features on disposable local MySQL', () => {
  let owner: string, stranger: string, client: Client, foreign: Client;
  const connections: { client: Client; server: ReturnType<typeof createReaderMcpServer> }[] = [];
  const exercised = new Set<string>();
  let toolNames: string[];
  beforeAll(() => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('MCP integration tests require the disposable local Calendar database.');
  });
  beforeEach(async () => {
    const user = async () => (await db.appuser.create({ data: { email: `${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } })).id;
    owner = await user(); stranger = await user();
    const connect = async (userId: string) => {
      const server = createReaderMcpServer(userId), client = new Client({ name: 'feature-integration', version: '1' });
      const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b);
      connections.push({ server, client }); return client;
    };
    client = await connect(owner); foreign = await connect(stranger);
    toolNames = (await client.listTools()).tools.filter(tool => tool.annotations?.openWorldHint !== undefined && /habit|calendar|capture|unscheduled|task_schedules/.test(tool.name)).map(tool => tool.name);
    download.mockReset(); download.mockResolvedValue({ content: ics, etag: 'test-etag', lastModified: null });
  });
  afterEach(async () => { for (const pair of connections.splice(0)) { await pair.client.close(); await pair.server.close(); } });
  afterAll(async () => { await db.$disconnect(); });
  const call = async (name: string, args: Record<string, unknown> = {}, target = client) => {
    const result = await target.callTool({ name, arguments: args });
    expect(result.isError, `${name}: ${JSON.stringify(result.content)}`).not.toBe(true);
    exercised.add(name);
    return JSON.parse((result.content as { type: string; text: string }[])[0].text);
  };
  const fail = async (name: string, args: Record<string, unknown>, status?: number, target = client) => {
    const result = await target.callTool({ name, arguments: args }); expect(result.isError, name).toBe(true);
    if (status) expect(JSON.parse((result.content as { text: string }[])[0].text).status, name).toBe(status);
  };
  const createHabit = (patch: Record<string, unknown> = {}) => call('reader_create_habit', { habit: { ...habitDraft, requestKey: randomUUID(), ...patch } });
  const createEvent = (patch: Record<string, unknown> = {}) => call('reader_create_calendar_event', { event: { ...eventDraft, requestKey: randomUUID(), ...patch } });
  const readHabit = (habitId: string) => call('reader_get_habit', { habitId });
  const readEvent = (eventId: string) => call('reader_get_calendar_event', { eventId });
  const occurrence = (event: any, date: string, patch: Record<string, unknown> = {}) => ({ eventId: event.id, date, occurrence: { eventVersion: event.version, expectedVersion: event.exceptions.find((item: any) => item.date === date)?.version ?? 0, start: null, end: null, allDay: null, completed: false, cancelled: false, ...patch } });
  const savedPage = async (userId = owner) => db.page.create({ data: { userId, title: 'Saved destination', content: '# Permanent', sortOrder: 0, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() } });

  it('manages habits, idempotency, count/skip/clear logs, progress, ordering and archive history', async () => {
    const input = { ...habitDraft, requestKey: randomUUID() };
    let habit = await call('reader_create_habit', { habit: input });
    expect((await call('reader_create_habit', { habit: input })).id).toBe(habit.id);
    await fail('reader_create_habit', { habit: { ...input, name: 'Changed retry' } }, 409);
    expect((await call('reader_list_habits', { range: { from: yesterday, to: today } })).items[0].id).toBe(habit.id);
    habit = await call('reader_update_habit', { habitId: habit.id, habit: { ...habitDraft, description: 'Updated reflection', plan: { ...plan, reminders: ['08:00', '20:00'] }, expectedVersion: habit.version } });
    expect(habit.plans[0].reminders).toEqual(['08:00', '20:00']);
    const log = { expectedVersion: 0, habitVersion: habit.version, value: 12, status: 'RECORDED', note: 'Good chapter', mood: 4 };
    let entry = await call('reader_record_habit', { habitId: habit.id, date: today, log });
    await fail('reader_record_habit', { habitId: habit.id, date: today, log }, 409);
    const progress = await call('reader_get_habit_progress', { habitId: habit.id, range: { from: yesterday, to: today } });
    expect(progress.stats.completed).toBe(1); expect(progress.quantityTotals).toEqual([{ unit: 'pages', value: 12 }]);
    expect(progress.days[1]).toMatchObject({ date: today, status: 'done', log: { note: 'Good chapter', mood: 4 } });
    entry = await call('reader_record_habit', { habitId: habit.id, date: today, log: { ...log, expectedVersion: entry.version, value: 0, status: 'SKIPPED' } });
    entry = await call('reader_record_habit', { habitId: habit.id, date: today, log: { ...log, expectedVersion: entry.version, value: 0, status: 'NONE', note: '', mood: null } });
    const other = await createHabit({ name: 'Walk', icon: 'walk', plan: { ...plan, goalType: 'CHECK', target: 1, step: 1, unit: '' } });
    const batch = { date: today, items: [{ id: habit.id, habitVersion: habit.version, expectedVersion: entry.version }, { id: other.id, habitVersion: other.version, expectedVersion: 0 }] };
    expect((await call('reader_complete_habits', { completion: batch })).logs.map((item: any) => item.value)).toEqual([10, 1]);
    await call('reader_reorder_habits', { ids: [other.id, habit.id] });
    expect((await call('reader_list_habits', { range: { from: today, to: today } })).items.map((item: any) => item.id)).toEqual([other.id, habit.id]);
    habit = await readHabit(habit.id);
    habit = await call('reader_archive_habit', { habitId: habit.id, expectedVersion: habit.version }); expect(habit.archivedAt).not.toBeNull();
    const exported = await call('reader_export_habits');
    expect(exported.format).toBe('do100x-habits'); expect(exported.habits.find((item: any) => item.id === habit.id).logs[0].value).toBe(10);
    habit = await call('reader_restore_habit', { habitId: habit.id, expectedVersion: habit.version }); expect(habit.archivedAt).toBeNull();
    await call('reader_delete_habit', { habitId: habit.id, expectedVersion: habit.version });
    await fail('reader_get_habit', { habitId: habit.id }, 404);
    expect(await db.habit_log.count({ where: { habitId: habit.id } })).toBe(0);
  });

  it('enforces habit account boundaries, future dates and atomic batch conflicts', async () => {
    const habit = await createHabit();
    for (const [name, args] of [
      ['reader_get_habit', { habitId: habit.id }],
      ['reader_get_habit_progress', { habitId: habit.id, range: { from: today, to: today } }],
      ['reader_update_habit', { habitId: habit.id, habit: { ...habitDraft, expectedVersion: habit.version } }],
      ['reader_archive_habit', { habitId: habit.id, expectedVersion: habit.version }],
      ['reader_restore_habit', { habitId: habit.id, expectedVersion: habit.version }],
      ['reader_delete_habit', { habitId: habit.id, expectedVersion: habit.version }],
    ] as const) await fail(name, args, 404, foreign);
    const log = { expectedVersion: 0, habitVersion: habit.version, value: 10, status: 'RECORDED', note: '', mood: null };
    await fail('reader_record_habit', { habitId: habit.id, date: today, log }, 404, foreign);
    await fail('reader_record_habit', { habitId: habit.id, date: tomorrow, log }, 400);
    await fail('reader_reorder_habits', { ids: [habit.id] }, 409, foreign);
    expect((await call('reader_list_habits', { range: { from: today, to: today } }, foreign)).items).toEqual([]);
    expect((await call('reader_export_habits', {}, foreign)).habits).toEqual([]);
    const foreignHabit = await call('reader_create_habit', { habit: { ...habitDraft, requestKey: randomUUID() } }, foreign);
    await fail('reader_complete_habits', { completion: { date: today, items: [{ id: habit.id, habitVersion: 1, expectedVersion: 0 }, { id: foreignHabit.id, habitVersion: 1, expectedVersion: 0 }] } }, 404);
    expect((await readHabit(habit.id)).logs).toEqual([]);
    await call('reader_update_habit', { habitId: habit.id, habit: { ...habitDraft, plan: { ...plan, target: 20 }, expectedVersion: habit.version } });
    await fail('reader_update_habit', { habitId: habit.id, habit: { ...habitDraft, expectedVersion: habit.version } }, 409);
    expect((await readHabit(habit.id)).plans).toHaveLength(2);
  });

  it('creates scheduled tasks atomically and supports recurrence completion, reopen, move and cancel', async () => {
    const input = { ...eventDraft, repeat, newTask: { listId: null, priority: 2 }, requestKey: randomUUID() };
    let event = await call('reader_create_calendar_event', { event: input });
    expect((await call('reader_create_calendar_event', { event: input })).taskId).toBe(event.taskId);
    expect(await db.task.count({ where: { userId: owner } })).toBe(1);
    await fail('reader_create_calendar_event', { event: { ...input, title: 'Different retry' } }, 409);
    expect((await call('reader_get_task_schedules', { taskId: event.taskId })).events[0].id).toBe(event.id);
    const complete = occurrence(event, today, { completed: true });
    event = await call('reader_save_calendar_occurrence', complete);
    expect((await db.task.findUniqueOrThrow({ where: { id: event.taskId } })).dueDate!.toISOString().slice(0, 10)).toBe(tomorrow);
    await fail('reader_save_calendar_occurrence', complete, 409);
    event = await call('reader_save_calendar_occurrence', occurrence(event, today));
    event = await call('reader_save_calendar_occurrence', occurrence(event, today, { start: `${today}T11:00`, end: `${today}T12:30` }));
    expect(event.exceptions[0]).toMatchObject({ start: `${today}T11:00`, end: `${today}T12:30`, completed: false });
    event = await call('reader_save_calendar_occurrence', occurrence(event, today, { cancelled: true }));
    event = await call('reader_save_calendar_occurrence', occurrence(event, today));
    expect(event.exceptions[0].cancelled).toBe(false);
    const data = await call('reader_get_calendar', { range });
    expect(data.occurrences).toHaveLength(3);
    const exported = await call('reader_export_calendar', { range });
    expect(exported.content).toContain('BEGIN:VCALENDAR'); expect(exported.content).toContain('Reading time');
    await call('reader_delete_calendar_event', { eventId: event.id, expectedVersion: event.version });
    expect(await db.task.findUnique({ where: { id: event.taskId } })).toMatchObject({ dueDate: null, dueTime: null, deletedAt: null });
    await fail('reader_get_calendar_event', { eventId: event.id }, 404);
  });

  it('edits entire series or following instances and supports all-day and habit reservations', async () => {
    let event = await createEvent({ repeat });
    event = await call('reader_update_calendar_event', { eventId: event.id, event: { ...eventDraft, repeat, title: 'Renamed', expectedVersion: event.version } });
    const split = await call('reader_update_calendar_event', { eventId: event.id, event: { ...eventDraft, repeat: { ...repeat, count: 2 }, start: `${tomorrow}T14:00`, end: `${tomorrow}T15:00`, scope: 'following', fromDate: tomorrow, expectedVersion: event.version } });
    expect(split.id).not.toBe(event.id);
    expect((await readEvent(event.id)).repeat.until).toBe(today);
    const allDay = await createEvent({ allDay: true, start: `${today}T00:00`, end: `${tomorrow}T00:00` });
    expect((await call('reader_get_calendar', { range })).occurrences.find((item: any) => item.eventId === allDay.id)).toMatchObject({ allDay: true });
    const habit = await createHabit();
    const reserved = await createEvent({ habitId: habit.id });
    await fail('reader_save_calendar_occurrence', occurrence(reserved, today, { completed: true }), 400);
    expect((await readHabit(habit.id)).logs).toEqual([]);
  });

  it('handles calendar preferences, unscheduled pagination, list filters and habit/focus overlays', async () => {
    const settings = await call('reader_get_calendar_preferences'); expect(settings.version).toBe(0);
    const changes = { expectedVersion: 0, preferences: { ...settings.preferences, timeZone: 'Asia/Kolkata', defaultView: 'agenda', showFocus: true, showCompleted: false, colorBy: 'priority' } };
    expect((await call('reader_save_calendar_preferences', { settings: changes })).version).toBe(1);
    await fail('reader_save_calendar_preferences', { settings: changes }, 409);
    expect((await call('reader_get_calendar_preferences', {}, foreign)).version).toBe(0);
    await db.task.createMany({ data: Array.from({ length: 101 }, () => ({ userId: owner, title: 'Unscheduled reading', createdAt: new Date(), updatedAt: new Date() })) });
    const first = await call('reader_list_unscheduled_tasks', { query: { search: 'Unscheduled', listId: 'inbox' } });
    expect(first.items).toHaveLength(100);
    expect((await call('reader_list_unscheduled_tasks', { query: { cursor: first.nextCursor, listId: 'inbox' } })).items).toHaveLength(1);
    expect((await call('reader_list_unscheduled_tasks', {}, foreign)).items).toEqual([]);
    const taskId = first.items[0].id;
    await createEvent({ taskId });
    await createHabit();
    await db.time_session.create({ data: { userId: owner, taskId, startTime: new Date(`${today}T06:00:00Z`), endTime: new Date(`${today}T06:15:00Z`), durationSeconds: 900, createdAt: new Date(), updatedAt: new Date() } });
    const data = await call('reader_get_calendar', { range }); expect(data.habits).toHaveLength(1); expect(data.focus[0].durationSeconds).toBe(900);
    const filtered = await call('reader_get_calendar', { range: { ...range, listId: 'inbox' } }); expect(filtered.habits).toEqual([]); expect(filtered.focus).toHaveLength(1);
    expect((await call('reader_get_calendar', { range }, foreign)).events).toEqual([]);
  });

  it('imports/exports ICS and manages subscription refresh, visibility and failure recovery', async () => {
    const source = { name: 'Imported appointments', color: 'teal', timeZone: 'UTC', content: ics };
    let imported = await call('reader_add_calendar_source', { source });
    expect((await call('reader_add_calendar_source', { source })).id).toBe(imported.id);
    expect((await call('reader_export_calendar_source', { sourceId: imported.id })).content).toBe(ics);
    expect((await call('reader_list_calendar_sources'))[0].id).toBe(imported.id);
    expect((await call('reader_get_calendar', { range })).external).toHaveLength(2);
    expect((await call('reader_export_calendar', { range })).content).not.toContain('Imported reading');
    imported = await call('reader_update_calendar_source', { sourceId: imported.id, source: { name: 'Hidden import', color: 'rose', timeZone: 'UTC', enabled: false, expectedVersion: imported.version } });
    expect((await call('reader_get_calendar', { range })).external).toEqual([]);
    expect((await call('reader_refresh_calendar_source', { sourceId: imported.id })).id).toBe(imported.id);
    expect(download).not.toHaveBeenCalled();
    let subscribed = await call('reader_add_calendar_source', { source: { name: 'Subscription', color: 'blue', timeZone: 'UTC', url: 'https://example.com/calendar.ics?private=token' } });
    expect(subscribed).toMatchObject({ kind: 'subscription', host: 'example.com' }); expect(JSON.stringify(subscribed)).not.toContain('token');
    await db.calendar_source.update({ where: { id: subscribed.id }, data: { lastCheckedAt: new Date(Date.now() - 3600000) } });
    subscribed = await call('reader_refresh_calendar_source', { sourceId: subscribed.id }); expect(download).toHaveBeenCalledTimes(2);
    await db.calendar_source.update({ where: { id: subscribed.id }, data: { lastCheckedAt: new Date(Date.now() - 3600000) } });
    download.mockRejectedValueOnce(new Error('private remote details'));
    subscribed = await call('reader_refresh_calendar_source', { sourceId: subscribed.id }); expect(subscribed.error).toContain('previous copy'); expect(subscribed.error).not.toContain('private');
    expect((await call('reader_export_calendar_source', { sourceId: subscribed.id })).content).toBe(ics);
    await fail('reader_remove_calendar_source', { sourceId: imported.id, expectedVersion: 1 }, 409);
    await call('reader_remove_calendar_source', { sourceId: imported.id, expectedVersion: imported.version });
    await fail('reader_add_calendar_source', { source: { ...source, content: 'not an ICS file' } }, 400);
    await fail('reader_add_calendar_source', { source: { name: 'Unsafe', color: 'blue', timeZone: 'UTC', url: 'file:///private.ics' } }, 400);
  });

  it('rejects foreign calendar objects, linked tasks/habits and stale event edits', async () => {
    const event = await createEvent({ newTask: { listId: null, priority: 2 } });
    const source = await call('reader_add_calendar_source', { source: { name: 'Private', color: 'blue', timeZone: 'UTC', content: ics } });
    for (const [name, args] of [
      ['reader_get_calendar_event', { eventId: event.id }],
      ['reader_update_calendar_event', { eventId: event.id, event: { ...eventDraft, taskId: event.taskId, expectedVersion: event.version } }],
      ['reader_save_calendar_occurrence', occurrence(event, today)],
      ['reader_delete_calendar_event', { eventId: event.id, expectedVersion: event.version }],
      ['reader_get_task_schedules', { taskId: event.taskId }],
      ['reader_export_calendar_source', { sourceId: source.id }],
      ['reader_refresh_calendar_source', { sourceId: source.id }],
      ['reader_update_calendar_source', { sourceId: source.id, source: { name: 'Changed', color: 'blue', timeZone: 'UTC', enabled: false, expectedVersion: source.version } }],
      ['reader_remove_calendar_source', { sourceId: source.id, expectedVersion: source.version }],
    ] as const) await fail(name, args, 404, foreign);
    expect(await call('reader_list_calendar_sources', {}, foreign)).toEqual([]);
    expect((await call('reader_get_calendar', { range }, foreign)).external).toEqual([]);
    await fail('reader_create_calendar_event', { event: { ...eventDraft, taskId: event.taskId, requestKey: randomUUID() } }, 404, foreign);
    const habit = await createHabit();
    await fail('reader_create_calendar_event', { event: { ...eventDraft, habitId: habit.id, requestKey: randomUUID() } }, 404, foreign);
    await call('reader_update_calendar_event', { eventId: event.id, event: { ...eventDraft, taskId: event.taskId, title: 'Updated', expectedVersion: event.version } });
    await fail('reader_update_calendar_event', { eventId: event.id, event: { ...eventDraft, taskId: event.taskId, expectedVersion: event.version } }, 409);
    await fail('reader_delete_calendar_event', { eventId: event.id, expectedVersion: event.version }, 409);
  });

  it('captures text, uses existing Reader editing/comments/quizzes, and keeps the same page permanently', async () => {
    const input = captureDraft(), capture = await call('reader_create_capture', { capture: input });
    expect(new Date(capture.expiresAt).getTime() - Date.now()).toBeGreaterThan(604790000);
    expect((await call('reader_create_capture', { capture: input })).id).toBe(capture.id);
    const detail = await call('reader_get_capture', { captureId: capture.id });
    expect(detail.captureSourceUrl).toBe('https://example.com/article'); expect(detail.content).toContain('Original paragraph.');
    expect((await call('reader_list_captures', { search: 'article' })).items[0].id).toBe(capture.id);
    expect((await call('reader_list_captures', { search: 'missing' })).items).toEqual([]);
    expect(await call('reader_list_pages')).toEqual([]);
    await call('reader_update_page', { pageId: capture.id, contentVersion: detail.contentVersion, content: '# Article\n\nEdited paragraph.' });
    await fail('reader_update_page', { pageId: capture.id, contentVersion: detail.contentVersion, content: 'Stale content' });
    expect((await call('reader_get_capture', { captureId: capture.id })).captureExpiresAt).toBe(detail.captureExpiresAt);
    const comment = await call('reader_create_comment', { pageId: capture.id, selectedText: 'Edited paragraph.', body: 'Keep my note', isExplanation: true });
    const quiz = await call('reader_create_quiz', { pageId: capture.id, quiz: { title: 'Capture quiz', questions: [{ kind: 'SUBJECTIVE', responseLength: 'SHORT', promptMarkdown: 'Explain?', referenceAnswerMarkdown: 'Answer', explanationMarkdown: 'Details', options: [] }] } });
    const parent = await savedPage();
    await call('reader_keep_capture', { captureId: capture.id, parentPageId: parent.id });
    await call('reader_keep_capture', { captureId: capture.id, parentPageId: parent.id });
    expect((await db.page.findUniqueOrThrow({ where: { id: parent.id } })).childrenCount).toBe(1);
    const kept = await call('reader_get_page', { pageId: capture.id }); expect(kept.parentPageId).toBe(parent.id); expect(kept.content).toContain('Edited paragraph.');
    expect((await call('reader_get_comments', { pageId: capture.id }))[0].id).toBe(comment.commentId);
    const commentsResource = await client.readResource({ uri: `reader://pages/${capture.id}/comments` });
    const commentsContent = commentsResource.contents[0];
    if (!('text' in commentsContent)) throw new Error('Expected a JSON text resource');
    expect(JSON.parse(commentsContent.text)[0].id).toBe(comment.commentId);
    expect((await call('reader_list_quizzes', { pageId: capture.id })).items[0].id).toBe(quiz.quizId);
    expect((await call('reader_list_captures')).items).toEqual([]);
    await fail('reader_discard_capture', { captureId: capture.id }, 404);
    expect((await call('reader_create_capture', { capture: input })).expiresAt).toBeNull();
  });

  it('isolates captures and protects expired, discarded and permanent content', async () => {
    const input = captureDraft(), capture = await call('reader_create_capture', { capture: input });
    const parent = await savedPage(), foreignParent = await savedPage(stranger);
    expect((await call('reader_list_captures', {}, foreign)).items).toEqual([]);
    await fail('reader_get_capture', { captureId: capture.id }, 404, foreign);
    await fail('reader_get_page', { pageId: capture.id }, undefined, foreign);
    await fail('reader_keep_capture', { captureId: capture.id, parentPageId: foreignParent.id }, 404);
    await fail('reader_keep_capture', { captureId: capture.id, parentPageId: foreignParent.id }, 404, foreign);
    await fail('reader_discard_capture', { captureId: capture.id }, 404, foreign);
    await fail('reader_discard_capture', { captureId: parent.id }, 404);
    await call('reader_discard_capture', { captureId: capture.id });
    await call('reader_discard_capture', { captureId: capture.id });
    await fail('reader_get_capture', { captureId: capture.id }, 404);
    await fail('reader_create_capture', { capture: input }, 410);
    const expiring = captureDraft(), expired = await call('reader_create_capture', { capture: expiring });
    await call('reader_create_comment', { pageId: expired.id, selectedText: 'paragraph', body: 'Temporary note' });
    await db.page.update({ where: { id: expired.id }, data: { captureExpiresAt: new Date(Date.now() - 1) } });
    await fail('reader_get_capture', { captureId: expired.id }, 404);
    await fail('reader_get_page', { pageId: expired.id });
    await fail('reader_update_page', { pageId: expired.id, title: 'Must not edit' });
    await fail('reader_create_capture', { capture: expiring }, 410);
    await fail('reader_keep_capture', { captureId: expired.id, parentPageId: parent.id }, 410);
    expect(await call('reader_get_comments', { pageId: expired.id })).toEqual([]);
    const expiredResource = await client.readResource({ uri: `reader://pages/${expired.id}/comments` });
    const expiredContent = expiredResource.contents[0];
    if (!('text' in expiredContent)) throw new Error('Expected a JSON text resource');
    expect(JSON.parse(expiredContent.text)).toEqual([]);
    expect((await call('reader_list_captures')).items).toEqual([]);
    await purgeExpiredCaptures(db);
    expect(await db.page.findFirst({ where: { id: expired.id, captureExpiresAt: undefined } })).toBeNull();
    expect(await db.comment.count({ where: { pageId: expired.id } })).toBe(0);
    expect(await db.page.findUnique({ where: { id: parent.id } })).not.toBeNull();
  });

  it('enforces the capture byte limit/quota and never discards a concurrently kept page', async () => {
    await fail('reader_create_capture', { capture: { ...captureDraft(), content: '₹'.repeat(180000) } });
    await db.page.createMany({ data: Array.from({ length: 100 }, () => ({ userId: owner, title: 'Quota fixture', content: 'Temporary', captureKey: randomUUID(), captureExpiresAt: new Date(Date.now() + 86400000), sortOrder: 0, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() })) });
    await fail('reader_create_capture', { capture: captureDraft() }, 409);
    const active = (await call('reader_list_captures')).items;
    await call('reader_discard_capture', { captureId: active[0].id });
    const capture = await call('reader_create_capture', { capture: captureDraft() }), parent = await savedPage();
    await Promise.all([
      client.callTool({ name: 'reader_keep_capture', arguments: { captureId: capture.id, parentPageId: parent.id } }),
      client.callTool({ name: 'reader_discard_capture', arguments: { captureId: capture.id } }),
    ]);
    const row = await db.page.findFirstOrThrow({ where: { id: capture.id, captureExpiresAt: undefined } });
    if (row.captureExpiresAt === null) { expect(row.deletedAt).toBeNull(); expect(row.parentId).toBe(parent.id); }
    else { expect(row.deletedAt).not.toBeNull(); expect(row.parentId).toBeNull(); }
  });

  it('shares persisted operations with HTTP and exercises every advertised feature tool', async () => {
    const app = express(); app.use(express.json()); app.use(attachSession(db));
    app.get('/login', (_req, res) => { issueSession(res, owner); res.json({ ok: true }); });
    app.use('/habits', createHabitsRouter(db)); app.use('/calendar', createCalendarRouter(db)); app.use('/captures', createCapturesRouter(db));
    const http = app.listen(0);
    try {
      const address = http.address(); if (!address || typeof address === 'string') throw new Error('No test port');
      const base = `http://127.0.0.1:${address.port}`, cookie = (await fetch(`${base}/login`)).headers.get('set-cookie')!.split(';')[0];
      const habit = await createHabit(), event = await createEvent(), capture = await call('reader_create_capture', { capture: captureDraft() });
      const get = async (path: string) => { const response = await fetch(`${base}${path}`, { headers: { Cookie: cookie } }); expect(response.status).toBe(200); return response.json() as Promise<any>; };
      expect((await get(`/habits/${habit.id}`)).name).toBe(habit.name);
      expect((await get(`/calendar/events/${event.id}`)).version).toBe(event.version);
      expect((await get('/captures')).items[0].id).toBe(capture.id);
      const response = await fetch(`${base}/captures/${capture.id}`, { method: 'DELETE', headers: { Cookie: cookie, Origin: 'http://localhost:3000' } });
      expect(response.status).toBe(204);
      expect((await call('reader_list_captures')).items).toEqual([]);
    } finally { await new Promise<void>((resolve, reject) => http.close(error => error ? reject(error) : resolve())); }
    expect(toolNames.filter(name => !exercised.has(name))).toEqual([]);
  });
});
