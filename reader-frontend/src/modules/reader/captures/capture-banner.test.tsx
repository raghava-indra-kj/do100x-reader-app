// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ store: null as any }));
vi.mock('@modules/page/store', () => ({ usePageStore: () => fixture.store }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
vi.mock('./keep-dialog', () => ({ KeepCaptureDialog: ({ open }: { open: boolean }) => open ? <div>Keep dialog</div> : null }));
import { CaptureBanner } from './capture-banner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
const render = async () => { await act(async () => root.render(<MemoryRouter><CaptureBanner /></MemoryRouter>)); };
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    fixture.store = observable({ isOwner: true, optCurrentPage: { id: 'capture', captureExpiresAt: new Date(Date.now() + 2 * 3_600_000), captureSourceUrl: 'https://example.com/article' }, loadPage: vi.fn() }, { loadPage: false });
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); });

describe('temporary capture reading banner', () => {
    it('keeps short expiry, named source/inbox actions and Keep without the repeated paragraph', async () => {
        await render();
        const banner = document.querySelector('aside')!;
        expect(banner.textContent).toContain('2 hours left'); expect(banner.textContent).not.toContain('notes and quizzes');
        expect(banner.querySelector('time')!.getAttribute('aria-label')).toMatch(/^Expires /);
        const source = banner.querySelector<HTMLAnchorElement>('[aria-label="Open original source"]')!;
        expect(source.href).toBe('https://example.com/article'); expect(source.target).toBe('_blank'); expect(source.rel).toBe('noopener noreferrer');
        expect(banner.querySelector('[aria-label="Temporary inbox"]')!.getAttribute('href')).toBe('/reader/captures');
        await act(async () => banner.querySelector<HTMLButtonElement>('[aria-label="Keep in my pages"]')!.click());
        expect(banner.textContent).toContain('Keep dialog');
    });
    it('reloads at expiration and on focus, then removes both timers on unmount', async () => {
        await render();
        await act(async () => vi.advanceTimersByTime(3_600_000));
        expect(document.querySelector('time')!.textContent).toBe('1 hour left'); expect(fixture.store.loadPage).not.toHaveBeenCalled();
        await act(async () => vi.advanceTimersByTime(3_600_050)); expect(fixture.store.loadPage).toHaveBeenCalledOnce();
        await act(async () => window.dispatchEvent(new Event('focus'))); expect(fixture.store.loadPage).toHaveBeenCalledTimes(2);
        await act(async () => root.render(<div>Other page</div>));
        expect(vi.getTimerCount()).toBe(0);
        window.dispatchEvent(new Event('focus')); expect(fixture.store.loadPage).toHaveBeenCalledTimes(2);
    });
    it('omits unsafe source links and does not show capture controls to another reader', async () => {
        fixture.store.optCurrentPage.captureSourceUrl = 'javascript:alert(1)'; await render();
        expect(document.querySelector('[aria-label="Open original source"]')).toBeNull();
        await act(async () => runInAction(() => { fixture.store.isOwner = false; }));
        expect(document.querySelector('aside')).toBeNull();
    });
});
