// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ auth: null as unknown as { currentUser: { id: string } }, save: vi.fn(), navigate: vi.fn() }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/ui/components/appbar/appbar-layout', () => ({ AppBarLayout: () => <header>Reader</header> }));
vi.mock('react-router-dom', () => ({ useNavigate: () => fixture.navigate, Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
vi.mock('@boot/routes', () => ({ readerPageWithIdRouteValue: (id: string) => `/reader/pages/${id}` }));
vi.mock('@core/api/api-client', () => ({ getApiErrorMessage: (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback }));
vi.mock('./api', async importOriginal => ({ ...await importOriginal<typeof import('./api')>(), saveCapture: fixture.save }));
import CaptureImportPage from './import-page';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const captureKey = '11111111-1111-4111-8111-111111111111';
const payload = { captureKey, title: 'A reading selection', content: 'Keep this passage.', sourceUrl: 'https://example.com/article' };
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, post: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
    vi.useFakeTimers(); fixture.auth = observable({ currentUser: { id: 'account-a' } }); fixture.save.mockReset(); fixture.navigate.mockReset();
    window.location.hash = `capture=${captureKey}`;
    post = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; window.location.hash = ''; vi.restoreAllMocks(); vi.useRealTimers(); });
async function render() { await act(async () => root.render(<CaptureImportPage />)); }
async function send(type: string, origin = window.location.origin) { await act(async () => window.dispatchEvent(new MessageEvent('message', { source: window, origin, data: { type, captureKey, ...(type === 'do100x.capture.payload' ? { payload } : {}) } }))); }
async function account(id: string) { await act(async () => runInAction(() => { fixture.auth.currentUser = { id }; })); }
function messages(type: string) { return post.mock.calls.filter(call => (call[0] as { type?: string })?.type === type); }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (cause: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

it('saves once, acknowledges only a successful save, then navigates after the matching acknowledgement', async () => {
    const pending = deferred<{ id: string }>(); fixture.save.mockReturnValue(pending.promise);
    await render(); expect(messages('do100x.capture.request')).toHaveLength(1);
    await send('do100x.capture.payload'); await send('do100x.capture.payload');
    expect(fixture.save).toHaveBeenCalledTimes(1); expect(fixture.save).toHaveBeenCalledWith(payload); expect(messages('do100x.capture.saved')).toHaveLength(0);
    await act(async () => pending.resolve({ id: 'page-a' }));
    expect(messages('do100x.capture.saved')).toHaveLength(1); expect(fixture.navigate).not.toHaveBeenCalled();
    await send('do100x.capture.acknowledged', 'https://unrelated.example'); expect(fixture.navigate).not.toHaveBeenCalled();
    await send('do100x.capture.acknowledged'); expect(fixture.navigate).toHaveBeenCalledWith('/reader/pages/page-a', { replace: true });
});

it('does not acknowledge or navigate an old account save after identity replacement', async () => {
    const oldSave = deferred<{ id: string }>(), newSave = deferred<{ id: string }>(); fixture.save.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(newSave.promise);
    await render(); await send('do100x.capture.payload'); await account('account-b');
    expect(messages('do100x.capture.request')).toHaveLength(2);
    await act(async () => oldSave.resolve({ id: 'page-owned-by-a' }));
    expect(messages('do100x.capture.saved')).toHaveLength(0); expect(fixture.navigate).not.toHaveBeenCalled();
    await send('do100x.capture.payload'); expect(fixture.save).toHaveBeenCalledTimes(2);
    await act(async () => newSave.resolve({ id: 'page-owned-by-b' })); await send('do100x.capture.acknowledged');
    expect(fixture.navigate).toHaveBeenCalledExactlyOnceWith('/reader/pages/page-owned-by-b', { replace: true });
});

it('cancels the old acknowledgement wait and cannot navigate after an account changes during it', async () => {
    fixture.save.mockResolvedValue({ id: 'page-a' }); await render(); await send('do100x.capture.payload');
    expect(messages('do100x.capture.saved')).toHaveLength(1); expect(fixture.navigate).not.toHaveBeenCalled();
    await account('account-b'); await send('do100x.capture.acknowledged');
    await act(async () => vi.advanceTimersByTimeAsync(1600));
    expect(fixture.navigate).not.toHaveBeenCalled(); expect(fixture.save).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Receiving content from the extension');
});

it('keeps the same import session through a same-ID session refresh without another save or request', async () => {
    const pending = deferred<{ id: string }>(); fixture.save.mockReturnValue(pending.promise);
    await render(); await send('do100x.capture.payload'); await account('account-a'); await send('do100x.capture.payload');
    expect(messages('do100x.capture.request')).toHaveLength(1); expect(fixture.save).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ id: 'page-a' })); await send('do100x.capture.acknowledged');
    expect(fixture.navigate).toHaveBeenCalledExactlyOnceWith('/reader/pages/page-a', { replace: true });
});

it('ignores old failures after replacement and late successes after unmount', async () => {
    const oldSave = deferred<{ id: string }>(), newSave = deferred<{ id: string }>(); fixture.save.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(newSave.promise);
    await render(); await send('do100x.capture.payload'); await account('account-b');
    await act(async () => oldSave.reject(new Error('Account A request failed')));
    expect(document.querySelector('[role=alert]')).toBeNull();
    await send('do100x.capture.payload'); await act(async () => root.render(<div>Another screen</div>));
    await act(async () => newSave.resolve({ id: 'page-b' }));
    expect(messages('do100x.capture.saved')).toHaveLength(0); expect(fixture.navigate).not.toHaveBeenCalled();
});
