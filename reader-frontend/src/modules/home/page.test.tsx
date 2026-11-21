// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { suiteApps } from '@modules/core/apps/app-catalog';
import { featureImages } from '@modules/core/branding';

const { auth } = vi.hoisted(() => ({ auth: { status: 'authenticated', isAuthenticated: true, error: null as string | null, bootstrap: vi.fn() } }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => auth }));
vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>do100x</header> }));
import HomePage from './page';

function renderHome() {
    return renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe('suite home', () => {
    beforeEach(() => { auth.status = 'authenticated'; auth.isAuthenticated = true; auth.error = null; });

    it('keeps the workspace heading for screen readers and groups the secondary destinations', () => {
        const page = new DOMParser().parseFromString(renderHome(), 'text/html');
        const heading = page.querySelector('main h1');
        expect(heading?.textContent).toBe('Workspace');
        expect(heading?.classList.contains('sr-only')).toBe(true);
        expect(page.body.textContent).not.toContain('Your apps');
        const shortcuts = page.querySelectorAll('nav[aria-label="Quick access"] a');
        expect(Array.from(shortcuts, link => link.getAttribute('href')).sort()).toEqual([
            '/chrome-extension', '/reader/vocabulary', '/settings',
        ]);
        expect(page.querySelector('a[href="/login"]')).toBeNull();
    });

    it.each(['authenticated', 'anonymous'])('keeps all five tools as full-card links for %s users', status => {
        auth.status = status;
        auth.isAuthenticated = status === 'authenticated';
        const page = new DOMParser().parseFromString(renderHome(), 'text/html');
        const launcher = page.querySelector('nav[aria-label="Choose an app"]');
        expect(page.querySelectorAll('h1')).toHaveLength(1);
        expect(launcher?.querySelectorAll('a')).toHaveLength(5);
        for (const app of suiteApps) {
            const link = launcher?.querySelector(`a[aria-label="Open ${app.name}"]`);
            expect(link?.getAttribute('href')).toBe(app.route);
            expect(link?.textContent).toContain(app.name);
            expect(link?.textContent).toContain(app.description);
            expect(link?.querySelector('a, button')).toBeNull();
        }
    });

    it('pairs each signed-in app link with its own photo and an explicit open action', () => {
        const page = new DOMParser().parseFromString(renderHome(), 'text/html');
        const photos = new Set<string | null | undefined>();
        for (const app of suiteApps) {
            const link = page.querySelector(`a[aria-label="Open ${app.name}"]`);
            expect(link?.textContent).toContain(`Open ${app.name}`);
            const photo = link?.querySelector('img');
            const source = photo?.getAttribute('src');
            expect(source).toBe(featureImages[app.id]);
            expect(photo?.getAttribute('alt')).toBe('');
            photos.add(source);
        }
        expect(photos.size).toBe(suiteApps.length);
    });

    it('introduces real product benefits and a sign-in link for visitors', () => {
        auth.status = 'anonymous'; auth.isAuthenticated = false;
        const html = renderHome();
        expect(html).toContain('suite-home-marketing');
        expect(html).toContain('Your day,');
        expect(html).toContain('in one place.');
        expect(html).toContain('Save reading notes, plan tasks on your calendar, track spending, and build habits.');
        expect(html).toContain('href="/login"');
        expect(html).toContain('Continue with Google');
        expect(html).toContain('href="#home-tools"');
        expect(html).toContain('id="home-tools"');
        expect(html).toContain('href="/chrome-extension"');
        expect(html).toContain('Chrome extension');
        expect(html).toContain('Get extension');
        expect(html).toContain('Explore the apps');
        expect(html).not.toContain('aria-label="Quick access"');
        for (const copy of ['One Google account', 'Built for your everyday', 'Markdown', '100 times better', 'https://reader.do100x.com']) {
            expect(html).not.toContain(copy);
        }
    });

    it('does not flash marketing or authenticated shortcuts while checking the session', () => {
        auth.status = 'loading'; auth.isAuthenticated = false;
        const html = renderHome();
        expect(html).toContain('role="status"');
        expect(html).toContain('Checking sign-in…');
        expect(html).not.toContain('suite-home-hero');
        expect(html).not.toContain('Continue with Google');
        expect(html).not.toContain('aria-label="Quick access"');
    });

    it('keeps a failed session check visible and retryable instead of assuming sign-out', () => {
        auth.status = 'error'; auth.isAuthenticated = false; auth.error = 'Could not check your session.';
        const html = renderHome();
        expect(html).toContain('role="alert"');
        expect(html).toContain('Could not check your session.');
        expect(html).toContain('Retry sign-in check');
        expect(html).not.toContain('suite-home-marketing');
        expect(html).not.toContain('href="/reader/vocabulary"');
    });
});
