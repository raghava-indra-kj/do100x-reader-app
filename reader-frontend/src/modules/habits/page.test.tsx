// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localDate, type Habit, type HabitLog } from '@reader/habit-core';
import { habitsApi } from './api';
import { HabitsApp } from './page';

vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => null }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => children }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const today = localDate(Intl.DateTimeFormat().resolvedOptions().timeZone);
const habit = (patch: Partial<Habit> = {}): Habit => ({ id: 'read', name: 'Read a little', description: '', icon: 'book', color: 'orange', section: 'Learning', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, sortOrder: 0, version: 1, archivedAt: null, pauses: [], createdAt: '', updatedAt: '', logs: [], plans: [{ id: 'plan', effectiveFrom: `${today.slice(0, 7)}-01`, startDate: `${today.slice(0, 7)}-01`, endDate: null, frequency: 'DAILY', weekdays: [], intervalDays: 1, weeklyTarget: 3, goalType: 'CHECK', target: 1, unit: '', step: 1, reminders: [] }], ...patch });
const log = (patch: Partial<HabitLog> = {}): HabitLog => ({ id: 'log', habitId: 'read', date: today, value: 1, status: 'RECORDED', note: 'Saved note', mood: 4, version: 1, createdAt: '', updatedAt: '', ...patch });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, width: number, mediaListeners: Set<() => void>;
beforeEach(() => {
  width = 1280; mediaListeners = new Set(); localStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ get matches() { return query.includes('999px') && width <= 999; }, media: query, addEventListener(_event: string, listener: () => void) { mediaListeners.add(listener); }, removeEventListener(_event: string, listener: () => void) { mediaListeners.delete(listener); } })));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden || this.style.display === 'none' ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  vi.spyOn(habitsApi, 'list').mockResolvedValue({ items: [habit()] });
  vi.spyOn(habitsApi, 'get').mockResolvedValue(habit());
  vi.spyOn(habitsApi, 'record').mockResolvedValue(log());
  vi.spyOn(habitsApi, 'archive').mockResolvedValue(habit({ archivedAt: new Date().toISOString(), version: 2 }));
  vi.spyOn(habitsApi, 'remove').mockResolvedValue();
  vi.spyOn(habitsApi, 'complete').mockResolvedValue({ logs: [log()] });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); }
async function render(userId = 'account-a') { await act(async () => root.render(<MemoryRouter><HabitsApp key={userId} userId={userId} /></MemoryRouter>)); await settle(); }
function button(label: string, scope: ParentNode = document) { const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label); if (!found) throw new Error(`Missing button: ${label}`); return found; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function resize(nextWidth: number) { await act(async () => { const crossed = (width <= 999) !== (nextWidth <= 999); width = nextWidth; if (crossed) mediaListeners.forEach(listener => listener()); }); await settle(); }
async function escape() { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await settle(); }
async function note(value: string) { const field = document.querySelector<HTMLTextAreaElement>('.habit-form textarea')!; await act(async () => { field.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); }); }
function drawer() { return document.querySelector<HTMLElement>('.habit-detail-drawer'); }
function openHabit() { return click(document.querySelector<HTMLElement>('.habit-row-identity')!); }

