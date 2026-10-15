// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expandSchedule, type CalendarEvent } from '@reader/calendar-core';
import { calendarApi, CalendarApiError, type EventDraft } from './api';
import { EventForm, type EventEditor } from './event-form';
import { CalendarDialog, CalendarPlanningPanel, CalendarPlanningRoot, CalendarSelect } from './ui';

// Keep the actual Dialog and Select primitives, including their dismissal and
// focus behavior. Tooltips are unrelated to these interactions.
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => children }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const draft = (patch: Partial<EventDraft> = {}): EventDraft => ({ title: 'Reading time', description: '', location: '', color: 'blue', start: '2026-10-15T09:00', end: '2026-10-15T09:30', timeZone: 'UTC', allDay: false, taskId: null, habitId: null, repeat: null, reminders: [], ...patch });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
const saved = vi.fn(), closed = vi.fn();
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia ??= vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  // jsdom has no layout; make visible form controls eligible for focus trapping.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden || this.style.display === 'none' ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  vi.spyOn(calendarApi, 'create').mockResolvedValue({} as CalendarEvent);
  vi.spyOn(calendarApi, 'edit').mockResolvedValue({} as CalendarEvent);
  vi.spyOn(calendarApi, 'occurrence').mockResolvedValue({} as CalendarEvent);
  saved.mockReset(); closed.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function Location() { return <output data-location>{useLocation().pathname + useLocation().search}</output>; }
function EditorHarness({ editor }: { editor: EventEditor }) {
  const [open, setOpen] = useState(true);
  return <><Location />{open && <EventForm editor={editor} lists={[]} onClose={() => { closed(); setOpen(false); }} onSaved={saved} />}</>;
}
async function render(editor: EventEditor = { draft: draft() }) { await act(async () => root.render(<MemoryRouter><EditorHarness editor={editor} /></MemoryRouter>)); await settle(); }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); }
function button(label: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label)!; }
function field(label: string) { const wrapper = [...document.querySelectorAll('label')].find(labelElement => labelElement.querySelector('span')?.textContent === label)!; return wrapper.querySelector<HTMLInputElement | HTMLTextAreaElement>('input,textarea')!; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function type(label: string, value: string) {
  const input = field(label);
  await act(async () => {
    input.focus(); Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function escape() { await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await settle(); }
async function backdrop() {
  const popup = document.querySelector('.calendar-event-dialog')!;
  const background = popup.parentElement!.querySelector<HTMLElement>('.fixed.inset-0')!;
  await act(async () => { for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) background.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 })); }); await settle();
}
async function select(label: string, value: string) {
  await click(document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!);
  const option = [...document.querySelectorAll<HTMLElement>('[role=option]')].find(option => option.textContent === value)!;
  await act(async () => { option.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); option.click(); }); await settle();
}
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

