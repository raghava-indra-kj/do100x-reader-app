// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Habit, type HabitDraft } from '@reader/habit-core';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { HabitForm } from './habit-form';
import { LogForm, type LogValue } from './log-form';
import { HabitApiError, habitsApi } from './api';
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => children }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const day = '2026-10-15';
function habit(patch: Partial<Habit> = {}): Habit {
  return { id: 'habit-a', name: 'Read two pages', description: 'A small idea', icon: 'book', color: 'green', section: 'Learning', timezone: 'UTC', sortOrder: 0, version: 1, archivedAt: null, pauses: [], createdAt: day, updatedAt: day,
    plans: [{ id: 'plan-a', effectiveFrom: '2026-10-01', startDate: '2026-10-01', endDate: null, frequency: 'WEEKDAYS', weekdays: [1, 2, 3, 4, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'COUNT', target: 2, unit: 'pages', step: 1, reminders: ['09:00'] }],
    logs: [{ id: 'log-a', habitId: 'habit-a', date: day, value: 1, status: 'RECORDED', note: 'Saved note', mood: 3, version: 1, createdAt: day, updatedAt: day }], ...patch };
}
function created(draft: HabitDraft) { return habit({ ...draft, id: 'created-habit', plans: [{ ...draft.plan, id: 'created-plan', effectiveFrom: draft.plan.startDate }], logs: [] }); }
const saved = vi.fn(), recovered = vi.fn(), closed = vi.fn(), record = vi.fn<(value: LogValue, source: Habit) => Promise<void>>(), reload = vi.fn<() => Promise<Habit>>();
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia ??= vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden || this.style.display === 'none' ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  vi.spyOn(habitsApi, 'create').mockImplementation(async draft => created(draft));
  vi.spyOn(habitsApi, 'edit').mockImplementation(async (source, draft) => ({ ...created(draft), id: source.id, version: source.version + 1 }));
  vi.spyOn(habitsApi, 'get').mockResolvedValue(habit({ version: 2 }));
  record.mockReset().mockResolvedValue(undefined); reload.mockReset().mockResolvedValue(habit({ version: 2 })); saved.mockReset(); recovered.mockReset(); closed.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Harness({ item, log = false }: { item?: Habit; log?: boolean }) {
  const [open, setOpen] = useState(true), [confirmed, setConfirmed] = useState<Habit | null>(null);
  const close = () => { closed(); setOpen(false); };
  return <div className="habits-main"><button>Open habit</button>{confirmed && <output>{confirmed.name}</output>}{open && (log ? <LogForm habit={item ?? habit()} date={day} onClose={close} onSave={record} onReload={reload} /> : <HabitForm habit={item} onClose={close} onSaved={saved} onRecovered={value => { recovered(value); setConfirmed(value); }} />)}</div>;
}
async function render(item?: Habit, log = false) { await act(async () => root.render(<Harness item={item} log={log} />)); await settle(); }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); }
function button(label: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label)!; }
function field(label: string) { const wrapper = [...document.querySelectorAll('label')].find(element => element.querySelector('span')?.textContent === label)!; return wrapper.querySelector<HTMLInputElement | HTMLTextAreaElement>('input,textarea')!; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function type(label: string, value: string) { const input = field(label); await act(async () => { input.focus(); Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function escape() { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await settle(); }
async function backdrop() { const popup = document.querySelector('.habit-form-dialog')!, background = popup.parentElement!.querySelector<HTMLElement>('.fixed.inset-0')!; await act(async () => { for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) background.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 })); }); await settle(); }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function submitTwice() { return act(async () => { const form = document.querySelector('form')!; for (let count = 0; count < 2; count++) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }

for (const log of [false, true]) describe(log ? 'Check-in drafts' : 'Habit drafts', () => {
  it.each(['Escape', 'Cancel', 'Close dialog', 'backdrop'])('guards dirty %s and restores input and field focus', async path => {
    await render(habit(), log); const label = log ? 'A note for yourself (optional)' : 'Why it matters (optional)'; await type(label, 'Unsaved thought');
    const dismiss = () => path === 'Escape' ? escape() : path === 'backdrop' ? backdrop() : click(button(path));
    await dismiss(); expect(closed).not.toHaveBeenCalled(); const dialogs = [...document.querySelectorAll('[role=dialog]')]; expect(dialogs).toHaveLength(2);
    const ids = dialogs.map(dialog => dialog.getAttribute('aria-labelledby')); expect(new Set(ids).size).toBe(2); expect(ids.every(id => document.getElementById(id!)?.textContent)).toBe(true);
    expect(document.activeElement).toBe(button('Keep editing')); await click(button('Keep editing')); expect(field(label).value).toBe('Unsaved thought'); expect(document.activeElement).toBe(field(label));
    await dismiss(); await click(button('Discard changes')); expect(closed).toHaveBeenCalledTimes(1); expect(saved).not.toHaveBeenCalled(); expect(record).not.toHaveBeenCalled(); expect(habitsApi.edit).not.toHaveBeenCalled();
  });
  it('closes clean drafts and typed-then-undone changes without saving', async () => {
    await render(habit(), log); const label = log ? 'A note for yourself (optional)' : 'Why it matters (optional)', previous = field(label).value;
    await type(label, 'Changed'); await type(label, previous); await escape(); expect(document.querySelector('[role=dialog]')).toBeNull(); expect(closed).toHaveBeenCalledTimes(1); expect(record).not.toHaveBeenCalled();
  });
});

describe('Habit mutation safety', () => {
  it('preserves browsing drafts and confirms template replacement', async () => {
    await render(); await click(button('Create my own habit')); await type('Habit name', 'My routine'); await type('Why it matters (optional)', 'My reason');
    const idea = () => [...document.querySelectorAll<HTMLElement>('.habit-gallery button')].find(button => button.textContent?.includes('Drink water'))!;
    await click(button('Browse ideas')); await click(idea()); await click(button('Keep editing')); await click(button('Back to my draft')); expect(field('Habit name').value).toBe('My routine'); expect(field('Why it matters (optional)').value).toBe('My reason');
    await click(button('Browse ideas')); await click(idea()); await click(button('Use this idea')); expect(field('Habit name').value).toBe('Drink water'); expect(habitsApi.create).not.toHaveBeenCalled();
  });
  it('locks immediately and freezes all payload fields until failed-save recovery', async () => {
    const pending = deferred<Habit>(); vi.mocked(habitsApi.edit).mockReturnValueOnce(pending.promise); await render(habit()); await type('Why it matters (optional)', 'Before save'); await submitTwice(); expect(habitsApi.edit).toHaveBeenCalledTimes(1);
    const [source, payload] = vi.mocked(habitsApi.edit).mock.calls[0]; expect(source.version).toBe(1); expect(payload.description).toBe('Before save');
    const controls = [...document.querySelectorAll<HTMLElement>('.habit-form-dialog input,.habit-form-dialog textarea,.habit-form-dialog button')]; expect(controls.length).toBeGreaterThan(30); expect(controls.every(control => control.matches(':disabled'))).toBe(true);
    await type('Why it matters (optional)', 'Blocked change'); await escape(); expect(closed).not.toHaveBeenCalled(); expect(payload.description).toBe('Before save');
    await act(async () => pending.reject(new Error('Connection failed'))); expect(field('Why it matters (optional)').value).toBe('Before save'); expect(field('Habit name').matches(':disabled')).toBe(false); expect(document.querySelector('[role=alert]')?.textContent).toContain('Connection failed'); expect(document.activeElement).toBe(document.querySelector('[role=alert]')); await click(button('Save changes')); expect(saved).toHaveBeenCalledTimes(1);
  });
  it('replaces conflicts only after confirmation and successful reload', async () => {
    vi.mocked(habitsApi.edit).mockRejectedValueOnce(new HabitApiError('Changed elsewhere', 409)); await render(habit()); await type('Habit name', 'My unsaved name'); await click(button('Save changes')); await click(button('Reload latest habit')); await click(button('Keep editing')); expect(habitsApi.get).not.toHaveBeenCalled();
    vi.mocked(habitsApi.get).mockRejectedValueOnce(new Error('Reload failed')); await click(button('Reload latest habit')); await click(button('Replace with latest')); expect(field('Habit name').value).toBe('My unsaved name'); expect(document.querySelector('[role=alert]')?.textContent).toBe('Reload failed');
    await click(button('Reload latest habit')); await click(button('Replace with latest')); expect(field('Habit name').value).toBe('Read two pages'); expect(document.querySelector('[role=alert]')).toBeNull(); await type('Habit name', 'Reviewed name'); await click(button('Save changes')); expect(vi.mocked(habitsApi.edit).mock.calls[1][0].version).toBe(2);
  });
  it('recovers the original uncertain create snapshot/key before explicitly saving newer edits', async () => {
    vi.mocked(habitsApi.create).mockRejectedValueOnce(new TypeError('Response lost')); await render(); await click(button('Create my own habit')); await type('Habit name', 'Original habit'); await click(button('Create habit'));
    const first = vi.mocked(habitsApi.create).mock.calls[0]; await type('Habit name', 'Newer name'); await type('Why it matters (optional)', 'Keep newer input'); await click(button('Check earlier save'));
    expect(vi.mocked(habitsApi.create).mock.calls[1]).toEqual(first); expect(saved).not.toHaveBeenCalled(); expect(habitsApi.edit).not.toHaveBeenCalled(); expect(field('Habit name').value).toBe('Newer name'); expect(field('Why it matters (optional)').value).toBe('Keep newer input'); expect(recovered).toHaveBeenCalledTimes(1);
    await click(button('Save changes')); expect(habitsApi.create).toHaveBeenCalledTimes(2); expect(vi.mocked(habitsApi.edit).mock.calls[0][0].id).toBe('created-habit'); expect(vi.mocked(habitsApi.edit).mock.calls[0][1].name).toBe('Newer name'); expect(saved).toHaveBeenCalledTimes(1);
  });
  it('shows the confirmed recovered habit after discarding newer edits', async () => {
    vi.mocked(habitsApi.create).mockRejectedValueOnce(new Error('Response lost')); await render(); await click(button('Create my own habit')); await type('Habit name', 'Already created'); await click(button('Create habit')); await type('Habit name', 'Newer draft'); await click(button('Check earlier save')); await click(button('Cancel')); await click(button('Discard changes'));
    expect(document.querySelector('output')?.textContent).toBe('Already created'); expect(saved).not.toHaveBeenCalled(); expect(habitsApi.create).toHaveBeenCalledTimes(2);
  });
  it('preserves later immutable edits until the saved timezone/start are explicitly accepted', async () => {
    vi.mocked(habitsApi.create).mockRejectedValueOnce(new Error('Response lost')); await render(); await click(button('Create my own habit')); await type('Habit name', 'New routine'); await type('Timezone', 'UTC'); await click(button('Create habit'));
    const start = field('Start date').value; await type('Timezone', 'Asia/Kolkata'); await type('Start date', '2026-10-16'); await click(button('Check earlier save')); expect(field('Timezone').value).toBe('Asia/Kolkata'); expect(field('Start date').value).toBe('2026-10-16'); await click(button('Save changes')); expect(habitsApi.edit).not.toHaveBeenCalled();
    await click(button('Use saved timezone and start date')); expect(field('Timezone').value).toBe('UTC'); expect(field('Start date').value).toBe(start); await click(button('Save changes')); expect(saved).toHaveBeenCalledTimes(1);
  });
  it('allows correcting definitive validation rejection without resending invalid input', async () => {
    vi.mocked(habitsApi.create).mockRejectedValueOnce(new HabitApiError('Invalid name', 400)); await render(); await click(button('Create my own habit')); await type('Habit name', 'Rejected'); await click(button('Create habit')); await type('Habit name', 'Corrected'); await click(button('Create habit')); expect(vi.mocked(habitsApi.create).mock.calls[1][0].name).toBe('Corrected'); expect(saved).toHaveBeenCalledTimes(1);
  });
  it('ignores pending save completion after a new habit identity replaces the editor', async () => {
    const pending = deferred<Habit>(); vi.mocked(habitsApi.edit).mockReturnValueOnce(pending.promise); await render(habit()); await type('Habit name', 'Old draft'); await click(button('Save changes')); await render(habit({ id: 'habit-b', name: 'Other habit' })); await act(async () => pending.resolve(habit())); expect(saved).not.toHaveBeenCalled(); expect(field('Habit name').value).toBe('Other habit');
  });
  it('ignores create completion after account workspace unmount', async () => {
    const pending = deferred<Habit>(); vi.mocked(habitsApi.create).mockReturnValueOnce(pending.promise); await render(); await click(button('Create my own habit')); await type('Habit name', 'Old account'); await click(button('Create habit')); await act(async () => root.render(<div>New account</div>)); await act(async () => pending.resolve(habit())); expect(saved).not.toHaveBeenCalled(); expect(recovered).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled();
  });
});

describe('Check-in mutation safety', () => {
  it('confirms clearing saved progress/notes and retains the draft on failure', async () => {
    await render(habit(), true); await type('A note for yourself (optional)', 'Unsent note'); await click(button('Clear check-in')); await click(button('Keep editing')); expect(record).not.toHaveBeenCalled();
    record.mockRejectedValueOnce(new Error('Clear failed')); await click(button('Clear check-in')); await click(button('Clear saved check-in')); expect(record).toHaveBeenLastCalledWith({ value: 0, status: 'NONE', note: '', mood: null }, habit()); expect(closed).not.toHaveBeenCalled(); expect(field('A note for yourself (optional)').value).toBe('Unsent note'); await click(button('Clear check-in')); await click(button('Clear saved check-in')); expect(closed).toHaveBeenCalledTimes(1);
  });
  it('freezes status/amount/note/mood and immediately locks duplicate submission', async () => {
    const pending = deferred<void>(); record.mockReturnValueOnce(pending.promise); await render(habit(), true); await type('A note for yourself (optional)', 'Before save'); await click(button('Great')); await submitTwice(); expect(record).toHaveBeenCalledTimes(1); expect(record.mock.calls[0][0]).toEqual({ value: 1, status: 'RECORDED', note: 'Before save', mood: 5 });
    expect([...document.querySelectorAll<HTMLElement>('.habit-form-dialog input,.habit-form-dialog textarea,.habit-form-dialog button')].every(control => control.matches(':disabled'))).toBe(true); await type('A note for yourself (optional)', 'Blocked'); await escape(); expect(closed).not.toHaveBeenCalled(); await act(async () => pending.reject(new Error('Save failed'))); expect(field('A note for yourself (optional)').value).toBe('Before save'); expect(button('Great').getAttribute('aria-pressed')).toBe('true'); await click(button('Save check-in')); expect(closed).toHaveBeenCalledTimes(1);
  });
  it('keeps the draft open when the parent rejects a skipped submission while busy', async () => {
    record.mockRejectedValueOnce(new Error('Another change is still saving. Try again.')); await render(habit(), true); await type('A note for yourself (optional)', 'Do not lose this'); await click(button('Save check-in')); expect(closed).not.toHaveBeenCalled(); expect(field('A note for yourself (optional)').value).toBe('Do not lose this'); expect(document.querySelector('[role=alert]')?.textContent).toContain('still saving');
  });
  it('reloads a conflict deliberately without remount and retries with the latest versions', async () => {
    record.mockRejectedValueOnce(new HabitApiError('Conflict', 409)); await render(habit(), true); await type('A note for yourself (optional)', 'Draft note'); await click(button('Save check-in')); await click(button('Reload check-in')); await click(button('Keep editing')); expect(reload).not.toHaveBeenCalled();
    reload.mockRejectedValueOnce(new Error('Reload failed')); await click(button('Reload check-in')); await click(button('Replace with latest')); expect(field('A note for yourself (optional)').value).toBe('Draft note');
    const fresh = habit({ version: 8 }); fresh.logs[0] = { ...fresh.logs[0], version: 7, note: 'Latest saved note' }; reload.mockResolvedValueOnce(fresh); const textarea = document.querySelector('textarea'); await click(button('Reload check-in')); await click(button('Replace with latest')); expect(document.querySelector('textarea')).toBe(textarea); expect(field('A note for yourself (optional)').value).toBe('Latest saved note'); expect(document.querySelector('[role=alert]')).toBeNull(); await type('A note for yourself (optional)', 'Reviewed'); await click(button('Save check-in')); expect(record.mock.calls[1][1].version).toBe(8); expect(record.mock.calls[1][1].logs[0].version).toBe(7);
  });
  it('ignores deferred completions after identity replacement and account unmount', async () => {
    const pending = deferred<void>(); record.mockReturnValueOnce(pending.promise); await render(habit(), true); await click(button('Save check-in')); await render(habit({ id: 'habit-b', name: 'New habit' }), true); await act(async () => pending.resolve()); expect(closed).not.toHaveBeenCalled(); expect(document.body.textContent).toContain('New habit');
    const second = deferred<void>(); record.mockReturnValueOnce(second.promise); await click(button('Save check-in')); await act(async () => root.render(<div>Account replaced</div>)); await act(async () => second.reject(new Error('Old failure'))); expect(closed).not.toHaveBeenCalled(); expect(document.querySelector('[role=alert]')).toBeNull();
  });
});

function NestedHarness({ replaceOpener = false }: { replaceOpener?: boolean }) {
  const [drawer, setDrawer] = useState(false), [editor, setEditor] = useState(false), trigger = useRef<HTMLButtonElement>(null);
  return <BaseDialog.Root open={drawer} onOpenChange={setDrawer}><div className="habits-main"><button ref={trigger} onClick={() => setDrawer(true)}>Open details</button></div>{drawer && <BaseDialog.Portal><BaseDialog.Backdrop /><BaseDialog.Popup className="habit-detail" aria-label="Habit details" finalFocus={trigger}><button key={replaceOpener ? 'new' : 'old'} onClick={() => setEditor(true)}>{replaceOpener ? 'Replacement opener' : 'Edit habit'}</button></BaseDialog.Popup></BaseDialog.Portal>}{editor && <HabitForm habit={habit()} onClose={() => setEditor(false)} onSaved={saved} />}</BaseDialog.Root>;
}
it('Escape closes only the top select, discard confirmation or form inside a mobile drawer', async () => {
  await act(async () => root.render(<NestedHarness />)); await click(button('Open details')); await click(button('Edit habit')); await click(document.querySelector<HTMLElement>('[aria-label="Habit schedule"]')!); await escape(); expect(document.querySelector('[aria-label="Habit schedule"]')!.getAttribute('aria-expanded')).toBe('false'); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
  await type('Habit name', 'Nested draft'); await escape(); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(3); await escape(); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2); expect(field('Habit name').value).toBe('Nested draft'); await escape(); await click(button('Discard changes')); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1); expect(document.activeElement).toBe(button('Edit habit')); await escape(); expect(document.querySelector('[role=dialog]')).toBeNull(); expect(document.activeElement).toBe(button('Open details'));
});
it('returns to the active parent drawer when a responsive change replaces its opener', async () => {
  await act(async () => root.render(<NestedHarness />)); await click(button('Open details')); await click(button('Edit habit')); await act(async () => root.render(<NestedHarness replaceOpener />)); await click(button('Cancel')); expect(document.activeElement).toBe(button('Replacement opener')); expect(document.activeElement).not.toBe(button('Open details'));
});

