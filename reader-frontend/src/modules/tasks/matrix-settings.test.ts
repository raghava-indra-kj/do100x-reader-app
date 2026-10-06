import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMatrixSettings, saveMatrixSettings, matrixCreationDate, localCalendarDate, dueDateLabel, completionDateLabel } from './matrix-settings';

afterEach(() => vi.unstubAllGlobals());
describe('matrix preferences and local calendar dates', () => {
  it('defaults to All dates and Active; remembers valid selections', () => {
    let value: string | null = null;
    vi.stubGlobal('localStorage', { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } });
    expect(readMatrixSettings()).toEqual({ date: 'all', status: 'active', includeOverdue: false });
    saveMatrixSettings({ date: 'today', status: 'completed', includeOverdue: true });
    expect(readMatrixSettings()).toEqual({ date: 'today', status: 'completed', includeOverdue: true });
    value = '{invalid'; expect(readMatrixSettings().date).toBe('all');
    value = JSON.stringify({ date: 'yesterday', status: 'active', includeOverdue: false });
    expect(readMatrixSettings().date).toBe('all');
  });
  it('works when browser storage is disabled', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } });
    expect(readMatrixSettings().status).toBe('active');
    expect(() => saveMatrixSettings({ date: 'tomorrow', status: 'all', includeOverdue: false })).not.toThrow();
  });
  it('creates local dates across calendar boundaries; All does not assign a due date', () => {
    const now = new Date(2026, 11, 31, 23, 59);
    expect(localCalendarDate(now)).toBe('2026-12-31');
    expect(matrixCreationDate('today', now)).toBe('2026-12-31');
    expect(matrixCreationDate('tomorrow', now)).toBe('2027-01-01');
    expect(matrixCreationDate('tomorrow', new Date(2028, 1, 28))).toBe('2028-02-29');
    expect(matrixCreationDate('all', now)).toBeNull();
  });
  it('labels due calendar dates without shifting UTC midnight into a different day', () => {
    const now = new Date(2026, 9, 6, 12);
    expect(dueDateLabel('2026-10-06T00:00:00.000Z', now)).toBe('Today');
    expect(dueDateLabel('2026-10-07', now)).toBe('Tomorrow');
    expect(dueDateLabel('2026-10-05', now)).toBe('Overdue');
    expect(dueDateLabel(null, now)).toBe('No due date');
    expect(dueDateLabel('2027-01-01', now)).toContain('2027');
  });
  it('labels completed timestamps by the local completion day', () => {
    const now = new Date(2026, 9, 6, 12);
    expect(completionDateLabel(now.toISOString(), now)).toBe('Completed today');
    expect(completionDateLabel(null, now)).toBe('Completed');
    expect(completionDateLabel(new Date(2025, 9, 5).toISOString(), now)).toContain('2025');
  });
});
