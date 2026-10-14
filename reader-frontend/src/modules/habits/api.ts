import type { Habit, HabitDraft, HabitLog } from '@reader/habit-core';

export class HabitApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/backend-api/habits${path}`, { method, credentials: 'same-origin', signal, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new HabitApiError(data.message || 'Couldn’t reach Habits. Please try again.', response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const habitsApi = {
  list: (from: string, to: string, signal?: AbortSignal) => request<{ items: Habit[] }>(`?from=${from}&to=${to}`, 'GET', undefined, signal),
  get: (id: string, signal?: AbortSignal) => request<Habit>(`/${id}`, 'GET', undefined, signal),
  create: (draft: HabitDraft, requestKey: string) => request<Habit>('', 'POST', { ...draft, requestKey }),
  edit: (habit: Habit, draft: HabitDraft) => request<Habit>(`/${habit.id}`, 'PUT', { ...draft, expectedVersion: habit.version }),
  record: (habit: Habit, date: string, log: Pick<HabitLog, 'value' | 'status' | 'note' | 'mood'>) => request<HabitLog>(`/${habit.id}/logs/${date}`, 'PUT', { ...log, habitVersion: habit.version, expectedVersion: habit.logs.find(item => item.date === date)?.version ?? 0 }),
  archive: (habit: Habit, archive: boolean) => request<Habit>(`/${habit.id}/${archive ? 'archive' : 'restore'}`, 'POST', { expectedVersion: habit.version }),
  remove: (habit: Habit) => request<void>(`/${habit.id}`, 'DELETE', { expectedVersion: habit.version }),
  reorder: (ids: string[]) => request<void>('/order', 'PUT', { ids }),
  complete: (habits: Habit[], date: string) => request<{ logs: HabitLog[] }>('/complete', 'POST', { date, items: habits.map(habit => ({ id: habit.id, habitVersion: habit.version, expectedVersion: habit.logs.find(log => log.date === date)?.version ?? 0 })) }),
  export: () => request<{ format: string; version: number; exportedAt: string; habits: Habit[] }>('/export'),
};
