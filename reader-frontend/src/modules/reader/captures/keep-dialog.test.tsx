// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ search: vi.fn(), keep: vi.fn() }));
vi.mock('@domain/page/services/pages-service', () => ({ searchPages: fixture.search }));
vi.mock('./api', () => ({ keepCapture: fixture.keep }));
vi.mock('@core/api/api-client', () => ({ getApiErrorMessage: (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => children }));
import { KeepCaptureDialog } from './keep-dialog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const learning = { id: 'learning', title: 'Learning notes', ancestors: [{ title: 'Home' }, { title: 'Personal' }], pathIncomplete: false };
const mathematics = { id: 'math', title: 'Mathematics', ancestors: [{ title: 'Home' }, { title: 'Study' }], pathIncomplete: false };
const result = (items: typeof learning[]) => ({ ok: true, data: { items } });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const closed = vi.fn(), saved = vi.fn();
beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) { return this.hidden ? [] as unknown as DOMRectList : [new DOMRect(0, 0, 100, 30)] as unknown as DOMRectList; });
    fixture.search.mockReset().mockResolvedValue(result([learning, mathematics])); fixture.keep.mockReset().mockResolvedValue({ id: 'kept-a' }); closed.mockReset(); saved.mockReset();
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(pageId = 'capture-a', open = true, account = 'account-a') { await act(async () => root.render(<KeepCaptureDialog key={account} pageId={pageId} open={open} onClose={closed} onSaved={saved} />)); }
async function settle(ms = 230) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }
function button(label: string) { return [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === label || node.textContent === label)!; }
function search() { return document.querySelector<HTMLInputElement>('[aria-label="Find destination page"]')!; }
function radio(title: string) { return [...document.querySelectorAll('label')].find(label => label.textContent?.startsWith(title))!.querySelector<HTMLInputElement>('input')!; }
function selected() { return document.querySelector('[aria-label="Selected destination"]')!; }
async function click(element: HTMLElement) { await act(async () => { element.focus(); element.click(); }); await settle(25); }
async function query(value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search(), value); search().dispatchEvent(new Event('input', { bubbles: true })); }); }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (cause: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

it('has an accessible dialog name and keeps exact selected title/path outside filtered results', async () => {
    await render(); await settle();
    const dialog = document.querySelector('[role=dialog]')!;
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Keep in my pages');
    await click(radio('Learning notes'));
    fixture.search.mockResolvedValueOnce(result([mathematics])); await query('math'); await settle();
    expect(selected().textContent).toContain('Learning notes'); expect(selected().textContent).toContain('Home / Personal');
    expect(selected().closest('.capture-keep-body')).toBeNull();
    expect(document.querySelector('.capture-keep-destinations')!.textContent).not.toContain('Learning notes');
    await click(button('Keep page')); expect(fixture.keep).toHaveBeenCalledWith('capture-a', 'learning'); expect(saved).toHaveBeenCalledWith('kept-a');
});

it('retains selection through no results, rejected searches, retry and successful clearing of errors', async () => {
    await render(); await settle(); await click(radio('Learning notes'));
    fixture.search.mockResolvedValueOnce(result([])); await query('no match'); await settle();
    expect(document.querySelector('[role=status]')!.textContent).toContain('selected destination is unchanged');
    fixture.search.mockRejectedValueOnce(new Error('Search connection failed')); await query('retry me'); await settle();
    expect(document.querySelector('[role=alert]')!.textContent).toContain('Search connection failed'); expect(selected().textContent).toContain('Learning notes');
    fixture.search.mockResolvedValueOnce(result([mathematics])); await click(button('Retry search')); await settle();
    expect(document.querySelector('[role=alert]')).toBeNull(); expect(selected().textContent).toContain('Learning notes'); expect(radio('Mathematics').checked).toBe(false);
    await click(button('Keep page')); expect(fixture.keep).toHaveBeenCalledWith('capture-a', 'learning');
});

it('shows loading separately and ignores stale search responses after the query changes', async () => {
    const oldSearch = deferred<ReturnType<typeof result>>(), newSearch = deferred<ReturnType<typeof result>>();
    fixture.search.mockReturnValueOnce(oldSearch.promise).mockReturnValueOnce(newSearch.promise);
    await render(); await settle(); expect(document.querySelector('[role=status]')!.textContent).toBe('Finding pages…');
    await query('new'); await settle(); expect(fixture.search.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => newSearch.resolve(result([mathematics]))); await act(async () => oldSearch.resolve(result([learning])));
    expect(document.querySelector('.capture-keep-destinations')!.textContent).toContain('Mathematics'); expect(document.querySelector('.capture-keep-destinations')!.textContent).not.toContain('Learning notes');
});

it('keeps search failure and save failure independent and clears the corresponding error on success', async () => {
    fixture.search.mockResolvedValueOnce({ ok: false, error: { message: 'Search unavailable' } });
    fixture.keep.mockRejectedValueOnce(new Error('Keep permission denied'));
    await render(); await settle(); await click(button('Keep page'));
    expect(document.querySelector('.capture-keep-search-error')!.textContent).toContain('Search unavailable');
    expect(document.querySelector('.capture-keep-save-error')!.textContent).toContain('Keep permission denied');
    expect(document.activeElement).toBe(document.querySelector('.capture-keep-save-error'));
    fixture.search.mockResolvedValueOnce(result([learning])); await click(button('Retry search')); await settle();
    expect(document.querySelector('.capture-keep-search-error')).toBeNull(); expect(document.querySelector('.capture-keep-save-error')).not.toBeNull();
    await click(button('Keep page')); expect(document.querySelector('.capture-keep-save-error')).toBeNull(); expect(saved).toHaveBeenCalledTimes(1);
});

it('immediately locks duplicate saves and freezes search, target and dismissals until the exact request finishes', async () => {
    const pending = deferred<{ id: string }>(); fixture.keep.mockReturnValueOnce(pending.promise);
    await render(); await settle(); await click(radio('Learning notes'));
    await act(async () => { button('Keep page').click(); button('Keep page').click(); button('Cancel').click(); });
    expect(fixture.keep).toHaveBeenCalledTimes(1); expect(fixture.keep).toHaveBeenCalledWith('capture-a', 'learning'); expect(closed).not.toHaveBeenCalled();
    expect(search().disabled).toBe(true); expect([...document.querySelectorAll<HTMLInputElement>('input[type=radio]')].every(node => node.disabled)).toBe(true);
    await query('attempt while saving'); await click(radio('Mathematics'));
    await act(async () => document.querySelector('[role=dialog]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(selected().textContent).toContain('Learning notes'); expect(closed).not.toHaveBeenCalled();
    await act(async () => pending.reject(new Error('Keep failed')));
    expect(search().value).toBe(''); expect(search().disabled).toBe(false); expect(radio('Learning notes').checked).toBe(true);
    await click(button('Keep page')); expect(fixture.keep).toHaveBeenLastCalledWith('capture-a', 'learning');
});

it.each(['close', 'capture', 'account', 'unmount'] as const)('ignores an old deferred save after %s replaces its session', async replacement => {
    const pending = deferred<{ id: string }>(); fixture.keep.mockReturnValueOnce(pending.promise);
    await render(); await settle(); await click(radio('Learning notes')); await click(button('Keep page'));
    if (replacement === 'close') { await render('capture-a', false); await render(); }
    if (replacement === 'capture') await render('capture-b');
    if (replacement === 'account') await render('capture-a', true, 'account-b');
    if (replacement === 'unmount') await act(async () => root.render(<div>Another screen</div>));
    await act(async () => pending.resolve({ id: 'old-page' }));
    expect(saved).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled();
    if (replacement !== 'unmount') { expect(selected().textContent).toContain('My Reader home'); expect(button('Keep page').disabled).toBe(false); }
});

it('invalidates pending searches on explicit close and starts clean after reopening', async () => {
    const pending = deferred<ReturnType<typeof result>>(); fixture.search.mockReturnValueOnce(pending.promise);
    await render(); await settle(); await click(button('Cancel')); expect(closed).toHaveBeenCalledTimes(1);
    await render('capture-a', false); await render(); await settle();
    await act(async () => pending.resolve(result([{ ...learning, title: 'Stale result' }])));
    expect(document.body.textContent).not.toContain('Stale result'); expect(radio('Learning notes')).toBeDefined(); expect(selected().textContent).toContain('My Reader home');
});
