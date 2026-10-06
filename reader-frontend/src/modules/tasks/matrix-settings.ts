export type MatrixDateFilter = 'today' | 'tomorrow' | 'all';
export type MatrixStatusFilter = 'active' | 'completed' | 'all';
export interface MatrixSettings { date: MatrixDateFilter; status: MatrixStatusFilter; includeOverdue: boolean }
const key = 'do100x.tasks.matrix';

export function readMatrixSettings(): MatrixSettings {
  const defaults: MatrixSettings = { date: 'all', status: 'active', includeOverdue: false };
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || !['today', 'tomorrow', 'all'].includes(value.date) || !['active', 'completed', 'all'].includes(value.status) || typeof value.includeOverdue !== 'boolean') return defaults;
    return { date: value.date, status: value.status, includeOverdue: value.includeOverdue };
  } catch { return defaults; }
}

export function saveMatrixSettings(settings: MatrixSettings) {
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Storage may be disabled; in-memory filters still work. */ }
}

export function localCalendarDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function matrixCreationDate(filter: MatrixDateFilter, now = new Date()): string | null {
  if (filter === 'all') return null;
  const day = new Date(now);
  if (filter === 'tomorrow') day.setDate(day.getDate() + 1);
  return localCalendarDate(day);
}

export function dueDateLabel(value: string | null | undefined, now = new Date()): string {
  if (!value) return 'No due date';
  const day = value.slice(0, 10);
  const today = localCalendarDate(now);
  if (day < today) return 'Overdue';
  if (day === today) return 'Today';
  if (day === matrixCreationDate('tomorrow', now)) return 'Tomorrow';
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' as const } : {}) });
}

export function completionDateLabel(value: string | null | undefined, now = new Date()): string {
  if (!value) return 'Completed';
  const date = new Date(value);
  const day = localCalendarDate(date);
  if (day === localCalendarDate(now)) return 'Completed today';
  if (day === matrixCreationDate('tomorrow', now)) return 'Completed tomorrow';
  return `Completed ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) })}`;
}
