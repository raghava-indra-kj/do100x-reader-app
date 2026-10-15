// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Comment } from '@domain/comment/models/comment';

const fixture = vi.hoisted(() => ({ store: null as any, get: vi.fn(), edit: vi.fn(), remove: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../store', () => ({ usePageStore: () => fixture.store }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => ({ isAuthenticated: true }) }));
vi.mock('@domain/comment/services/comments-service', () => ({ getComments: fixture.get, editComment: fixture.edit, deleteComment: fixture.remove, deleteAllComments: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast/toast', () => ({ toast: { success: fixture.success, error: fixture.error } }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
vi.mock('@modules/core/ui/components/confirmation-dialog', () => ({ ConfirmationDialog: ({ open, onConfirm, onCancel, title, pending, error }: any) => open ? <div role="alertdialog" aria-label={title}><button disabled={pending} onClick={onConfirm}>Confirm deletion</button><button onClick={onCancel}>Cancel deletion</button>{error && <p role="alert">{error}</p>}</div> : null }));
import { PageComments } from './comments-panel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | null;
const note = new Comment({ id: 'comment', pageId: 'page', pageTitle: 'Page', sectionTitle: null, selectedText: 'Original passage', body: 'Original note', linkedPageId: null, isExplanation: false, createdAt: new Date(), updatedAt: new Date() });
beforeEach(() => {
    vi.clearAllMocks();
    fixture.store = { pageId: 'page', commentsVersion: 0, optCurrentPage: { contentVersion: 1 }, bumpCommentsVersion: vi.fn() };
    fixture.get.mockResolvedValue({ ok: true, data: [note] });
    fixture.edit.mockResolvedValue({ ok: true, data: 'comment' });
});
afterEach(async () => { await unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
async function mount() {
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root!.render(<MemoryRouter><PageComments /></MemoryRouter>));
}
async function unmount() { if (root) { await act(async () => root!.unmount()); root = null; } }
async function click(name: string) {
    const button = [...document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === name || el.textContent === name);
    expect(button, name).toBeTruthy(); await act(async () => button!.click());
}
async function fill(selector: string, value: string) {
    const input = document.querySelector(selector)! as HTMLTextAreaElement;
    await act(async () => {
        const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

it('keeps unsaved edits and expansion across sidebar unmounts, discards only explicitly, and isolates page stores', async () => {
    await mount(); await click('Expand all comments'); await click('Edit comment');
    await fill('textarea', 'My unsaved explanation');
    await unmount(); await mount();
    expect(document.querySelector('textarea')?.value).toBe('My unsaved explanation');
    await click('Discard edit'); await click('Edit comment');
    expect(document.querySelector('textarea')?.value).toBe('Original note');
    await fill('textarea', 'Draft belonging to the first account'); await unmount();
    fixture.store = { ...fixture.store }; await mount(); await click('Expand all comments'); await click('Edit comment');
    expect(document.querySelector('textarea')?.value).toBe('Original note');
});

it('retains a failed edit and permits retry after a thrown network error', async () => {
    await mount(); await click('Expand all comments'); await click('Edit comment');
    await fill('textarea', 'Keep this draft'); fixture.edit.mockRejectedValueOnce(new Error('Offline'));
    await click('Save');
    expect(document.querySelector('textarea')?.value).toBe('Keep this draft');
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Your draft is still here');
    await click('Save'); expect(fixture.edit).toHaveBeenLastCalledWith({ commentId: 'comment', body: 'Keep this draft' });
    expect(document.querySelector('textarea')).toBeNull();
});

it('keeps pending saves locked across remount and surfaces their eventual failure', async () => {
    let rejectSave!: (error: Error) => void;
    fixture.edit.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    await mount(); await click('Expand all comments'); await click('Edit comment');
    await fill('textarea', 'First draft'); await click('Save');
    await unmount(); await mount();
    expect(document.querySelector('textarea')?.value).toBe('First draft');
    expect(document.querySelector('textarea')?.disabled).toBe(true);
    expect([...document.querySelectorAll('button')].find(b => b.textContent === 'Saving…')?.disabled).toBe(true);
    expect(fixture.edit).toHaveBeenCalledTimes(1);
    await act(async () => rejectSave(new Error('Offline')));
    expect(document.querySelector('textarea')?.disabled).toBe(false);
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Your draft is still here');
    await fill('textarea', 'Second draft'); await click('Save');
    expect(fixture.edit).toHaveBeenLastCalledWith({ commentId: 'comment', body: 'Second draft' });
});

it('returns focus to the edit action on Escape and explicit discard', async () => {
    await mount(); await click('Expand all comments'); await click('Edit comment');
    await fill('textarea', 'Park this edit');
    await act(async () => document.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Resume comment edit');
    await click('Resume comment edit'); expect(document.querySelector('textarea')?.value).toBe('Park this edit');
    await click('Discard edit'); expect(document.activeElement?.getAttribute('aria-label')).toBe('Edit comment');
});

it('keeps History filtering and search so a parked edit stays discoverable', async () => {
    fixture.get.mockResolvedValue({ ok: true, data: [new Comment({ ...note, resolvedAt: new Date() })] });
    await mount(); await click('History'); await fill('input[aria-label="Find a comment"]', 'Original');
    await click('Expand all comments'); await click('Edit comment'); await fill('textarea', 'History draft');
    await unmount(); await mount();
    expect((document.querySelector('input[aria-label="Find a comment"]') as HTMLInputElement).value).toBe('Original');
    expect(document.querySelector('textarea')?.value).toBe('History draft');
});

it('requires confirmation before deleting, exposes failures, and keeps the comment', async () => {
    await mount(); await click('Expand all comments'); await click('Delete comment');
    expect(fixture.remove).not.toHaveBeenCalled(); expect(document.querySelector('[role=alertdialog]')).toBeTruthy();
    await click('Cancel deletion'); expect(fixture.remove).not.toHaveBeenCalled();
    await click('Delete comment'); fixture.remove.mockRejectedValueOnce(new Error('Offline')); await click('Confirm deletion');
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Couldn’t delete');
    expect(document.body.textContent).toContain('Original note');
});

it('labels page linking, keeps the entered ID after failure and does not rewrite the note body', async () => {
    await mount(); await click('Expand all comments'); await click('Link page');
    expect(document.querySelector('label[for="comment-link-comment"]')?.textContent).toBe('Link to a page ID');
    await fill('#comment-link-comment', 'destination-page');
    fixture.edit.mockResolvedValueOnce({ ok: false, error: new Error('Page not found') }); await click('Save link');
    expect(fixture.edit).toHaveBeenLastCalledWith({ commentId: 'comment', linkedPageId: 'destination-page' });
    expect(document.querySelector('[role=alert]')?.textContent).toBe('Page not found');
    expect((document.querySelector('#comment-link-comment') as HTMLInputElement).value).toBe('destination-page');
});

it('does not mark comments copied when the browser denies the write', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    await mount(); await click('Copy all comments');
    expect(fixture.success).not.toHaveBeenCalled(); expect(fixture.error).toHaveBeenCalled();
    expect(document.querySelector('button[aria-label="Copy all comments"]')).toBeTruthy();
    expect(document.querySelector('button[aria-label="Copied"]')).toBeNull();
});
