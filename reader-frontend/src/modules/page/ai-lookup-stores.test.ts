import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { PageStore } from './store';

const fixture = vi.hoisted(() => ({ config: vi.fn(), chat: vi.fn(), createPage: vi.fn() }));
vi.mock('@domain/settings/services/settings-service', () => ({ getModelConfig: fixture.config }));
vi.mock('@domain/chat/services/chat-service', () => ({ getChatCompletion: fixture.chat }));
vi.mock('@domain/page/services/pages-service', () => ({ createPage: fixture.createPage }));
vi.mock('@domain/comment/services/comments-service', () => ({ createComment: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { MeaningStore } from './meaning-store';
import { ExplanationStore } from './explanation-store';
import { DoubtStore } from './doubt-store';

const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const success = (response: string) => ({ ok: true, data: { response, rawResponse: { model: 'fixture' } } });
const page = () => ({ pageId: 'page-a', uiSettingsStore: { setSidebarPanel: vi.fn() }, bumpSubpagesVersion: vi.fn() }) as unknown as PageStore;

beforeEach(() => {
    fixture.config.mockReset().mockResolvedValue({ ok: true, data: { meaningModelId: 'm', explanationModelId: 'm', doubtModelId: 'm' } });
    fixture.chat.mockReset().mockResolvedValue(success('Original answer'));
    fixture.createPage.mockReset().mockResolvedValue({ ok: true, data: 'new-subpage' });
});

it('does not mark a replacement answer saved when an older answer save completes', async () => {
    const pageStore = page(); const store = new DoubtStore(pageStore);
    store.open('Question A', 'Original passage', 'Page A', 'Section A'); await tick();
    const entry = store.activeEntry!;
    const oldSave = deferred<any>(); fixture.createPage.mockReturnValueOnce(oldSave.promise);
    const savingOld = store.saveAsSubPage(entry.id);
    expect(entry.isSavingPage).toBe(true);
    fixture.chat.mockResolvedValueOnce(success('Replacement answer B'));
    store.reask(entry.id, 'Question B'); await tick();
    expect(entry.responseMarkdown).toBe('Replacement answer B');
    expect(entry.isSaved).toBe(false); expect(entry.isSavingPage).toBe(false);
    const newSave = deferred<any>(); fixture.createPage.mockReturnValueOnce(newSave.promise);
    const savingNew = store.saveAsSubPage(entry.id);
    oldSave.resolve({ ok: true, data: 'old-answer-subpage' }); await savingOld;
    expect(entry.isSaved).toBe(false); expect(entry.savedPageId).toBeNull();
    expect(entry.isSavingPage).toBe(true); // The newer save still owns this spinner.
    expect(fixture.createPage.mock.calls[0][0]).toEqual(expect.objectContaining({ parentPageId: 'page-a', title: 'Question: Question A', content: expect.stringContaining('Original answer') }));
    expect(fixture.createPage.mock.calls[1][0]).toEqual(expect.objectContaining({ title: 'Question: Question B', content: expect.stringContaining('Replacement answer B') }));
    newSave.resolve({ ok: true, data: 'new-answer-subpage' }); await savingNew;
    expect(entry.isSaved).toBe(true); expect(entry.savedPageId).toBe('new-answer-subpage');
    expect(entry.isSavingPage).toBe(false);
    expect(pageStore.bumpSubpagesVersion).toHaveBeenCalledTimes(2);
});

it('clears pending answer-save state on thrown errors and deduplicates a retried same-revision save', async () => {
    const store = new DoubtStore(page()); store.open('Question A', 'Source', 'Page', 'Section'); await tick();
    const entry = store.activeEntry!;
    fixture.createPage.mockRejectedValueOnce(new Error('Offline'));
    await store.saveAsSubPage(entry.id);
    expect(entry.isSavingPage).toBe(false); expect(entry.isSaved).toBe(false);
    expect(entry.responseMarkdown).toBe('Original answer');
    const request = deferred<any>(); fixture.createPage.mockReturnValueOnce(request.promise);
    const pending = store.saveAsSubPage(entry.id);
    await store.saveAsSubPage(entry.id);
    expect(fixture.createPage).toHaveBeenCalledTimes(2);
    request.resolve({ ok: true, data: 'saved-page' }); await pending;
    expect(entry.isSaved).toBe(true); expect(entry.savedPageId).toBe('saved-page');
    expect(entry.isSavingPage).toBe(false);
});

describe.each([
    ['meaning', () => { const s = new MeaningStore(page()); s.open('Original term', 'Page', 'Section A'); return s; }],
    ['explanation', () => { const s = new ExplanationStore(page()); s.open('Original passage', 'Page', 'Section A'); return s; }],
    ['question', () => { const s = new DoubtStore(page()); s.open('Original question', 'Source passage', 'Page', 'Section A'); return s; }],
] as const)('%s lookup requests', (_name, create) => {
    it('keeps the previous answer and original query through failed and cancelled replacement, committing only a successful answer', async () => {
        const store = create(); await tick();
        const entry = store.activeEntry!;
        const originalQuery = 'searchTerm' in entry ? entry.searchTerm : entry.selectedText;
        fixture.chat.mockResolvedValueOnce({ ok: false, error: new Error('Provider unavailable') });
        store.reask(entry.id, 'Replacement question'); await tick();
        expect(entry.responseMarkdown).toBe('Original answer');
        expect('searchTerm' in entry ? entry.searchTerm : entry.selectedText).toBe(originalQuery);
        expect(entry.pendingText).toBe('Replacement question');
        expect(entry.error).toBe('Provider unavailable');

        const cancelled = deferred<any>(); fixture.chat.mockReturnValueOnce(cancelled.promise);
        store.retry(entry.id); await tick(); store.cancel(entry.id);
        cancelled.resolve(success('Cancelled result')); await tick();
        expect(entry.responseMarkdown).toBe('Original answer');
        expect(entry.errorDetails?.errorType).toBe('CANCELLED');

        fixture.chat.mockResolvedValueOnce(success('Replacement answer'));
        store.retry(entry.id); await tick();
        expect(entry.responseMarkdown).toBe('Replacement answer');
        expect('searchTerm' in entry ? entry.searchTerm : entry.selectedText).toBe('Replacement question');
        expect(entry.pendingText).toBeUndefined();
        expect(entry.error).toBeNull();
    });

    it('ignores older requests and cancellation during settings lookup', async () => {
        const store = create(); await tick(); const entry = store.activeEntry!;
        const slow = deferred<any>(); fixture.chat.mockReturnValueOnce(slow.promise);
        store.reask(entry.id, 'Older edit'); await tick();
        fixture.chat.mockResolvedValueOnce(success('Newest answer'));
        store.reask(entry.id, 'Newest edit'); await tick();
        slow.resolve(success('Stale answer')); await tick();
        expect(entry.responseMarkdown).toBe('Newest answer');

        const config = deferred<any>(); fixture.config.mockReturnValueOnce(config.promise);
        const calls = fixture.chat.mock.calls.length;
        store.retry(entry.id); store.cancel(entry.id);
        config.resolve({ ok: true, data: { meaningModelId: 'm', explanationModelId: 'm', doubtModelId: 'm' } }); await tick();
        expect(fixture.chat).toHaveBeenCalledTimes(calls);
        expect(entry.responseMarkdown).toBe('Newest answer');
    });

    it('keeps answer on thrown transport errors and aborts work when its page is disposed', async () => {
        const store = create(); await tick(); const entry = store.activeEntry!;
        fixture.chat.mockRejectedValueOnce(new Error('Offline'));
        store.retry(entry.id); await tick();
        expect(entry.error).toBe('Offline'); expect(entry.responseMarkdown).toBe('Original answer');
        const request = deferred<any>(); fixture.chat.mockReturnValueOnce(request.promise);
        store.retry(entry.id); await tick();
        const signal = fixture.chat.mock.calls.at(-1)![0].signal;
        store.dispose(); expect(signal.aborted).toBe(true);
        request.resolve(success('Different account result')); await tick();
        expect(entry.responseMarkdown).toBe('Original answer');
    });

    it('keeps new draft separate from saved lookup history and deletes only the removed entry edit', async () => {
        const store = create(); await tick(); const entry = store.activeEntry!;
        runInAction(() => store.drafts.edit(entry.id, 'Unsent edit'));
        store.drafts.setText('Unsent new question', { pageId: 'page-a', pageTitle: 'Page', sectionId: 'a', sectionTitle: 'Section A', sectionMarkdown: 'Original source' });
        store.close(); store.toggleExpand();
        expect(store.drafts.text).toBe('Unsent new question');
        store.removeEntry(entry.id);
        expect(store.drafts.edits.has(entry.id)).toBe(false);
        expect(store.drafts.text).toBe('Unsent new question');
    });
});