describe('Habits detail accessibility and continuity', () => {
  it('shows a modal backdrop for a standalone editor even when the detail drawer is closed', async () => {
    width = 390; await render(); await click(button('New habit'));
    const popup = document.querySelector('.habit-dialog')!;
    expect(popup.parentElement!.querySelector('[role=presentation]')).not.toBeNull();
    expect(popup.contains(document.activeElement)).toBe(true);
  });
  it('opens a named mobile modal, contains focus, hides the background, and returns to its opener on Escape', async () => {
    width = 390; await render(); const opener = document.querySelector<HTMLElement>('.habit-row-identity')!; await click(opener);
    expect(drawer()?.getAttribute('role')).toBe('dialog'); expect(drawer()?.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(drawer()!.getAttribute('aria-labelledby')!)?.textContent).toBe('Read a little');
    expect(drawer()?.contains(document.activeElement)).toBe(true);
    expect(host.closest('[aria-hidden="true"]') || host.querySelector('[aria-hidden="true"]')).not.toBeNull();
    await escape(); expect(drawer()).toBeNull(); expect(document.activeElement).toBe(opener);
  });

  it('preserves history selection across desktop/mobile and gives year heatmap a keyboard-sized month drilldown', async () => {
    await render(); await openHabit(); await click(button('Year'));
    expect(document.querySelectorAll('.habit-mini-month')).toHaveLength(12);
    await resize(850); expect(button('Year').getAttribute('aria-pressed')).toBe('true');
    await resize(390); await click(document.querySelector<HTMLElement>('.habit-mini-month')!);
    expect(button('Month').getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(document.querySelector('.habit-calendar-heading h3'));
    expect(document.querySelector('.habit-calendar-heading h3')?.textContent).toContain('January');
    await resize(1280); expect(document.querySelector('.habit-calendar-heading h3')?.textContent).toContain('January');
    expect(drawer()).toBeNull(); expect(document.querySelector('aside.habit-detail')).not.toBeNull();
  });

  it('keeps a nested note editor alive through resizing, and Escape dismisses only its topmost dirty guard', async () => {
    width = 390; await render(); await openHabit();
    await click(document.querySelector<HTMLElement>('.habit-calendar-day.is-today')!); await note('Remember the example');
    const textarea = document.querySelector('.habit-form textarea');
    await resize(850); await resize(1280); await resize(850); await resize(390);
    expect(document.querySelector('.habit-form textarea')).toBe(textarea); expect((textarea as HTMLTextAreaElement).value).toBe('Remember the example');
    expect(drawer()).toBeNull(); expect(document.querySelector('.habit-form')?.contains(document.activeElement)).toBe(true);
    expect(textarea?.closest('[aria-hidden="true"]')).toBeNull();
    await escape(); expect(document.querySelector('.habit-form-confirm')).not.toBeNull();
    await escape(); expect(document.querySelector('.habit-form-confirm')).toBeNull(); expect(document.querySelector('.habit-form textarea')).toBe(textarea);
    await escape(); await click(button('Discard changes')); expect(document.querySelector('.habit-form')).toBeNull();
    // Returning from a desktop editor does not suddenly activate a covering drawer.
    expect(drawer()).toBeNull(); await openHabit(); expect(drawer()).not.toBeNull();
  });

  it('keeps the mobile detail open when a nested clean editor closes', async () => {
    width = 390; await render(); await openHabit(); await click(document.querySelector<HTMLElement>('.habit-calendar-day.is-today')!);
    await escape(); expect(document.querySelector('.habit-form')).toBeNull(); expect(drawer()).not.toBeNull(); expect(drawer()!.contains(document.activeElement)).toBe(true);
  });

  it('positions the month near the selected date once, without moving a manually scrolled review on refresh', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) { return this.dataset.habitDate ? 150 + (Number(this.dataset.habitDate.slice(8)) - 1) * 36 : 0; });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
    await render(); await click(button('Monthly review'));
    let scroller = document.querySelector<HTMLElement>('.habits-matrix-scroll')!;
    expect(scroller.scrollLeft).toBe(Math.max(0, (Number(today.slice(8)) - 1) * 36 - 8));
    scroller.scrollLeft = 17; await click(button('Refresh habits')); expect(scroller.scrollLeft).toBe(17);
    await click(button('Today')); await click(button('Monthly review')); scroller = document.querySelector<HTMLElement>('.habits-matrix-scroll')!;
    expect(scroller.scrollLeft).toBe(Math.max(0, (Number(today.slice(8)) - 1) * 36 - 8));
  });
});