describe('Calendar event draft safety', () => {
  it.each(['Escape', 'Cancel', 'Close dialog', 'backdrop'])('keeps a dirty new draft until explicit discard via %s', async closePath => {
    await render({ draft: draft({ taskId: 'task-a' }) }); await type('Notes', 'Remember my unsaved notes');
    const dismiss = () => closePath === 'Escape' ? escape() : closePath === 'backdrop' ? backdrop() : click(button(closePath));
    await dismiss();
    expect(closed).not.toHaveBeenCalled(); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
    expect(document.activeElement).toBe(button('Keep editing'));
    await click(button('Keep editing'));
    expect(field('Notes').value).toBe('Remember my unsaved notes'); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
    expect(document.querySelector('.calendar-event-dialog')!.contains(document.activeElement)).toBe(true);
    await dismiss(); await click(button('Discard changes'));
    expect(closed).toHaveBeenCalledTimes(1); expect(saved).not.toHaveBeenCalled(); expect(calendarApi.create).not.toHaveBeenCalled();
  });

  it('allows clean dismissal and does not treat typing then undoing as dirty', async () => {
    await render(); await type('Notes', 'A thought'); await type('Notes', ''); await escape();
    expect(closed).toHaveBeenCalledTimes(1); expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it.each(['taskId', 'habitId'] as const)('guards same-tab linked %s navigation without losing the draft on Keep editing', async key => {
    await render({ draft: draft({ [key]: 'linked-id' }) }); await type('Notes', 'Unsaved context');
    await click(document.querySelector('.calendar-related-link')!); expect(document.querySelector('[data-location]')!.textContent).toBe('/');
    await click(button('Keep editing')); expect(field('Notes').value).toBe('Unsaved context');
    await click(document.querySelector('.calendar-related-link')!); await click(button('Discard changes'));
    expect(document.querySelector('[data-location]')!.textContent).toBe(key === 'taskId' ? '/tasks?task=linked-id' : '/habits?habit=linked-id');
  });

  it('freezes every control and the submitted payload while pending, then restores the exact draft on failure', async () => {
    const pending = deferred<CalendarEvent>(); vi.mocked(calendarApi.create).mockReturnValueOnce(pending.promise);
    await render({ draft: draft({ taskId: 'task-a', repeat: { frequency: 'WEEKLY', interval: 1, weekdays: [4], monthlyMode: 'DATE', count: 5, until: null } }) });
    await type('Notes', 'Before save'); await type('Location', 'Library'); await click(button('Save event'));
    expect(calendarApi.create).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(calendarApi.create).mock.calls[0][0];
    expect(payload).toMatchObject({ description: 'Before save', location: 'Library', repeat: { count: 5 } });
    const controls = [...document.querySelectorAll<HTMLElement>('.calendar-event-form input,.calendar-event-form textarea,.calendar-event-form button')];
    expect(controls.length).toBeGreaterThan(15); expect(controls.every(control => control.matches(':disabled'))).toBe(true);
    expect(document.querySelector('.calendar-related-link')!.getAttribute('aria-disabled')).toBe('true');
    await type('Notes', 'Attempt while saving'); await escape(); await click(button('Cancel'));
    expect(payload.description).toBe('Before save'); expect(closed).not.toHaveBeenCalled();
    await act(async () => pending.reject(new Error('Connection failed')));
    expect(field('Notes').value).toBe('Before save'); expect(field('Location').value).toBe('Library'); expect(field('Notes').disabled).toBe(false);
    expect(document.querySelector('[role=alert]')!.textContent).toContain('Connection failed'); expect(document.activeElement).toBe(document.querySelector('[role=alert]'));
    await click(button('Save event')); expect(saved).toHaveBeenCalledTimes(1); expect(closed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(calendarApi.create).mock.calls[1][1]).toBe(vi.mocked(calendarApi.create).mock.calls[0][1]);
  });

  it('keeps existing-event edits after a version conflict and still requires deliberate discard', async () => {
    const event = { ...draft(), id: 'event-a', exceptions: [], createdAt: '', updatedAt: '', version: 1 } satisfies CalendarEvent;
    vi.mocked(calendarApi.edit).mockRejectedValueOnce(new CalendarApiError('Event changed elsewhere.', 409));
    await render({ event, draft: event }); await type('Notes', 'Important revision'); await click(button('Save event'));
    expect(field('Notes').value).toBe('Important revision'); expect(closed).not.toHaveBeenCalled();
    expect(document.querySelector('[role=alert]')!.textContent).toContain('Your edits are still here');
    await click(button('Cancel')); await click(button('Keep editing')); expect(field('Notes').value).toBe('Important revision');
  });

  it('brings removal confirmation into focus from the fixed footer without losing pending edits', async () => {
    const event = { ...draft(), id: 'event-a', exceptions: [], createdAt: '', updatedAt: '', version: 1 } satisfies CalendarEvent;
    await render({ event, draft: event }); await type('Notes', 'Keep this draft'); await click(button('Remove'));
    expect(document.activeElement).toBe(button('Keep it'));
    expect(document.querySelector('.calendar-delete-confirm')!.textContent).toContain('Your unsaved edits will be discarded.');
    await click(button('Keep it')); expect(field('Notes').value).toBe('Keep this draft');
  });

  it('preserves compatible scope edits and confirms before discarding series-only edits', async () => {
    const event = { ...draft({ repeat: { frequency: 'DAILY', interval: 1, weekdays: [], monthlyMode: 'DATE', count: 10, until: null } }), id: 'event-a', exceptions: [], createdAt: '', updatedAt: '', version: 1 } satisfies CalendarEvent;
    const occurrence = expandSchedule(event, '2026-10-17T00:00:00Z', '2026-10-18T00:00:00Z')[0];
    await render({ event, occurrence, draft: { ...event, start: occurrence.start, end: occurrence.end } });
    await select('Apply changes to', 'Entire series'); await type('Notes', 'Preserve these series notes');
    await select('Apply changes to', 'This and following'); expect(field('Notes').value).toBe('Preserve these series notes');
    await select('Apply changes to', 'This occurrence'); expect(button('Discard series edits')).toBeDefined();
    await click(button('Keep editing')); expect(field('Notes').value).toBe('Preserve these series notes');
    await click(button('Save event'));
    expect(calendarApi.edit).toHaveBeenCalledWith(event, expect.objectContaining({ description: 'Preserve these series notes', repeat: expect.objectContaining({ count: 8 }) }), 'following', occurrence.date);
  });

  it('does not call old editor callbacks when an outstanding save finishes after unmount', async () => {
    const pending = deferred<CalendarEvent>(); vi.mocked(calendarApi.create).mockReturnValueOnce(pending.promise);
    await render(); await click(button('Save event'));
    await act(async () => root.render(<div>Different page</div>)); await act(async () => pending.resolve({} as CalendarEvent));
    expect(saved).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled();
  });

  it('does not move the series anchor when edited occurrence times cross scopes in either direction', async () => {
    const event = { ...draft({ start: '2026-10-01T09:00', end: '2026-10-01T09:30', repeat: { frequency: 'WEEKLY', interval: 1, weekdays: [4], monthlyMode: 'DATE', count: 6, until: null } }), id: 'event-a', exceptions: [], createdAt: '', updatedAt: '', version: 1 } satisfies CalendarEvent;
    const occurrence = expandSchedule(event, '2026-10-15T00:00:00Z', '2026-10-16T00:00:00Z')[0];
    await render({ event, occurrence, draft: { ...event, start: occurrence.start, end: occurrence.end } });
    await type('Starts', '2026-10-15T10:00'); await select('Apply changes to', 'Entire series');
    expect(button('Discard time edits')).toBeDefined(); await click(button('Keep editing')); expect(field('Starts').value).toBe('2026-10-15T10:00');
    await select('Apply changes to', 'Entire series'); await click(button('Discard time edits'));
    expect(field('Starts').value).toBe('2026-10-01T09:00'); expect(field('Ends').value).toBe('2026-10-01T09:30');
    await type('Starts', '2026-10-01T10:00'); await select('Apply changes to', 'This occurrence'); await click(button('Discard time edits'));
    expect(field('Starts').value).toBe('2026-10-15T09:00'); await click(button('Save occurrence'));
    expect(calendarApi.occurrence).toHaveBeenCalledWith(event, occurrence, { start: '2026-10-15T09:00', end: '2026-10-15T09:30', allDay: false });
  });
});

function DrawerHarness({ mobile = true }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false), [editor, setEditor] = useState(false), [other, setOther] = useState(false), trigger = useRef<HTMLButtonElement>(null);
  return <CalendarPlanningRoot open={open && mobile} onClose={() => setOpen(false)}>
    <div className="calendar-main"><button ref={trigger} onClick={() => setOpen(true)}>Planning opener</button><button>Background action</button></div>
    {open && <CalendarPlanningPanel mobile={mobile} returnFocus={trigger}><button onClick={() => setOpen(false)}>Hide planning</button><button onClick={() => setEditor(true)}>Schedule task</button><button onClick={() => setOther(true)}>Sources</button><CalendarSelect label="Filter list" value="all" items={{ all: 'All', inbox: 'Inbox' }} onChange={() => {}} /></CalendarPlanningPanel>}
    {editor && <EventForm editor={{ draft: draft({ taskId: 'task-a' }) }} lists={[]} onClose={() => setEditor(false)} onSaved={saved} />}
    {other && <CalendarDialog title="Sources and settings" onClose={() => setOther(false)}><button>Nested action</button></CalendarDialog>}
  </CalendarPlanningRoot>;
}
describe('Calendar planning drawer', () => {
  it('focuses and isolates the drawer, then restores focus to its stable opener', async () => {
    await act(async () => root.render(<MemoryRouter><DrawerHarness /></MemoryRouter>)); await click(button('Planning opener'));
    const drawer = document.querySelector('.calendar-planning-dialog')!;
    expect(drawer.getAttribute('role')).toBe('dialog'); expect(drawer.getAttribute('aria-modal')).toBe('true'); expect(drawer.contains(document.activeElement)).toBe(true);
    expect(button('Background action').closest('[aria-hidden=true],[inert]')).not.toBeNull();
    // A modal focus guard loops focus back into the popup rather than the app.
    const guards = [...document.querySelectorAll<HTMLElement>('[data-base-ui-focus-guard]')];
    expect(guards.length).toBeGreaterThanOrEqual(2);
    await act(async () => guards[guards.length - 1].focus()); await settle(); expect(drawer.contains(document.activeElement)).toBe(true);
    await escape(); expect(document.querySelector('.calendar-planning-dialog')).toBeNull(); expect(document.activeElement).toBe(button('Planning opener'));
  });

  it('closes only the top select, nested dialog or discard prompt before the drawer', async () => {
    await act(async () => root.render(<MemoryRouter><DrawerHarness /></MemoryRouter>)); await click(button('Planning opener'));
    await click(document.querySelector<HTMLElement>('[aria-label="Filter list"]')!); await escape();
    expect(document.querySelector('[aria-label="Filter list"]')!.getAttribute('aria-expanded')).toBe('false'); expect(document.querySelector('.calendar-planning-dialog')).not.toBeNull();
    await click(button('Sources')); await escape(); expect(document.querySelector('.calendar-dialog')).toBeNull(); expect(document.querySelector('.calendar-planning-dialog')).not.toBeNull(); expect(document.activeElement).toBe(button('Sources'));
    await click(button('Schedule task')); await type('Notes', 'Keep my mobile draft'); await escape();
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(3); expect(document.querySelector('.calendar-planning-dialog')).not.toBeNull();
    await escape(); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2); expect(field('Notes').value).toBe('Keep my mobile draft');
    await escape(); await click(button('Discard changes')); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1); expect(document.activeElement).toBe(button('Schedule task'));
    await escape(); expect(document.querySelector('[role=dialog]')).toBeNull(); expect(document.activeElement).toBe(button('Planning opener'));
  });

  it('keeps an editor draft and topmost Escape handling across desktop/mobile transitions', async () => {
    const renderAt = async (mobile: boolean) => { await act(async () => root.render(<MemoryRouter><DrawerHarness mobile={mobile} /></MemoryRouter>)); await settle(); };
    await renderAt(false); await click(button('Planning opener')); await click(button('Schedule task')); await type('Notes', 'Draft across resize');
    await renderAt(true); expect(field('Notes').value).toBe('Draft across resize');
    await click(field('Notes')); await escape();
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(3); await click(button('Keep editing'));
    await renderAt(false); expect(field('Notes').value).toBe('Draft across resize');
    await click(field('Notes')); await escape(); await click(button('Keep editing'));
    await renderAt(true); await click(field('Notes')); await escape(); await click(button('Discard changes'));
    expect(document.querySelector('.calendar-planning-dialog')).not.toBeNull();
    expect(document.querySelector('.calendar-planning-dialog')!.contains(document.activeElement)).toBe(true);
    await escape(); expect(document.activeElement).toBe(button('Planning opener'));
  });

  it('returns to an enabled calendar control when resizing removes the mobile opener', async () => {
    await act(async () => root.render(<MemoryRouter><DrawerHarness /></MemoryRouter>)); await click(button('Planning opener')); await click(button('Schedule task')); await type('Notes', 'Mobile draft');
    await act(async () => root.render(<MemoryRouter><DrawerHarness mobile={false} /></MemoryRouter>)); await settle();
    await click(button('Cancel')); await click(button('Discard changes'));
    expect(document.querySelector('[role=dialog]')).toBeNull(); expect(document.activeElement).toBe(button('Planning opener'));
  });
});
