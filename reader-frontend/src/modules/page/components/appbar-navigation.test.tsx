// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Page, Section } from '@domain/page/models/page';
import { PageFontSizes } from '../theme/page-font-sizes';
import { PageHeadingLevel } from '../theme/page-heading-level';

const fixture = vi.hoisted(() => ({
    auth: { isAuthenticated: true, currentUser: { label: 'reader@example.com' } },
    page: null as Page | null,
}));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({ useMotivationPreferences: () => ({ motivationsEnabled: false }), canShowMotivations: () => false }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: () => {} }));
vi.mock('../store', () => ({ usePageStore: () => ({
    optCurrentPage: fixture.page,
    currentSection: fixture.page?.sections[0] ?? null,
    flatSections: fixture.page?.sections ?? [],
    navigableSections: fixture.page?.sections ?? [],
    hasPrevSection: false,
    hasNextSection: (fixture.page?.sections.length ?? 0) > 1,
    headingLevel: PageHeadingLevel.H2,
    dictionaryStore: { isOpen: false },
    isOwner: fixture.page?.isOwner,
    isPublic: fixture.page?.isPublic,
    uiSettingsStore: { focusMode: false, fontSize: PageFontSizes.BASE, isFontSizeIncreasable: true, isFontSizeDecreasable: true },
}) }));
vi.mock('./settings', () => ({ PageSettingsDialog: () => null }));
vi.mock('./share-dialog', () => ({ ShareDialog: () => null }));
vi.mock('@modules/core/ui/components/motivation-reels', () => ({ MotivationReelsDialog: () => null }));
vi.mock('@modules/core/apps/apps-switcher', () => ({ AppsSwitcher: () => <button aria-label="Switch apps" /> }));
vi.mock('@modules/core/ui/components/theme-selector', () => ({ ThemeSelector: () => <button aria-label="Theme" /> }));
import { PageAppbar } from './appbar';

function samplePage(overrides: Partial<ConstructorParameters<typeof Page>[0]> = {}) {
    return new Page({
        id: 'sample', parentPageId: null, title: 'Sample page', content: '', contentVersion: 1, category: null,
        createdAt: new Date(0), updatedAt: new Date(0), sections: [], childrenCount: 0, ...overrides,
    });
}

function sampleArticle(titles: string[]) {
    const sections = titles.map(title => new Section({
        id: title, pageId: 'sample', title, rawTitle: title, level: 2, content: 'Text to read.', children: [],
    }));
    return samplePage({ sections, content: sections.map(section => section.fullMarkdown).join('\n\n') });
}

describe('Reader suite navigation boundaries', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.startsWith('(min-width:') }));
        fixture.auth.isAuthenticated = true;
        fixture.page = samplePage();
    });
    afterEach(() => { vi.unstubAllGlobals(); });
    const render = () => renderToStaticMarkup(<MemoryRouter><PageAppbar /></MemoryRouter>);
    it('shows one home link and one compact switcher on private reading pages', () => {
        const html = render();
        expect(html.match(/aria-label="do100x home"/g)).toHaveLength(1);
        expect(html.match(/aria-label="Switch apps"/g)).toHaveLength(1);
        expect(html).toContain('class="suite-appbar"');
        expect(html).toContain('Reader</span>');
        expect(html).toContain('aria-label="Reading tools"');
        expect(html.match(/aria-label="Find a page"/g)).toHaveLength(1);
        expect(html).toContain('aria-label="Account settings — reader@example.com"');
    });
    it('keeps the current title as the only breadcrumb label on a nested page', () => {
        fixture.page = samplePage({ parentPageId: 'parent-page', ancestors: [{ id: 'parent-page', title: 'Parent' }] });
        const html = render();
        expect(html).toContain('aria-label="do100x home"');
        expect(html).toContain('Sample page');
        const doc = new DOMParser().parseFromString(html, 'text/html');
        expect(doc.querySelector('nav[aria-label="Page location"]')?.textContent).toBe('Sample page');
        expect(doc.querySelector('button[aria-label="Show page path for Sample page"]')).not.toBeNull();
    });
    it('does not add private application controls to public reading pages', () => {
        fixture.page = samplePage({ isPubliclyAccessible: true, isPublic: true, isOwner: false });
        const html = render();
        expect(html).not.toContain('Switch apps');
        expect(html).not.toContain('Find a page');
        expect(html).not.toContain('Public</span>');
        expect(html).not.toContain('Take a break');
        expect(html).not.toContain('aria-label="Temporary inbox"');
        expect(html).not.toContain('aria-label="Manage page sharing"');
    });
    it('does not show a private switcher to anonymous readers', () => {
        fixture.auth.isAuthenticated = false;
        expect(render()).not.toContain('Switch apps');
    });

    it('keeps settings and library actions available on a folder with no reading content', () => {
        fixture.page = samplePage({ content: '  \n ', childrenCount: 2 });
        const html = render();
        for (const label of ['Reading settings', 'Temporary inbox', 'Find a page']) {
            expect(html).toContain(`aria-label="${label}"`);
        }
        for (const label of ['Previous section', 'Next section', 'Copy page', 'Copy section', 'Decrease font size', 'Increase font size']) {
            expect(html).not.toContain(`aria-label="${label}"`);
        }
    });

    it('shows document tools and both copy scopes on a multi-section article', () => {
        fixture.page = sampleArticle(['First', 'Second']);
        const doc = new DOMParser().parseFromString(render(), 'text/html');
        for (const label of ['Enter focus mode', 'Open dictionary', 'Copy section', 'Copy page', 'Decrease font size', 'Increase font size']) {
            expect(doc.querySelector(`button[aria-label="${label}"]`), label).not.toBeNull();
        }
        expect(doc.querySelector('button[aria-label="Previous section"]')?.hasAttribute('disabled')).toBe(true);
        expect(doc.querySelector('button[aria-label="Next section"]')?.hasAttribute('disabled')).toBe(false);
    });

    it('omits the section pager on a single-section article', () => {
        fixture.page = sampleArticle(['Only section']);
        const html = render();
        expect(html).not.toContain('aria-label="Previous section"');
        expect(html).not.toContain('aria-label="Next section"');
        expect(html).toContain('aria-label="Copy page"');
    });

    it('keeps text resizing and back navigation one tap away on a compact reading page', () => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.startsWith('(max-width:') }));
        fixture.page = samplePage({ parentPageId: 'parent-page', content: 'A short reading passage.' });
        const doc = new DOMParser().parseFromString(render(), 'text/html');
        expect(doc.querySelector('a[aria-label="Back to parent page"]')?.getAttribute('href')).toBe('/reader/pages/parent-page');
        for (const label of ['Decrease font size', 'Increase font size', 'More options']) {
            expect(doc.querySelectorAll(`button[aria-label="${label}"]`)).toHaveLength(1);
        }
        expect(doc.querySelector('button[aria-label="Copy page"]')).toBeNull();
    });

    it('offers sharing for an owned library page and omits it for an owned temporary capture', () => {
        fixture.page = samplePage({ isOwner: true });
        expect(render()).toContain('aria-label="Share page and subpages"');
        fixture.page = samplePage({ isOwner: true, isPublic: true, isPubliclyAccessible: true });
        expect(render()).toContain('aria-label="Manage page sharing"');
        fixture.page = samplePage({ isOwner: true, captureExpiresAt: new Date('2027-01-01') });
        const html = render();
        expect(html).not.toContain('aria-label="Share page and subpages"');
        expect(html).not.toContain('aria-label="Manage page sharing"');
    });
});

