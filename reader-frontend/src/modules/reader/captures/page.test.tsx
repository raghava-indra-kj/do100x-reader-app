// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from './api';

const fixture = vi.hoisted(() => ({ load: vi.fn(), discard: vi.fn(), auth: null as any }));
vi.mock('./api', () => ({ loadCaptures: fixture.load, discardCapture: fixture.discard }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/ui/components/appbar/appbar-layout', () => ({ AppBarLayout: () => null }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
vi.mock('./keep-dialog', () => ({ KeepCaptureDialog: () => null }));
import CapturesPage from './page';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
let items: CaptureItem[];
const capture = (id: string, hours = 24, source: string | null = 'https://www.example.com/article'): CaptureItem => ({ id, title: `Capture ${id}`, captureExpiresAt: new Date(Date.now() + hours * 3_600_000), createdAt: new Date(), captureSourceUrl: source });
const deferred = <T,>() => { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const response = (items: CaptureItem[]) => ({ items, lifetimeDays: 7, limit: 100 });
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.getAttribute('aria-label') === label || element.textContent === label)!;
const search = () => document.querySelector<HTMLInputElement>('[aria-label="Search temporary captures"]')!;
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); };
const click = async (element: HTMLElement) => { await act(async () => { element.focus(); element.click(); }); await settle(); };
const render = async () => { await act(async () => root.render(<MemoryRouter><CapturesPage /></MemoryRouter>)); await settle(); };
async function query(value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search(), value); search().dispatchEvent(new Event('input', { bubbles: true })); }); }

