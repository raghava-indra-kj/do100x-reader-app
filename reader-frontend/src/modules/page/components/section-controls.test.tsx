// @vitest-environment jsdom
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { observable, runInAction } from 'mobx';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDocument, documentMetadata, locateSections } from '@reader/md-ast';
import { Page, Section } from '@domain/page/models/page';
import { PageFontFamilies } from '../theme/page-font-families';
import { PageFontSizes } from '../theme/page-font-sizes';
import { PageMain, type ReaderSectionActions } from './main-content';
import type { BlockCommentSelection } from './comment-target';

const titles = ['Introduction', 'How the steps fit together when the section title wraps onto multiple lines', 'Review'];
const content = titles.map((title, index) => `## ${title}\n\nPassage ${index + 1}.${index === 0 ? '\n\n### Example\n\nExample body.' : ''}`).join('\n\n');
const sections = locateSections(content).filter(range => range.level === 2).map((range, index) => new Section({
    pageId: 'page', id: String(index), title: range.title, rawTitle: range.title, level: range.level,
    content: `Passage ${index + 1}.`, sourceRange: range, children: [],
}));
const page = new Page({
    id: 'page', parentPageId: null, title: 'Study guide', content, contentVersion: 1, sections,
    documentMetadata: documentMetadata(createDocument(content)), category: null, createdAt: new Date(0), updatedAt: new Date(0), childrenCount: 0,
});
const index = observable.box(0);
const store = {
    initDataState: {}, optCurrentPage: page, get currentSection() { return sections[index.get()]; }, navigableSections: sections,
    goToPrevSection: () => runInAction(() => index.set(index.get() - 1)),
    goToNextSection: () => runInAction(() => index.set(index.get() + 1)),
    headingLevel: { value: 2 }, comments: [],
    uiSettingsStore: { readingWidth: 'comfortable', fontSize: PageFontSizes.BASE, fontFamilies: PageFontFamilies.LEXEND },
};
vi.mock('../store', () => ({ usePageStore: () => store }));
vi.mock('@modules/core/theme', () => ({ useThemeStore: () => ({ theme: { value: 'light' } }) }));
vi.mock('./section-edit-dialog', () => ({
    SectionEditDialog: ({ range, onClose }: { range: { title: string | null }; onClose: () => void }) =>
        <div role="dialog" aria-label={range.title ?? 'Introduction'}><button onClick={onClose}>Close editor</button></div>,
}));
vi.mock('./selection-popover', () => ({
    SelectionPopover: ({ blockSelection }: { blockSelection: BlockCommentSelection | null }) =>
        blockSelection && <output aria-label="Draft blocks">{blockSelection.anchor.segments.map(segment => segment.blockId).join(',')}</output>,
}));

let root: Root;
const commands = createRef<ReaderSectionActions>();
beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    runInAction(() => index.set(0));
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<PageMain ref={commands} />));
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
    vi.unstubAllGlobals();
});
const footer = () => [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Section navigation"] button')];
async function click(button: HTMLButtonElement) { await act(async () => button.click()); }

it('keeps the destination names and only offers the available section directions', async () => {
    const surface = document.querySelector<HTMLElement>('[role="region"][aria-label="Reading content"]')!;
    const next = footer()[0];
    next.focus();
    surface.focus();
    expect(document.activeElement).toBe(next);
    expect(footer().map(button => button.textContent)).toEqual([`Next section${titles[1]}`]);
    await click(footer()[0]);
    expect(footer().map(button => button.textContent)).toEqual([`Previous section${titles[0]}`, `Next section${titles[2]}`]);
    await click(footer()[1]);
    expect(footer().map(button => button.textContent)).toEqual([`Previous section${titles[1]}`]);
    await click(footer()[0]);
    expect(index.get()).toBe(1);
});

it('shows block controls only during selection and retains picks across section navigation', async () => {
    expect(document.querySelector('[aria-label="Block selection"]')).toBeNull();
    expect(document.querySelector('.reader-section-actions')).toBeNull();
    await act(async () => commands.current!.commentOnBlocks());
    await click(document.querySelector<HTMLButtonElement>('[aria-label="Select block: Passage 1."]')!);
    await click(footer()[0]);
    await click(document.querySelector<HTMLButtonElement>('[aria-label="Select block: Passage 2."]')!);
    const compose = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Block selection"] button')].find(button => button.textContent === 'Comment (2)')!;
    await click(compose);
    const expectedIds = page.document!.blocks.filter(block => block.text === 'Passage 1.' || block.text === 'Passage 2.').map(block => block.id);
    expect(document.querySelector('output[aria-label="Draft blocks"]')?.textContent).toBe(expectedIds.join(','));
    expect(document.querySelector('[aria-label="Block selection"]')).toBeNull();
});

it('edits the chosen nested section and resets the target when changing sections', async () => {
    const openEditor = () => act(async () => commands.current!.editSection());
    const closeEditor = () => click(document.querySelector<HTMLButtonElement>('[role="dialog"] button')!);
    await openEditor();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(titles[0]);
    await closeEditor();
    await act(async () => document.querySelector<HTMLElement>('.md-view h3')!.click());
    await openEditor();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Example');
    await closeEditor();
    await click(footer()[0]);
    await openEditor();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(titles[1]);
});

it('clears picked blocks when selection is cancelled', async () => {
    await act(async () => commands.current!.commentOnBlocks());
    const block = '[aria-label="Select block: Passage 1."]';
    await click(document.querySelector<HTMLButtonElement>(block)!);
    await click(document.querySelector<HTMLButtonElement>('[aria-label="Cancel block selection"]')!);
    expect(document.querySelector(block)).toBeNull();
    await act(async () => commands.current!.commentOnBlocks());
    expect(document.querySelector(block)?.getAttribute('aria-pressed')).toBe('false');
});
