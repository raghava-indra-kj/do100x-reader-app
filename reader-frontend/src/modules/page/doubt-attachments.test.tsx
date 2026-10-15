// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createDocument, createTextAnchor } from '@reader/md-ast';

const fixture = vi.hoisted(() => ({ create: vi.fn(), success: vi.fn(), error: vi.fn(), store: { pageId: 'page-a', bumpCommentsVersion: vi.fn(), uiSettingsStore: { setSidebarPanel: vi.fn() } } }));
vi.mock('./store', () => ({ usePageStore: () => fixture.store }));
vi.mock('@domain/comment/services/comments-service', () => ({ createComment: fixture.create }));
vi.mock('@domain/settings/services/settings-service', () => ({ getModelConfig: vi.fn(async () => ({ ok:false })) }));
vi.mock('@domain/chat/services/chat-service', () => ({ getChatCompletion: vi.fn() }));
vi.mock('@domain/page/services/pages-service', () => ({ createPage: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { success: fixture.success, error: fixture.error } }));
vi.mock('./components/ai-lookup-panel', () => ({ PageAiLookupPanel: () => null }));
vi.mock('./components/reader-action-button', () => ({ ReaderActionButton: ({ tooltip, children, ...props }: any) => <button aria-label={tooltip} {...props}>{children}</button> }));
import { DoubtStore } from './doubt-store';
import { SaveQuestionComment } from './components/doubt-panel';
import type { PageStore } from './store';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
beforeEach(() => { fixture.store.pageId = 'page-a'; fixture.create.mockReset().mockResolvedValue({ ok:true, data:'comment' }); fixture.error.mockReset(); });
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; document.body.innerHTML = ''; });

function question() {
    const model = createDocument('Repeated text\n\nRepeated text');
    const second = model.blocks[1];
    const attachment = { anchor: createTextAnchor(model, { start:second.start, end:second.end }), contentVersion:3 };
    const store = new DoubtStore(fixture.store as unknown as PageStore);
    store.open('Why?', 'Repeated text', 'Page', 'Section', attachment);
    return { store, attachment, model };
}
async function mount(entry: DoubtStore['history'][number]) {
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root!.render(<SaveQuestionComment entry={entry} />));
    return host.querySelector('button')!;
}

it('keeps separate questions for identical passages with different targets and snapshots the attachment', () => {
    const { store, attachment, model } = question();
    const firstEntry = store.history[0];
    store.open('Why?', 'Repeated text', 'Page', 'Section', attachment);
    expect(store.history).toHaveLength(1);
    store.open('Why?', 'Repeated text', 'Page', 'Section', { anchor:createTextAnchor(model, { start:0, end:model.blocks[0].end }), contentVersion:3 });
    expect(store.history).toHaveLength(2);
    attachment.anchor.segments[0].start = 4;
    expect(firstEntry.attachment!.anchor.segments[0].start).toBe(0);
    store.reask(firstEntry.id, 'How does it work?');
    expect(firstEntry.attachment!.contentVersion).toBe(3);
});

it('saves the original question target and revision even after navigation', async () => {
    const { store, attachment } = question();
    fixture.store.pageId = 'page-b';
    const button = await mount(store.history[0]);
    await act(async () => button.click());
    expect(fixture.create).toHaveBeenCalledWith(expect.objectContaining({ pageId:'page-a', body:'Why?', ...attachment }));
    expect(button.getAttribute('aria-label')).toBe('Question saved to comments');
});

it('retains a stale question and reports the conflict without silently saving a page note', async () => {
    const { store } = question();
    fixture.create.mockResolvedValue({ ok:false, error:new Error('The page changed. Select its source again.') });
    const button = await mount(store.history[0]);
    await act(async () => button.click());
    expect(fixture.error).toHaveBeenCalledWith('The page changed. Select its source again.');
    expect(store.history[0].searchTerm).toBe('Why?');
    expect(store.history[0].attachment!.contentVersion).toBe(3);
    expect(fixture.create).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(false);
});

it('labels an unanchored question as a page note', async () => {
    const store = new DoubtStore(fixture.store as unknown as PageStore);
    store.open('What is this section about?', 'Section content', 'Page', 'Section');
    const button = await mount(store.history[0]);
    expect(button.getAttribute('aria-label')).toBe('Save question as page note');
    await act(async () => button.click());
    expect(fixture.create.mock.calls[0][0]).not.toHaveProperty('anchor');
});
