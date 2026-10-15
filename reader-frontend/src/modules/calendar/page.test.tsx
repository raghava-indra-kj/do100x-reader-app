// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { calendarApi, type CalendarTask } from './api';
import { defaultPreferences } from './model';

vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ currentUser: { id: 'test-user' } }) }));
vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>Calendar app</header> }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@modules/habits/log-form', () => ({ LogForm: () => null }));
vi.mock('./reminders', () => ({ useCalendarReminders: () => ({ enabled: false, toggle: vi.fn() }) }));
vi.mock('./views', () => ({ TimeGrid: () => <div>Time grid</div>, MonthView: () => null, YearView: () => null, AgendaView: () => null, beginDrag: vi.fn() }));
import CalendarPage from './page';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
let media: Map<string, { matches: boolean; listeners: Set<() => void> }>;
const task: CalendarTask = { id: 'task-a', title: 'Review the monthly budget', description: null, status: 'todo', priority: 2, listId: null, parentId: null, dueDate: null, dueTime: null, version: 1 };
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  media = new Map();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    let entry = media.get(query);
    if (!entry) { entry = { matches: false, listeners: new Set() }; media.set(query, entry); }
    return { get matches() { return entry!.matches; }, media: query, addEventListener: (_: string, fn: () => void) => entry!.listeners.add(fn), removeEventListener: (_: string, fn: () => void) => entry!.listeners.delete(fn) };
  }));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
  const preferences = defaultPreferences('UTC');
  vi.spyOn(calendarApi, 'preferences').mockResolvedValue({ preferences, version: 1 });
  vi.spyOn(calendarApi, 'range').mockImplementation(async (from, to, timeZone) => ({ from, to, timeZone, events: [], occurrences: [], tasks: [], lists: [], habits: [], focus: [], preferences, version: 1 }));
  vi.spyOn(calendarApi, 'tasks').mockResolvedValue({ items: [task], nextCursor: null });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function settle(ms = 30) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }
function button(label: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label)!; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(); }
async function resize(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  await act(async () => { for (const [query, entry] of media) {
    const match = /max-width:\s*(\d+)px/.exec(query); const matches = match ? width <= Number(match[1]) : false;
    if (matches !== entry.matches) { entry.matches = matches; for (const listener of entry.listeners) listener(); }
  } }); await settle();
}

it('keeps an existing desktop editor accessible when crossing900px, without opening a modal drawer above it', async () => {
  await act(async () => root.render(<MemoryRouter><CalendarPage /></MemoryRouter>)); await settle(230);
  expect(document.querySelector('aside.calendar-sidebar')).not.toBeNull();
  await click(button('Schedule Review the monthly budget'));
  const notes = document.querySelector<HTMLTextAreaElement>('textarea')!;
  await act(async () => { notes.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(notes, 'Notes must survive the resize'); notes.dispatchEvent(new Event('input', { bubbles: true })); });
  // The original failure occurred at the planning breakpoint, above the separate
  // compact-toolbar breakpoint. Do not repair focus manually after resizing.
  await resize(850);
  expect(document.querySelector('.calendar-planning-dialog')).toBeNull();
  expect(document.querySelector('aside.calendar-sidebar')).toBeNull();
  expect(document.querySelector('.calendar-event-dialog')!.getAttribute('aria-labelledby')).toBeTruthy();
  expect(notes.closest('[aria-hidden=true],[inert]')).toBeNull(); expect(document.activeElement).toBe(notes);
  expect(notes.value).toBe('Notes must survive the resize');
  await resize(390); expect(notes.closest('[aria-hidden=true],[inert]')).toBeNull(); expect(document.activeElement).toBe(notes);
  await act(async () => notes.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await settle();
  await click(button('Keep editing')); expect(notes.value).toBe('Notes must survive the resize');
  await click(button('Cancel')); await click(button('Discard changes'));
  expect(document.querySelector('[role=dialog]')).toBeNull(); expect(document.activeElement).toBe(button('Show planning sidebar'));
  await click(button('Show planning sidebar')); expect(document.querySelector('.calendar-planning-dialog')).not.toBeNull();
  expect(document.querySelector('.calendar-planning-dialog')!.contains(document.activeElement)).toBe(true);
});
