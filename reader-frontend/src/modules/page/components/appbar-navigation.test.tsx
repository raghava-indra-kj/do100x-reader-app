import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const fixture = vi.hoisted(() => ({
    auth: { isAuthenticated: true, currentUser: { label: 'reader@example.com' } },
    page: { title: 'Sample page', parentPageId: null as string | null, isPublic: false, isPubliclyAccessible: false, sections: [], content: '' },
}));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({ useMotivationPreferences: () => ({ motivationsEnabled: false }), canShowMotivations: () => false }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: () => {} }));
vi.mock('../store', () => ({ usePageStore: () => ({
    optCurrentPage: fixture.page, currentSection: null, navigableSections: [], parentPageTitle: 'Parent',
    headingLevel: { id: 'h2' }, dictionaryStore: { isOpen: false }, isOwner: false,
    uiSettingsStore: {},
}) }));
vi.mock('./settings', () => ({ PageSettingsDialog: () => null }));
vi.mock('./share-dialog', () => ({ ShareDialog: () => null }));
vi.mock('@modules/core/ui/components/motivation-reels', () => ({ MotivationReelsDialog: () => null }));
vi.mock('@modules/core/apps/apps-switcher', () => ({ AppsSwitcher: () => <button aria-label="Switch apps" /> }));
vi.mock('@modules/core/ui/components/theme-selector', () => ({ ThemeSelector: () => <button aria-label="Theme" /> }));
import { PageAppbar } from './appbar';

describe('Reader suite navigation boundaries', () => {
    beforeEach(() => { fixture.auth.isAuthenticated = true; fixture.page.isPubliclyAccessible = false; fixture.page.parentPageId = null; });
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
    it('retains the suite home link on nested pages alongside the parent navigation', () => {
        fixture.page.parentPageId = 'parent-page';
        const html = render();
        expect(html).toContain('aria-label="do100x home"');
        expect(html).toContain('Sample page');
        expect(html).toContain('Parent');
    });
    it('does not add private application controls to public reading pages', () => {
        fixture.page.isPubliclyAccessible = true;
        fixture.page.isPublic = true;
        const html = render();
        expect(html).not.toContain('Switch apps');
        expect(html).not.toContain('Find a page');
        expect(html).not.toContain('Public</span>');
        expect(html).not.toContain('Take a break');
        fixture.page.isPublic = false;
    });
    it('does not show a private switcher to anonymous readers', () => {
        fixture.auth.isAuthenticated = false;
        expect(render()).not.toContain('Switch apps');
    });
});
