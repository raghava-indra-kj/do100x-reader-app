// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument, documentMetadata, createTextAnchor, replaceAnnotatedSource } from '@reader/md-ast';
import { MarkdownRenderer } from '@reader/md-view';
import { Comment } from '@domain/comment/models/comment';
import { Page } from '@domain/page/models/page';
import { Section } from '@domain/page/models/section';
import { captureCommentTarget } from './comment-target';
import { commentInFilter, commentSourceLabel } from './comment-state';

const fixture = vi.hoisted(() => ({ selection: null as any, create: vi.fn(), edit: vi.fn(), store: { bumpCommentsVersion: vi.fn(), bumpVocabVersion: vi.fn(), commentToReattach: null as any, setCommentToReattach: vi.fn(), doubtStore: { open: vi.fn() } } }));
vi.mock('../hooks/use-text-selection', () => ({ useTextSelection: () => fixture.selection }));
vi.mock('../store', () => ({ usePageStore: () => fixture.store }));
vi.mock('@domain/comment/services/comments-service', () => ({ createComment: fixture.create, editComment: fixture.edit }));
vi.mock('@domain/vocabulary/services/vocabulary-service', () => ({ createVocabulary: vi.fn() }));
vi.mock('@modules/core/ui/primitives/toast/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./reader-action-button', () => ({ ReaderActionButton: ({ tooltip, children, ...props }: any) => <button aria-label={tooltip} {...props}>{children}</button> }));
import { SelectionPopover } from './selection-popover';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    fixture.selection = null; fixture.store.commentToReattach = null; fixture.create.mockReset(); fixture.edit.mockReset(); fixture.store.doubtStore.open.mockReset();
    fixture.create.mockResolvedValue({ ok: true, data: 'comment' });
});
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); document.body.innerHTML = ''; vi.unstubAllGlobals(); });

const source = '# Heading\n\nKeep **this sentence**.\n\nKeep **this sentence**.\n\n$$E=mc^2$$';
function makePage(text = source, version = 3) {
    const doc = createDocument(text);
    return new Page({ id: 'page', parentPageId: null, title: 'Page', content: text, contentVersion: version, documentMetadata: documentMetadata(doc), category: null, createdAt: new Date(), updatedAt: new Date(), sections: [], childrenCount: 0 });
}
const section = new Section({ id: 'section', pageId: 'page', title: 'Heading', rawTitle: 'Heading', level: 1, content: source, children: [] });
async function mount(page = makePage()) {
    const host = document.createElement('div'); document.body.append(host);
    const content = document.createElement('div'); document.body.append(content);
    const reader = createRoot(content); roots.push(reader);
    await act(async () => reader.render(<MarkdownRenderer markdown={page.content} document={page.document!} />));
    const node = content.querySelectorAll('strong')[1].firstChild!;
    const range = document.createRange(); range.selectNodeContents(node);
    fixture.selection = { text: range.toString(), range, rect: new DOMRect(30, 30, 200, 30) };
    const root = createRoot(host); roots.push(root);
    const render = (value: Page) => root.render(<SelectionPopover page={value} section={section} containerRef={{ current: content }} />);
    await act(async () => render(page));
    return { page, content, range, render };
}
async function click(label: string) {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === label || node.getAttribute('aria-label') === label);
    expect(button, label).toBeTruthy();
    await act(async () => button!.click());
}
async function typeDraft(value: string) {
    const textarea = document.querySelector('textarea')!;
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, value);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

describe('Reader attachments', () => {
    it('captures the second identical passage, not the first quote match', async () => {
        const { page, content, range } = await mount();
        const target = captureCommentTarget(content.querySelector('.md-view'), page.document, 3, range);
        expect(target.anchor?.segments[0].blockId).toBe(page.document!.blocks[2].id);
        await click('Ask or comment'); await typeDraft('Why this sentence?'); await click('Save comment');
        expect(fixture.create).toHaveBeenCalledWith(expect.objectContaining({ contentVersion: 3, anchor: target.anchor, body: 'Why this sentence?' }));
    });
    it('pins the original revision while a draft is open and retains server conflict text', async () => {
        const { page, render } = await mount();
        await click('Ask or comment'); await typeDraft('Keep my draft');
        await act(async () => render(makePage('New content', 4)));
        fixture.create.mockResolvedValue({ ok: false, error: new Error('The page changed. Select the passage again.') });
        await click('Save comment');
        expect(fixture.create.mock.calls[0][0]).toMatchObject({ contentVersion: 3, anchor: { segments: [{ blockId: page.document!.blocks[2].id }] } });
        expect(document.querySelector('textarea')?.value).toBe('Keep my draft');
        expect(document.querySelector('[role=alert]')?.textContent).toContain('Select the passage again');
    });
    it('carries the selected occurrence and original revision into the AI question', async () => {
        const { page, render } = await mount();
        await click('Ask or comment'); await typeDraft('Explain this sentence');
        await act(async () => render(makePage('Changed content', 4)));
        await click('Ask AI');
        expect(fixture.store.doubtStore.open).toHaveBeenCalledWith('Explain this sentence', 'this sentence', 'Page', 'Heading', expect.objectContaining({ contentVersion: 3, anchor: expect.objectContaining({ segments: [expect.objectContaining({ blockId: page.document!.blocks[2].id })] }) }));
    });
    it('starts a new draft for identical text selected at a different location', async () => {
        const { content, page, render } = await mount();
        await click('Ask or comment'); await typeDraft('Second occurrence');
        const range = document.createRange(); range.selectNodeContents(content.querySelector('strong')!.firstChild!);
        fixture.selection = { ...fixture.selection, range };
        await act(async () => render(page));
        await click('Ask or comment');
        expect(document.querySelector('textarea')?.value).toBe('');
    });
    it('renders math in preview and reattaches without replacing the note body', async () => {
        await mount(); await click('Ask or comment'); await typeDraft('Energy is $E=mc^2$.'); await click('Preview Markdown & math');
        expect(document.querySelector('.reader-comment-preview .katex')).toBeTruthy();
        await click('Back to selection tools');
        fixture.store.commentToReattach = { id: 'old' };
        // Trigger a normal render, just as the observable store does in the app.
        const { page, render } = await mount();
        fixture.edit.mockResolvedValue({ ok: true });
        await act(async () => render(page));
        await click('Attach comment here');
        expect(fixture.edit).toHaveBeenCalledWith(expect.objectContaining({ commentId: 'old', contentVersion: 3, anchor: expect.any(Object) }));
        expect(fixture.edit.mock.calls[0][0]).not.toHaveProperty('body');
    });
    it('archives removed targets independently of resolved status and preserves the quote', () => {
        const doc = createDocument('Selected text');
        const anchor = createTextAnchor(doc, { start: 0, end: 13 });
        const result = replaceAnnotatedSource(doc, '', [anchor]);
        const comment = new Comment({ id: 'c', pageId: 'p', pageTitle: 'Page', sectionTitle: null, selectedText: 'Selected text', body: 'Keep me', anchor: result.anchors[0], linkedPageId: null, isExplanation: false, createdAt: new Date(), updatedAt: new Date() });
        expect(commentInFilter(comment, 'active')).toBe(false);
        expect(commentInFilter(comment, 'history')).toBe(true);
        expect(commentSourceLabel(comment)).toBe('Source removed');
        expect(comment.resolvedAt).toBeNull(); expect(comment.anchor?.quote).toBe('Selected text');
    });
});
