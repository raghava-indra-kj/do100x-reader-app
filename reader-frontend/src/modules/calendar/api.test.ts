import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendarApi, CalendarApiError } from './api';
import { defaultPreferences, eventDraft } from './model';
afterEach(() => vi.unstubAllGlobals());
describe('Calendar transport boundaries', () => {
  it('creates a new scheduled task with one idempotent calendar request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetch);
    await calendarApi.create(eventDraft('2026-10-15T09:00', defaultPreferences('UTC')), 'receipt', { listId: null, priority: 2 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/backend-api/calendar/events');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ requestKey: 'receipt', newTask: { listId: null, priority: 2 }, taskId: null, habitId: null });
  });
  it('sends list filters with each calendar and paginated task query, including Inbox', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}'))); vi.stubGlobal('fetch', fetch);
    await calendarApi.range('2026-10-15', '2026-10-16', 'UTC', undefined, 'inbox');
    await calendarApi.tasks('read', 'next-page', undefined, 'work-list');
    await calendarApi.tasks('', undefined, undefined, 'all');
    expect(fetch.mock.calls[0][0]).toContain('listId=inbox');
    expect(fetch.mock.calls[1][0]).toContain('cursor=next-page&listId=work-list');
    expect(fetch.mock.calls[2][0]).not.toContain('listId');
  });
  it('explains network failures for ordinary requests and file exports', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    for (const operation of [() => calendarApi.preferences(), () => calendarApi.download('export', 'calendar.ics')]) {
      await expect(operation()).rejects.toEqual(new CalendarApiError('Couldn’t reach Calendar. Check your connection and try again.', 0));
    }
  });
  it('keeps navigation cancellation distinguishable from an offline failure', async () => {
    const controller = new AbortController(); controller.abort();
    const error = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(calendarApi.preferences(controller.signal)).rejects.toBe(error);
  });
  it('sends only editable event fields, never a stale fetched object or another owner', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetch);
    const draft = { ...eventDraft('2026-10-15T09:00', defaultPreferences('UTC')), title: 'Work', id: 'id', userId: 'foreign', exceptions: [], version: 4 };
    await calendarApi.edit(draft as any, draft, 'following', '2026-10-15');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ expectedVersion: 4, scope: 'following', fromDate: '2026-10-15', title: 'Work' });
    expect(body).not.toHaveProperty('userId'); expect(body).not.toHaveProperty('exceptions'); expect(body).not.toHaveProperty('id');
  });
  it('uses the task PATCH endpoint and its optimistic version', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetch);
    await calendarApi.updateTask({ id: 'task', version: 3 } as any, { status: 'done' });
    expect(fetch.mock.calls[0][0]).toBe('/backend-api/tasks/task');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"status":"done","expectedVersion":3}' });
  });
  it('returns conflict information to the editor without discarding its draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Changed in another tab"}', { status: 409 })));
    await expect(calendarApi.create(eventDraft('2026-10-15T09:00', defaultPreferences('UTC')), 'key')).rejects.toEqual(new CalendarApiError('Changed in another tab', 409));
  });
});