beforeEach(() => {
    vi.clearAllMocks();
    fixture.auth = observable({ currentUser: { id: 'user-a' } });
    items = [capture('later', 96), capture('soon', 2), capture('pasted', 48, null)];
    fixture.load.mockImplementation(async () => response(items)); fixture.discard.mockResolvedValue(undefined);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.matchMedia ??= vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList);
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('temporary inbox lifecycle', () => {
    it('renders expiry order, safe source labels and exact accessible dates', async () => {
        items.push(capture('broken-source', 12, 'not a URL'));
        await render();
        expect([...document.querySelectorAll('.capture-card h2')].map(node => node.textContent)).toEqual(['Capture soon', 'Capture broken-source', 'Capture pasted', 'Capture later']);
        expect(document.querySelector('.capture-card')!.textContent).toContain('example.com');
        expect(document.body.textContent).toContain('Pasted content'); expect(document.body.textContent).toContain('Source unavailable');
        const time = document.querySelector('time')!;
        expect(time.getAttribute('aria-label')).toMatch(/^Expires /); expect(time.getAttribute('datetime')).toBe(items[1].captureExpiresAt.toISOString());
        expect(time.hasAttribute('title')).toBe(false);
    });
    it('distinguishes search misses from expired or empty inboxes', async () => {
        await render(); await query('missing');
        expect(document.body.textContent).toContain('No matching captures');
        await click(button('Clear search')); expect(document.querySelectorAll('.capture-card')).toHaveLength(3);
        items = [capture('expired', -1)]; await click(button('Refresh captures'));
        expect(document.body.textContent).toContain('No active captures'); expect(button('Clear search')).toBeUndefined();
        items = []; await click(button('Refresh captures'));
        expect(document.body.textContent).toContain('Your inbox is empty');
    });
    it('names the discard dialog and keeps a failed discard local to the chosen capture', async () => {
        await render(); await click(button('Discard Capture soon'));
        const dialog = document.querySelector('[role="dialog"]')!;
        expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Discard this capture?');
        expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toContain('attached notes and quizzes');
        fixture.discard.mockRejectedValueOnce(new Error('Offline'));
        await click(button('Discard capture'));
        expect(dialog.querySelector('[role=alert]')?.textContent).toContain('Couldn’t discard this capture');
        expect(document.querySelector('.capture-content [role=alert]')).toBeNull();
        expect(dialog.textContent).toContain('Capture soon'); expect(button('Discard capture').disabled).toBe(false);
        await click(button('Cancel')); expect(document.activeElement).toBe(button('Discard Capture soon'));
        await click(button('Discard Capture later'));
        expect(document.querySelector('[role=dialog] [role=alert]')).toBeNull();
        expect(document.querySelector('[role=dialog]')!.textContent).toContain('Capture later');
    });
    it('submits one snapshotted ID and keeps deletion success separate from refresh failure', async () => {
        const pending = deferred<void>(); fixture.discard.mockReturnValueOnce(pending.promise);
        await render(); await click(button('Discard Capture soon'));
        await act(async () => { button('Discard capture').click(); button('Discard capture').click(); });
        expect(fixture.discard).toHaveBeenCalledExactlyOnceWith('soon'); expect(button('Cancel').disabled).toBe(true);
        await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        expect(document.querySelector('[role=dialog]')).not.toBeNull();
        fixture.load.mockRejectedValueOnce(new Error('Refresh failed'));
        await act(async () => pending.resolve()); await settle();
        expect(document.querySelector('[role=dialog]')).toBeNull();
        expect(document.querySelector('.capture-list')!.textContent).not.toContain('Capture soon');
        expect(document.querySelector('.capture-content [role=alert]')?.textContent).toContain('Couldn’t load temporary captures');
        expect(document.activeElement?.textContent).toBe('Capture pasted');
    });
    it('returns focus to search when discarding the final capture', async () => {
        items = [capture('only')]; await render(); await click(button('Discard Capture only'));
        const pending = deferred<void>(); fixture.discard.mockReturnValueOnce(pending.promise);
        await click(button('Discard capture')); items = [];
        await act(async () => pending.resolve()); await settle();
        expect(document.activeElement).toBe(search()); expect(document.body.textContent).toContain('Your inbox is empty');
    });
    it('ignores old account loads and clears that account’s search', async () => {
        const pending = deferred<ReturnType<typeof response>>(); fixture.load.mockReturnValueOnce(pending.promise);
        await render(); await query('private filter');
        items = [capture('user-b')];
        await act(async () => runInAction(() => { fixture.auth.currentUser = { id: 'user-b' }; })); await settle();
        expect(search().value).toBe(''); expect(document.body.textContent).toContain('Capture user-b');
        await act(async () => pending.resolve(response([capture('user-a')])));
        expect(document.body.textContent).not.toContain('Capture user-a');
    });
    it('ignores a discard completion after account change without refreshing the new account', async () => {
        const pending = deferred<void>(); fixture.discard.mockReturnValueOnce(pending.promise);
        await render(); await click(button('Discard Capture soon')); await click(button('Discard capture'));
        items = [capture('user-b')];
        await act(async () => runInAction(() => { fixture.auth.currentUser = { id: 'user-b' }; })); await settle();
        const loads = fixture.load.mock.calls.length;
        await act(async () => pending.resolve());
        expect(fixture.load).toHaveBeenCalledTimes(loads); expect(document.body.textContent).toContain('Capture user-b');
        expect(document.querySelector('[role=dialog]')).toBeNull();
    });
    it('ignores stale focus refreshes and late mutations after leaving the inbox', async () => {
        await render();
        const older = deferred<ReturnType<typeof response>>(); fixture.load.mockReturnValueOnce(older.promise);
        await act(async () => window.dispatchEvent(new Event('focus')));
        items = [capture('newer')]; await act(async () => window.dispatchEvent(new Event('focus')));
        await act(async () => older.resolve(response([capture('stale')])));
        expect(document.body.textContent).toContain('Capture newer'); expect(document.body.textContent).not.toContain('Capture stale');
        const pending = deferred<void>(); fixture.discard.mockReturnValueOnce(pending.promise);
        await click(button('Discard Capture newer')); await click(button('Discard capture'));
        await act(async () => root.render(<div>Another page</div>)); const loads = fixture.load.mock.calls.length;
        await act(async () => pending.reject(new Error('Late failure')));
        expect(document.body.textContent).toBe('Another page'); expect(fixture.load).toHaveBeenCalledTimes(loads);
    });
});