describe('Habits mutation isolation', () => {
  it('locks immediately against duplicate quick check-ins', async () => {
    const write = deferred<HabitLog>(); await render(); vi.mocked(habitsApi.record).mockReturnValueOnce(write.promise);
    const check = button('Check in'); await act(async () => { check.click(); check.click(); });
    expect(habitsApi.record).toHaveBeenCalledTimes(1);
    vi.mocked(habitsApi.list).mockResolvedValue({ items: [habit({ logs: [log()] })] });
    await act(async () => write.resolve(log()));
    expect(document.querySelector('.habits-day-progress progress')?.getAttribute('value')).toBe('1');
  });

  it('keeps an editor draft through focus refresh and ignores list/history reads begun before saving it', async () => {
    const oldList = deferred<{ items: Habit[] }>(), oldDetail = deferred<Habit>(), freshList = deferred<{ items: Habit[] }>(), freshDetail = deferred<Habit>(), write = deferred<HabitLog>();
    await render(); await openHabit(); await click(button('Edit check-in for Read a little')); await note('Current draft');
    vi.mocked(habitsApi.list).mockReturnValueOnce(oldList.promise).mockReturnValueOnce(freshList.promise);
    vi.mocked(habitsApi.get).mockReturnValueOnce(oldDetail.promise).mockReturnValueOnce(freshDetail.promise);
    vi.mocked(habitsApi.record).mockReturnValueOnce(write.promise);
    await act(async () => window.dispatchEvent(new Event('focus'))); await settle();
    expect((document.querySelector('.habit-form textarea') as HTMLTextAreaElement).value).toBe('Current draft');
    await click(button('Save check-in')); expect(habitsApi.record).toHaveBeenCalledTimes(1);
    await act(async () => write.resolve(log({ note: 'Current draft' })));
    await act(async () => { oldList.resolve({ items: [habit()] }); oldDetail.resolve(habit()); }); await settle();
    expect(document.querySelector('.habits-day-progress progress')?.getAttribute('value')).toBe('1');
    await act(async () => { freshList.resolve({ items: [habit({ logs: [log({ note: 'Current draft' })] })] }); freshDetail.resolve(habit({ logs: [log({ note: 'Current draft' })] })); });
    await click(button('Journal')); expect(document.querySelector('.habit-journal')?.textContent).toContain('Current draft');
  });

  it('rejects a racing operation instead of falsely reporting a note as saved', async () => {
    const pending = deferred<Awaited<ReturnType<typeof habitsApi.export>>>(); vi.spyOn(habitsApi, 'export').mockReturnValueOnce(pending.promise);
    await render(); await click(button('Edit check-in for Read a little')); await note('Must not disappear');
    // Exercise two callbacks already queued in the same workspace, independently
    // of the disabled/inert controls that ordinarily prevent this interaction.
    await act(async () => { button('Export all habits').click(); });
    await click(button('Save check-in'));
    expect(habitsApi.record).not.toHaveBeenCalled(); expect(document.querySelector('.habit-form [role=alert]')?.textContent).toContain('Another change is still saving');
    expect((document.querySelector('.habit-form textarea') as HTMLTextAreaElement).value).toBe('Must not disappear');
    await act(async () => pending.reject(new Error('Export failed')));
  });

  it.each(['archive', 'delete'] as const)('keeps %s failure and retry in its confirmation, including focus after removal', async action => {
    width = 390; await render(); await openHabit(); await click(button(action === 'archive' ? 'Archive habit' : 'Delete habit'));
    const request = action === 'archive' ? vi.mocked(habitsApi.archive) : vi.mocked(habitsApi.remove);
    request.mockRejectedValueOnce(new Error('Please retry this change'));
    const confirmLabel = action === 'archive' ? 'Archive habit' : 'Delete habit and history';
    await click(button(confirmLabel, document.querySelector('.habit-dialog')!));
    expect(document.querySelector('.habit-dialog [role=alert]')?.textContent).toContain('Please retry this change');
    expect(document.querySelector('.habit-dialog')?.textContent).toContain('Read a little');
    if (action === 'delete') vi.mocked(habitsApi.list).mockResolvedValue({ items: [] });
    await click(button(confirmLabel, document.querySelector('.habit-dialog')!));
    expect(request).toHaveBeenCalledTimes(2); expect(document.querySelector('.habit-dialog')).toBeNull();
    if (action === 'delete') { expect(drawer()).toBeNull(); expect(document.activeElement).toBe(document.querySelector('[aria-label="Search habits"]')); }
  });

  it('retains the exact bulk selection and date on failure and permits a single retry', async () => {
    const second = habit({ id: 'walk', name: 'Walk outside' }); vi.mocked(habitsApi.list).mockResolvedValue({ items: [habit(), second] });
    await render(); await click(button('Complete remaining (2)'));
    const pending = deferred<{ logs: HabitLog[] }>(); vi.mocked(habitsApi.complete).mockReturnValueOnce(pending.promise);
    const save = button('Complete 2 habits'); await act(async () => { save.click(); save.click(); });
    expect(habitsApi.complete).toHaveBeenCalledTimes(1); expect(vi.mocked(habitsApi.complete).mock.calls[0][1]).toBe(today);
    await act(async () => pending.reject(new Error('Network unavailable'))); await settle();
    expect(document.querySelector('.habit-dialog [role=alert]')?.textContent).toContain('Network unavailable');
    expect(document.querySelectorAll('.habit-complete-list li')).toHaveLength(2);
    await click(button('Complete 2 habits')); expect(habitsApi.complete).toHaveBeenCalledTimes(2); expect(document.querySelector('.habit-dialog')).toBeNull();
  });

  it('ignores late export and reads from a disposed account workspace', async () => {
    const pending = deferred<Awaited<ReturnType<typeof habitsApi.export>>>(), download = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    vi.spyOn(habitsApi, 'export').mockReturnValueOnce(pending.promise);
    await render(); await click(button('Export all habits'));
    vi.mocked(habitsApi.list).mockResolvedValue({ items: [habit({ id: 'other', name: 'Account B habit' })] });
    await render('account-b'); await act(async () => pending.resolve({ format: 'do100x-habits', version: 1, exportedAt: '', habits: [habit()] }));
    expect(download).not.toHaveBeenCalled(); expect(document.querySelector('.habit-list')?.textContent).toContain('Account B habit'); expect(document.querySelector('.habit-list')?.textContent).not.toContain('Read a little');
  });
});