describe('Reader section commands', () => {
    let root: ReturnType<typeof createRoot>;
    let width = 1280;
    const edit = vi.fn();
    const comment = vi.fn();
    const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    const render = (props: ComponentProps<typeof PageAppbar> = { onEditSection: edit, onCommentOnBlocks: comment }) =>
        act(async () => root.render(<MemoryRouter><PageAppbar {...props} /></MemoryRouter>));
    const click = (element: HTMLElement) => act(async () => { element.focus(); element.click(); });

    beforeEach(() => {
        width = 1280;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('matchMedia', (query: string) => {
            const match = query.match(/\((min|max)-width:\s*(\d+)px\)/);
            return {
                matches: !!match && (match[1] === 'max' ? width <= Number(match[2]) : width >= Number(match[2])),
                addEventListener() {},
                removeEventListener() {},
            };
        });
        vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        edit.mockClear();
        comment.mockClear();
        fixture.auth.isAuthenticated = true;
        fixture.page = sampleArticle(['One', 'Two']);
    });
    afterEach(async () => {
        await act(async () => root.unmount());
        document.body.replaceChildren();
        vi.unstubAllGlobals();
    });

    it('opens the desktop commands beside the section pager and dismisses after editing', async () => {
        await render();
        const trigger = button('Section actions')!;
        const pager = document.querySelector('[role="group"][aria-label="Section navigation"]')!;
        expect(trigger.previousElementSibling).toBe(pager);
        expect(document.querySelector('[role="menu"]')).toBeNull();
        await click(trigger);
        const commands = document.querySelectorAll<HTMLElement>('[role="menu"][aria-label="Section actions"] [role="menuitem"]');
        expect([...commands].map(item => item.textContent)).toEqual(['Edit section', 'Comment on blocks']);
        await click(commands[0]);
        expect(edit).toHaveBeenCalledOnce();
        expect(comment).not.toHaveBeenCalled();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('lets a keyboard reader open and dismiss the section menu without editing', async () => {
        await render();
        const trigger = button('Section actions')!;
        const press = (target: Element, key: string) => act(async () => {
            target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        });
        await act(async () => trigger.focus());
        await press(trigger, 'ArrowDown');
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement?.textContent).toBe('Edit section');
        await press(document.activeElement!, 'Escape');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.querySelector('[role="menu"]')).toBeNull();
        expect(edit).not.toHaveBeenCalled();
        expect(comment).not.toHaveBeenCalled();
    });

    it.each([[800, 'More reading tools'], [375, 'More options']] as const)(
        'opens the section commands directly in the existing overflow at %ipx', async (viewport, label) => {
            width = viewport;
            await render();
            const trigger = button(label)!;
            expect(button('Section actions')).toBeNull();
            await click(trigger);
            const popup = document.querySelector(`[role="dialog"][aria-label="${label}"]`)!;
            const commands = popup.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Current section"] button');
            expect([...commands].map(item => item.textContent)).toEqual(['Edit section', 'Comment on blocks']);
            await click(commands[1]);
            expect(comment).toHaveBeenCalledOnce();
            expect(edit).not.toHaveBeenCalled();
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
        },
    );

    it('keeps eligible actions available for a single section and omits unavailable commands', async () => {
        fixture.page = sampleArticle(['Only section']);
        await render({ onCommentOnBlocks: comment });
        expect(button('Next section')).toBeNull();
        await click(button('Section actions')!);
        expect([...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent)).toEqual(['Comment on blocks']);
        await render({});
        expect(button('Section actions')).toBeNull();
        expect(document.querySelector('[role="menu"]')).toBeNull();
        fixture.page = samplePage();
        await render();
        expect(button('Section actions')).toBeNull();
    });
});
