import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createReaderMcpServer } from '../server';
import { featureResult } from './feature-tool';
import { HabitError } from '../../habits/habit-service';
import { CalendarError } from '../../calendar/calendar-service';
import { CaptureError } from '../../reader/captures';
import { TaskHierarchyError } from '../../task-errors';
import { z } from 'zod';

const { accessed } = vi.hoisted(() => ({ accessed: vi.fn(() => { throw new Error('Unexpected database access'); }) }));
vi.mock('../../prisma', () => ({ prisma: new Proxy({}, { get: () => accessed() }) }));
const uuid = '11111111-1111-4111-8111-111111111111';

describe('Habits, Calendar and captures MCP discovery and validation', () => {
  const server = createReaderMcpServer(uuid);
  const client = new Client({ name: 'feature-client', version: '1' });
  beforeAll(async () => { const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b); });
  afterAll(async () => { await client.close(); await server.close(); });
  it('registers 34 tools on the production server with strict schemas and operation annotations', async () => {
    const tools = (await client.listTools()).tools;
    const names = tools.map(tool => tool.name);
    const added = tools.filter(tool => tool.annotations?.openWorldHint !== undefined && /habit|calendar|capture|unscheduled|task_schedules/.test(tool.name));
    expect(added).toHaveLength(34);
    expect(new Set(names).size).toBe(names.length);
    for (const tool of added) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.properties).not.toHaveProperty('userId');
      expect(typeof tool.annotations?.readOnlyHint).toBe('boolean');
    }
    const named = (name: string) => tools.find(tool => tool.name === name)!;
    expect(named('reader_get_habit_progress').annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(named('reader_create_capture').annotations).toMatchObject({ idempotentHint: true, destructiveHint: false, openWorldHint: false });
    expect(named('reader_add_calendar_source').annotations).toMatchObject({ openWorldHint: true });
    expect(named('reader_delete_habit').annotations).toMatchObject({ destructiveHint: true });
    expect(named('reader_create_habit').inputSchema.properties).toHaveProperty('habit');
    expect(named('reader_create_calendar_event').inputSchema.properties).toHaveProperty('event');
  });
  it.each([
    ['reader_list_habits', { range: { from: '2026-02-30', to: '2026-03-01' } }],
    ['reader_get_habit_progress', { habitId: uuid, range: { from: '2026-01-01', to: '2027-01-02' } }],
    ['reader_get_habit', { habitId: uuid, userId: uuid }],
    ['reader_get_calendar', { range: { from: '2026-10-15', to: '2026-10-14', timeZone: 'UTC' } }],
    ['reader_get_calendar', { range: { from: '2026-10-14', to: '2026-10-15', timeZone: 'bad-zone' } }],
    ['reader_list_unscheduled_tasks', { query: { cursor: 'not-uuid' } }],
    ['reader_save_calendar_occurrence', { eventId: uuid, date: '2026-10-14', occurrence: { eventVersion: 1, expectedVersion: 0, start: null, end: null, allDay: null, completed: true, cancelled: true } }],
    ['reader_record_habit', { habitId: uuid, date: '2026-10-14', log: { habitVersion: 1, expectedVersion: 0, status: 'NONE', value: 0, note: 'must clear notes', mood: null } }],
    ['reader_complete_habits', { completion: { date: '2026-10-14', items: [{ id: uuid, habitVersion: 1, expectedVersion: 0 }, { id: uuid, habitVersion: 1, expectedVersion: 0 }] } }],
    ['reader_add_calendar_source', { source: { name: 'Invalid', color: 'blue', timeZone: 'UTC', url: 'https://example.com/test.ics', content: 'BEGIN:VCALENDAR' } }],
    ['reader_create_capture', { capture: { captureKey: uuid, title: 'Capture', content: ' ', sourceUrl: null } }],
    ['reader_create_capture', { capture: { captureKey: uuid, title: 'Capture', content: 'Text', sourceUrl: 'javascript:alert(1)' } }],
    ['reader_create_capture', { capture: { captureKey: uuid, title: 'Capture', content: 'Text', sourceUrl: null, captureExpiresAt: null } }],
    ['reader_keep_capture', { captureId: uuid, parentPageId: 'bad-id' }],
    ['reader_delete_calendar_event', { eventId: uuid, expectedVersion: 0 }],
  ])('rejects invalid %s arguments before accessing storage', async (name, args) => {
    accessed.mockClear();
    expect((await client.callTool({ name, arguments: args })).isError).toBe(true);
    expect(accessed).not.toHaveBeenCalled();
  });
});

describe('MCP feature errors', () => {
  it.each([
    [new HabitError(404, 'Habit not found.'), 404],
    [new CalendarError(409, 'Reload before saving.'), 409],
    [new CaptureError(410, 'This capture has expired.'), 410],
    [new TaskHierarchyError(400, 'Invalid task destination.'), 400],
    [new z.ZodError([{ code: 'custom', path: [], message: 'Invalid input' }]), 400],
    [{ code: 'P2021', message: 'mysql://private:secret@production' }, 503],
    [{ code: 'P2022' }, 503], [{ code: 'P2034' }, 409], [{ code: 'P2002' }, 409], [{ code: 'P2025' }, 409],
    [new Error('mysql://private:secret@production'), 500],
  ])('returns a safe failure for %j', async (error, status) => {
    const result = await featureResult(async () => { throw error; });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).status).toBe(status);
    expect(result.content[0].text).not.toMatch(/secret|mysql|production/);
  });
});
