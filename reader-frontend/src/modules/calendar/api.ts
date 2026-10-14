import type { CalendarEvent, Occurrence, Schedule } from '@reader/calendar-core';
import type { Habit } from '@reader/habit-core';

export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda';
export type CalendarPreferences = { timeZone: string; firstDay: 0 | 1; defaultView: CalendarView; workStart: number; workEnd: number; workDays: number[]; defaultMinutes: number; showHabits: boolean; showFocus: boolean; showCompleted: boolean; colorBy: 'event' | 'list' | 'priority' };
export type CalendarTask = { id: string; title: string; description: string | null; status: string; priority: number; listId: string | null; parentId: string | null; dueDate: string | null; dueTime: string | null; version: number };
export type CalendarSource = { id: string; name: string; color: string; timeZone: string; enabled: boolean; version: number; kind: 'file' | 'subscription'; host: string | null; lastCheckedAt: string; lastSuccessAt: string; error: string | null };
export type ExternalOccurrence = { key: string; sourceId: string; sourceName: string; title: string; description: string; location: string; color: string; start: string; end: string; startInstant: string; endInstant: string; allDay: boolean };
export type CalendarRange = { from: string; to: string; timeZone: string; listId?: string | null; events: CalendarEvent[]; occurrences: Occurrence[]; tasks: CalendarTask[]; lists: { id: string; name: string; color: string | null }[]; habits: Habit[]; focus: { id: string; taskId: string; title: string; listId: string | null; start: string; end: string; durationSeconds: number; notes: string | null }[]; preferences: CalendarPreferences; version: number; sources?: CalendarSource[]; external?: ExternalOccurrence[]; sourceErrors?: string[] };
export type EventDraft = Schedule & Pick<CalendarEvent, 'title' | 'description' | 'location' | 'color' | 'taskId' | 'habitId' | 'reminders'>;
export class CalendarApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
async function calendarFetch(path: string, options: RequestInit) {
  try { return await fetch(path, options); }
  catch (error) {
    if (options.signal?.aborted || error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CalendarApiError('Couldn’t reach Calendar. Check your connection and try again.', 0);
  }
}
function eventFields(draft: EventDraft): EventDraft { const { title, description, location, color, start, end, timeZone, allDay, repeat, taskId, habitId, reminders } = draft; return { title, description, location, color, start, end, timeZone, allDay, repeat, taskId, habitId, reminders }; }
async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await calendarFetch(`/backend-api${path}`, { method, credentials: 'same-origin', signal, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new CalendarApiError(data.message || 'Couldn’t reach Calendar. Please try again.', response.status); }
  return response.status === 204 ? undefined as T : response.json();
}
export const calendarApi = {
  sources: (signal?: AbortSignal) => request<CalendarSource[]>('/calendar/sources', 'GET', undefined, signal),
  addSource: (input: { name: string; color: string; timeZone: string; url?: string; content?: string }) => request<CalendarSource>('/calendar/sources', 'POST', input),
  updateSource: (source: CalendarSource, changes: Partial<Pick<CalendarSource, 'name' | 'color' | 'timeZone' | 'enabled'>>) => request<CalendarSource>(`/calendar/sources/${source.id}`, 'PUT', { name: source.name, color: source.color, timeZone: source.timeZone, enabled: source.enabled, ...changes, expectedVersion: source.version }),
  removeSource: (source: CalendarSource) => request<void>(`/calendar/sources/${source.id}`, 'DELETE', { expectedVersion: source.version }),
  refreshSource: (source: Pick<CalendarSource, 'id'>) => request<CalendarSource>(`/calendar/sources/${source.id}/refresh`, 'POST'),
  download: async (path: string, name: string) => {
    const response = await calendarFetch(`/backend-api/calendar/${path}`, { credentials: 'same-origin' });
    if (!response.ok) { const result = await response.json().catch(() => ({})); throw new CalendarApiError(result.message || 'Couldn’t export this calendar.', response.status); }
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  preferences: (signal?: AbortSignal) => request<{ preferences: CalendarPreferences; version: number }>('/calendar/preferences', 'GET', undefined, signal),
  savePreferences: (preferences: CalendarPreferences, expectedVersion: number) => request<{ preferences: CalendarPreferences; version: number }>('/calendar/preferences', 'PUT', { preferences, expectedVersion }),
  range: (from: string, to: string, timeZone: string, signal?: AbortSignal, listId?: string) => request<CalendarRange>(`/calendar?${new URLSearchParams({ from, to, timeZone, ...(listId && listId !== 'all' ? { listId } : {}) })}`, 'GET', undefined, signal),
  tasks: (search = '', cursor?: string, signal?: AbortSignal, listId?: string) => request<{ items: CalendarTask[]; nextCursor: string | null }>(`/calendar/tasks?${new URLSearchParams({ search, ...(cursor ? { cursor } : {}), ...(listId && listId !== 'all' ? { listId } : {}) })}`, 'GET', undefined, signal),
  task: (id: string, signal?: AbortSignal) => request<CalendarTask>(`/tasks/${encodeURIComponent(id)}`, 'GET', undefined, signal),
  taskSchedule: (id: string, signal?: AbortSignal) => request<{ task: CalendarTask; events: CalendarEvent[] }>(`/calendar/tasks/${encodeURIComponent(id)}/schedule`, 'GET', undefined, signal),
  updateTask: (task: CalendarTask, changes: Record<string, unknown>) => request<CalendarTask>(`/tasks/${task.id}`, 'PATCH', { ...changes, expectedVersion: task.version }),
  create: (draft: EventDraft, requestKey: string, newTask?: { listId: string | null; priority: number }) => request<CalendarEvent>('/calendar/events', 'POST', { ...eventFields(draft), requestKey, ...(newTask ? { newTask } : {}) }),
  edit: (event: CalendarEvent, draft: EventDraft, scope: 'series' | 'following', fromDate?: string) => request<CalendarEvent>(`/calendar/events/${event.id}`, 'PUT', { ...eventFields(draft), expectedVersion: event.version, scope, fromDate }),
  occurrence: (event: CalendarEvent, occurrence: Occurrence, changes: Partial<Pick<Occurrence, 'start' | 'end' | 'allDay' | 'completed' | 'cancelled'>>) => request<CalendarEvent>(`/calendar/events/${event.id}/occurrences/${occurrence.date}`, 'PUT', { start: occurrence.start, end: occurrence.end, allDay: occurrence.allDay, completed: occurrence.completed, cancelled: occurrence.cancelled, ...changes, expectedVersion: occurrence.exceptionVersion, eventVersion: event.version }),
  remove: (event: CalendarEvent) => request<void>(`/calendar/events/${event.id}`, 'DELETE', { expectedVersion: event.version }),
};
