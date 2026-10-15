// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { runInAction } from 'mobx';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { PageStore } from '../store';

const fixture = vi.hoisted(() => ({ page: {} as any, start: vi.fn(), copy: vi.fn() }));
vi.mock('../store', () => ({ usePageStore: () => fixture.page }));
vi.mock('@modules/core/theme', () => ({ useThemeStore: () => ({ theme: { value: 'light' } }) }));
vi.mock('@lib/markdown-renderer', () => ({ MarkdownRenderer: ({ markdown }: any) => <div data-response>{markdown}</div> }));
vi.mock('@domain/settings/services/settings-service', () => ({ getModelConfig: vi.fn(async () => ({ ok: false })) }));
vi.mock('@domain/chat/services/chat-service', () => ({ getChatCompletion: vi.fn() }));
vi.mock('@domain/page/services/pages-service', () => ({ createPage: vi.fn() }));
vi.mock('./reader-clipboard', () => ({ copyReaderText: fixture.copy }));
vi.mock('./reader-action-button', () => ({ ReaderActionButton: ({ tooltip, children, ...props }: any) => <button aria-label={tooltip} {...props}>{children}</button> }));
vi.mock('@modules/core/ui/primitives/button', () => ({ Button: ({ size, variant, children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@modules/core/ui/primitives/select', () => ({ Select: ({ ariaLabel, value, onValueChange, items }: any) => <select aria-label={ariaLabel} value={value ?? ''} onChange={e => onValueChange(e.target.value)}>{Object.entries(items).map(([id, label]) => <option key={id} value={id}>{label as string}</option>)}</select> }));
import { DoubtStore } from '../doubt-store';
import { PageAiLookupPanel } from './ai-lookup-panel';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
let store: DoubtStore;
beforeEach(() => {
    fixture.page = { pageId: 'page-a', optCurrentPage: { title: 'Page A' }, currentSection: { id: 'section-a', title: 'Section A', fullMarkdown: 'Original source' }, uiSettingsStore: { fontSize: { value: {} }, fontFamilies: { value: {} }, setSidebarPanel: vi.fn() } };
    fixture.start.mockReset(); fixture.copy.mockReset().mockResolvedValue(true);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    store = new DoubtStore(fixture.page as PageStore);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; });
async function render(key = 'sidebar') {
    await act(async () => root.render(<MemoryRouter><PageAiLookupPanel key={key} title="Questions" storeInstance={store} queryLabel="Question" rephraseLabel="Edit your question" rephrasePlaceholder="Edit the question" emptyStateLabel="Ask about a passage" loadingLabel="Getting an answer" onStart={fixture.start} startLabel="Ask AI" startPlaceholder="Ask about this section" /></MemoryRouter>));
}
function button(label: string) { return [...host.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label || b.textContent === label)!; }
async function type(text: string) {
    const field = host.querySelector('textarea')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, text); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
function answered() {
    store.open('Original question', 'Original source', 'Page A', 'Section A');
    return store.activeEntry!;
}

it('preserves a new question and its original section across sidebar, focus, expanded and compact remounts', async () => {
    await render(); await type('How does this apply?');
    for (const surface of ['expanded', 'compact', 'focus-return', 'sidebar-return']) {
        fixture.page.currentSection = { id: 'section-b', title: 'Section B', fullMarkdown: 'Different source' };
        await render(surface);
        expect(host.querySelector('textarea')!.value).toBe('How does this apply?');
        expect(host.textContent).toContain('Section A · original section kept');
    }
    await act(async () => button('Ask AI').click());
    expect(fixture.start).toHaveBeenCalledWith('How does this apply?', expect.objectContaining({ pageId: 'page-a', sectionId: 'section-a', sectionMarkdown: 'Original source' }));
    expect(store.drafts.text).toBe('');
});

it('changes pinned context only through the explicit action and supports discarding a draft', async () => {
    await render(); await type('My question');
    fixture.page.currentSection = { id: 'b', title: 'Section B', fullMarkdown: 'New source' }; await render('mobile');
    await act(async () => button('Use current section').click());
    expect(store.drafts.context?.sectionMarkdown).toBe('New source');
    expect(store.drafts.text).toBe('My question');
    await act(async () => button('Discard draft').click());
    expect(store.drafts.text).toBe(''); expect(store.drafts.context).toBeNull();
});

it('keeps separate edited questions by entry across history switches and remounts', async () => {
    const first = answered(); await render(); await type('Unsent first edit');
    await act(async () => store.open('Second question', 'Second source', 'Page A', 'Section B'));
    const second = store.activeEntry!; await type('Unsent second edit');
    await act(async () => store.setActiveEntry(first.id)); await render('expanded');
    expect(host.querySelector('textarea')!.value).toBe('Unsent first edit');
    await act(async () => store.setActiveEntry(second.id));
    expect(host.querySelector('textarea')!.value).toBe('Unsent second edit');
});

it('restores focus to the expand/restore action without duplicating its editor', async () => {
    await render(); await type('Keep my draft');
    await act(async () => button('Expand to full width').click()); await render('expanded');
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    expect(document.activeElement).toBe(button('Restore sidebar'));
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await render('sidebar-restored');
    expect(document.activeElement).toBe(button('Expand to full width'));
    expect(host.querySelector('textarea')!.value).toBe('Keep my draft');
});

it('keeps a previous answer visible beside a replacement error and waits for JSON clipboard success', async () => {
    const entry = answered(); await render();
    await act(async () => runInAction(() => {
        entry.responseMarkdown = 'Earlier successful answer'; entry.pendingText = 'Replacement question';
        entry.error = 'Connection failed'; entry.errorDetails = { errorType: 'NETWORK_ERROR', message: 'Connection failed', rawError: { status: 503 } };
        entry.rawResponse = { model: 'fixture', usage: { total_tokens: 12 } };
    }));
    expect(host.textContent).toContain('Previous answer kept — Original question');
    expect(host.querySelector('[data-response]')?.textContent).toBe('Earlier successful answer');
    await act(async () => button('View error details').click());
    fixture.copy.mockResolvedValueOnce(false);
    await act(async () => button('Copy').click());
    expect(button('Copy')).toBeDefined(); expect(button('Copied')).toBeUndefined();
    expect(fixture.copy).toHaveBeenCalledWith(expect.stringContaining('503'), 'Error details copied');
    await act(async () => button('Copy').click());
    expect(button('Copied')).toBeDefined();
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Model response details'))!.click());
    fixture.copy.mockResolvedValueOnce(false);
    await act(async () => button('Copy JSON').click());
    expect(button('Copy JSON')).toBeDefined();
    expect(fixture.copy).toHaveBeenCalledWith(expect.stringContaining('fixture'), 'Response JSON copied');
});
