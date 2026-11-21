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
import { CommentDraftStore } from '../comment-draft-store';

const fixture = vi.hoisted(() => ({ selection: null as any, create: vi.fn(), edit: vi.fn(), store: { commentDrafts: null as unknown as CommentDraftStore, bumpCommentsVersion: vi.fn(), bumpVocabVersion: vi.fn(), commentToReattach: null as any, setCommentToReattach: vi.fn(), doubtStore: { open: vi.fn() } } }));
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
    fixture.store.commentDrafts = new CommentDraftStore();
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
    return { page, content, range, render, root };
}
function buttonNamed(label: string) {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === label || node.getAttribute('aria-label') === label);
    expect(button, label).toBeTruthy();
    return button!;
}
async function click(label: string) {
    await act(async () => buttonNamed(label).click());
}
async function pressEnter(target: HTMLElement, modifiers: KeyboardEventInit = {}) {
    await act(async () => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...modifiers })));
}
async function typeDraft(value: string) {
    const textarea = document.querySelector('textarea')!;
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, value);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

describe('Reader attachments', () => {
    it('copies the selected passage with its original page and section context from the labeled icon', async () => {
        await mount();
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        const copy = document.querySelector<HTMLButtonElement>('button[aria-label="Copy selection"]');
        expect(copy).toBeTruthy();
        await act(async () => copy!.click());
        expect(writeText).toHaveBeenCalledWith('Page: Page\nSection: Heading\n\nthis sentence\n\n');
    });
    it('keeps both external providers available and applies their URL limits in each view', async () => {
        function providerButtons(groupName: string) {
            const buttons = [...document.querySelectorAll<HTMLButtonElement>(`[role="group"][aria-label="${groupName}"] button`)];
            const find = (brand: RegExp) => {
                const button = buttons.find(item => brand.test(item.getAttribute('aria-label') || item.textContent || ''));
                expect(button).toBeDefined();
                return button!;
            };
            return { google: find(/google/i), duck: find(/duck/i) };
        }
        const passage = 'x'.repeat(2200);
        await mount(makePage(`# Heading\n\n**First passage**\n\n**${passage}**`));
        const menu = providerButtons('Explain elsewhere');
        expect(menu.google.disabled).toBe(true);
        expect(menu.duck.disabled).toBe(false);
        await click('Ask or comment');
        const composer = providerButtons('Ask elsewhere');
        expect(composer.google.disabled).toBe(true);
        expect(composer.duck.disabled).toBe(true);
        await typeDraft('Why?');
        expect(composer.google.disabled).toBe(true);
        expect(composer.duck.disabled).toBe(false);
        await typeDraft('x'.repeat(2200));
        expect(composer.duck.disabled).toBe(true);
    });
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
        expect(fixture.store.doubtStore.open).toHaveBeenCalledWith('Explain this sentence', 'this sentence', 'Page', 'Heading', expect.objectContaining({ contentVersion: 3, anchor: expect.objectContaining({ segments: [expect.objectContaining({ blockId: page.document!.blocks[2].id })] }) }), 'question');
    });
    it.each(['ctrlKey', 'metaKey'] as const)('saves with %s+Enter and can then ask about the same comment with Shift', async modifier => {
        await mount();
        await click('Ask or comment');
        expect(buttonNamed('Save comment').disabled).toBe(true);
        await typeDraft('What does this mean?');
        const editor = document.querySelector('textarea')!;
        await pressEnter(editor);
        expect(fixture.create).not.toHaveBeenCalled();
        expect(fixture.store.doubtStore.open).not.toHaveBeenCalled();
        await pressEnter(editor, { [modifier]: true });
        expect(fixture.create).toHaveBeenCalledTimes(1);
        expect(fixture.create.mock.calls[0][0]).toMatchObject({ body: 'What does this mean?', selectedText: 'this sentence' });
        expect(fixture.store.doubtStore.open).not.toHaveBeenCalled();
        expect(buttonNamed('Comment saved').disabled).toBe(true);
        expect(editor.value).toBe('What does this mean?');
        await pressEnter(editor, { [modifier]: true, shiftKey: true });
        expect(fixture.store.doubtStore.open).toHaveBeenCalledWith('What does this mean?', 'this sentence', 'Page', 'Heading', expect.objectContaining({ anchor: fixture.create.mock.calls[0][0].anchor, contentVersion: 3 }), 'question');
        expect(fixture.create).toHaveBeenCalledTimes(1);
    });
    it('checks the written explanation against its original passage and can still save that draft', async () => {
        const { page, render } = await mount();
        await click('Ask or comment');
        await typeDraft('  ');
        expect(buttonNamed('Save comment').disabled).toBe(true);
        expect(buttonNamed('Ask AI').disabled).toBe(true);
        expect(buttonNamed('Check understanding').disabled).toBe(true);
        const interpretation = 'I think this means the two terms are equivalent.';
        await typeDraft(interpretation);
        await act(async () => render(makePage('New page version', 4)));
        await click('Check understanding');
        expect(fixture.store.doubtStore.open).toHaveBeenCalledWith(interpretation, 'this sentence', 'Page', 'Heading', expect.objectContaining({
            contentVersion: 3, anchor: expect.objectContaining({ segments: [expect.objectContaining({ blockId: page.document!.blocks[2].id })] }),
        }), 'check-understanding');
        expect(fixture.create).not.toHaveBeenCalled();
        await click('Resume comment');
        expect(document.querySelector('textarea')?.value).toBe(interpretation);
        await click('Save comment');
        expect(fixture.create).toHaveBeenCalledTimes(1);
        expect(fixture.create.mock.calls[0][0]).toMatchObject({ body: interpretation, contentVersion: 3 });
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
        const { page, render } = await mount(); await click('Ask or comment'); await typeDraft('Energy is $E=mc^2$.'); await click('Preview Markdown & math');
        expect(document.querySelector('.reader-comment-preview .katex')).toBeTruthy();
        await click('Back to selection tools');
        fixture.store.commentToReattach = { id: 'old' };
        // Trigger a normal render, just as the observable store does in the app.
        fixture.edit.mockResolvedValue({ ok: true });
        await act(async () => render(page));
        await click('Attach comment here');
        expect(fixture.edit).toHaveBeenCalledWith(expect.objectContaining({ commentId: 'old', contentVersion: 3, anchor: expect.any(Object) }));
        expect(fixture.edit.mock.calls[0][0]).not.toHaveProperty('body');
    });
    it('previews math and changes comment options without sending the draft', async () => {
        await mount();
        await click('Ask or comment');
        const draft = 'Is $x^2$ always positive?';
        await typeDraft(draft);
        await click('Preview Markdown & math');
        const preview = document.querySelector<HTMLElement>('.reader-comment-preview')!;
        expect(preview.querySelector('.katex')).toBeTruthy();
        await pressEnter(preview, { ctrlKey: true });
        await click('Write');
        await click('Comment options');
        const includeInExplanations = document.querySelector<HTMLInputElement>('[aria-label="Add comment"] input[type="checkbox"]')!;
        expect(includeInExplanations).toBeTruthy();
        await act(async () => includeInExplanations.click());
        await pressEnter(includeInExplanations, { metaKey: true, shiftKey: true });
        await click('Comment options');
        expect(document.querySelector('textarea')?.value).toBe(draft);
        expect(fixture.store.doubtStore.open).not.toHaveBeenCalled();
        expect(fixture.create).not.toHaveBeenCalled();
        await click('Save comment');
        expect(fixture.create.mock.calls[0][0]).toMatchObject({ body: draft, isExplanation: true });
    });
    it('parks on Escape, returns focus to reading, and resumes the same occurrence and revision', async () => {
        const { page, content, render } = await mount();
        await click('Ask or comment'); await typeDraft('Keep the second occurrence');
        await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        expect(document.querySelector('textarea')).toBeNull();
        const passage = content.querySelectorAll('strong')[1].closest('[data-md-block-id]');
        expect(document.activeElement).toBe(passage);
        expect(content.hasAttribute('tabindex')).toBe(false);
        fixture.selection = null;
        await act(async () => render(makePage('Updated page content', 4)));
        await click('Resume comment');
        expect(passage?.hasAttribute('tabindex')).toBe(false);
        expect(document.querySelector('textarea')?.value).toBe('Keep the second occurrence');
        expect(document.querySelector('textarea')).toBe(document.activeElement);
        await click('Save comment');
        expect(fixture.create.mock.calls[0][0]).toMatchObject({ contentVersion: 3, anchor: { segments: [{ blockId: page.document!.blocks[2].id }] }, body: 'Keep the second occurrence' });
    });
    it('keeps separate drafts for identical passages and permits explicit discard', async () => {
        const { content, page, render } = await mount();
        await click('Ask or comment'); await typeDraft('Second occurrence');
        const range = document.createRange(); range.selectNodeContents(content.querySelector('strong')!.firstChild!);
        fixture.selection = { ...fixture.selection, range };
        await act(async () => render(page));
        await click('Ask or comment'); await typeDraft('First occurrence');
        await click('Close and keep draft');
        await click('Drafts (2)');
        const entries = document.querySelectorAll('.reader-comment-draft-list > div > button:first-child');
        expect(entries).toHaveLength(2);
        await act(async () => (entries[0] as HTMLButtonElement).click());
        expect(document.querySelector('textarea')?.value).toBe('Second occurrence');
        await click('Comment options');
        await click('Discard draft');
        await click('Resume comment');
        expect(document.querySelector('textarea')?.value).toBe('First occurrence');
        await click('Save comment');
        expect(fixture.create.mock.calls[0][0].anchor.segments[0].blockId).toBe(page.document!.blocks[1].id);
    });
    it('preserves unsaved text after Ask AI or an outside pointer dismissal', async () => {
        await mount(); await click('Ask or comment'); await typeDraft('A question to keep');
        await click('Ask AI');
        await click('Resume comment');
        expect(document.querySelector('textarea')?.value).toBe('A question to keep');
        await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
        expect(document.querySelector('textarea')).toBeNull();
        await click('Resume comment');
        expect(document.querySelector('textarea')?.value).toBe('A question to keep');
    });
    it('keeps save failure recoverable without marking a different active draft saved', async () => {
        const { content, page, render } = await mount();
        let finish!: (value: unknown) => void;
        fixture.create.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
        await click('Ask or comment'); await typeDraft('Submitted second occurrence'); await click('Save comment');
        const range = document.createRange(); range.selectNodeContents(content.querySelector('strong')!.firstChild!);
        fixture.selection = { ...fixture.selection, range };
        await act(async () => render(page));
        await click('Ask or comment'); await typeDraft('New first occurrence');
        await act(async () => finish({ ok: false, error: new Error('Connection failed') }));
        expect(document.querySelector('textarea')?.value).toBe('New first occurrence');
        expect(document.querySelector('[role=alert]')).toBeNull();
        await click('Close and keep draft'); await click('Drafts (2)');
        await act(async () => (document.querySelector('.reader-comment-draft-list > div > button') as HTMLButtonElement).click());
        expect(document.querySelector('textarea')?.value).toBe('Submitted second occurrence');
        expect(document.querySelector('[role=alert]')?.textContent).toContain('Connection failed');
    });
    it('focuses keyboard selection tools without stealing focus on pointer selection', async () => {
        const { page, render } = await mount();
        expect(document.activeElement).toBe(document.body);
        fixture.selection = { ...fixture.selection, range: fixture.selection.range.cloneRange(), keyboard: true };
        await act(async () => render(page));
        expect(document.querySelector('[role=region][aria-label="Selection tools"]')).toBeTruthy();
        expect(document.activeElement?.textContent).toBe('Ask or comment');
    });
    it('recovers after the composer unmounts without leaking drafts into another page', async () => {
        const { page, content, root } = await mount();
        await click('Ask or comment'); await typeDraft('Preserve across the editor');
        await act(async () => root.unmount()); roots.splice(roots.indexOf(root), 1);
        fixture.selection = null;
        const host = document.createElement('div'); document.body.append(host);
        const replacement = createRoot(host); roots.push(replacement);
        await act(async () => replacement.render(<SelectionPopover page={page} section={section} containerRef={{ current: content }} />));
        await click('Resume comment');
        expect(document.querySelector('textarea')?.value).toBe('Preserve across the editor');
        const other = new Page({ ...page, id: 'other-page' });
        await act(async () => replacement.render(<SelectionPopover page={other} section={section} containerRef={{ current: content }} />));
        expect(document.querySelector('textarea')).toBeNull();
        expect(document.querySelector('.reader-comment-drafts')).toBeNull();
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