it.each([false, true])('ignores a deferred conflict reload after replacing the editor identity (check-in: %s)', async log => {
  const pending = deferred<Habit>();
  if (log) { record.mockRejectedValueOnce(new HabitApiError('Conflict', 409)); reload.mockReturnValueOnce(pending.promise); }
  else { vi.mocked(habitsApi.edit).mockRejectedValueOnce(new HabitApiError('Conflict', 409)); vi.mocked(habitsApi.get).mockReturnValueOnce(pending.promise); }
  await render(habit(), log); await click(button(log ? 'Save check-in' : 'Save changes')); await click(button(log ? 'Reload check-in' : 'Reload latest habit')); await click(button('Replace with latest'));
  expect([...document.querySelectorAll<HTMLElement>('.habit-form-dialog input,.habit-form-dialog textarea,.habit-form-dialog button')].every(control => control.matches(':disabled'))).toBe(true);
  const other = habit({ id: 'other-habit', name: 'Other habit' }); other.logs[0] = { ...other.logs[0], note: 'Other note' };
  await render(other, log); await act(async () => pending.resolve(habit({ name: 'Stale response' })));
  expect(field(log ? 'A note for yourself (optional)' : 'Habit name').value).toBe(log ? 'Other note' : 'Other habit');
  expect(closed).not.toHaveBeenCalled(); expect(document.querySelector('[role=alert]')).toBeNull();
});
