import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const { auth } = vi.hoisted(() => ({ auth: { status: 'authenticated', isAuthenticated: true, error: null as string | null, bootstrap: vi.fn() } }));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => auth }));
vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>do100x</header> }));
import HomePage from './page';

function renderHome() {
    return renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe('suite home', () => {
    beforeEach(() => { auth.status = 'authenticated'; auth.isAuthenticated = true; auth.error = null; });

    it('offers compact app links and learning/settings shortcuts when signed in', () => {
        const html = renderHome();
        expect(html).toContain('suite-home-workspace');
        expect(html).toContain('Your apps</h1>');
        expect(html).toContain('aria-label="Quick access"');
        expect(html).toContain('href="/reader/vocabulary"');
        expect(html).toContain('Review your saved words.');
        expect(html).toContain('href="/settings"');
        expect(html).not.toContain('suite-home-hero');
        expect(html).not.toContain('suite-home-features');
        expect(html).not.toContain('Sign in to get started');
        expect(html).not.toContain('<button');
    });

    it.each(['authenticated', 'anonymous'])('keeps all three tools as full-card links for %s users', status => {
        auth.status = status;
        auth.isAuthenticated = status === 'authenticated';
        const html = renderHome();
        for (const [name, route] of [['Reader', '/reader'], ['Finance', '/finance'], ['Tasks', '/tasks']]) {
            expect(html).toContain(`href="${route}"`);
            expect(html).toContain(`aria-label="Open ${name}"`);
        }
        expect(html.match(/class="suite-home-card /g)).toHaveLength(3);
        expect(html.match(/<h1\b/g)).toHaveLength(1);
        expect(html).toContain('aria-label="Choose an app"');
        expect(html).toContain('Read and organize your pages.');
        expect(html).toContain('Track spending and upcoming bills.');
        expect(html).toContain('Plan tasks and track your time.');
        // Card contents cannot contain buttons or other links.
        const cards = html.match(/<a\b[^>]*class="suite-home-card [\s\S]*?<\/a>/g) ?? [];
        expect(cards).toHaveLength(3);
        for (const card of cards) {
            expect(card.match(/<a\b/g)).toHaveLength(1);
            expect(card).not.toContain('<button');
        }
    });

    it('introduces real product benefits and a sign-in link for visitors', () => {
        auth.status = 'anonymous'; auth.isAuthenticated = false;
        const html = renderHome();
        expect(html).toContain('suite-home-marketing');
        expect(html).toContain('Read better.');
        expect(html).toContain('Plan your day.');
        expect(html).toContain('Track your money.');
        expect(html).toContain('href="/login"');
        expect(html).toContain('Sign in to get started');
        expect(html).toContain('Continue with Google.');
        expect(html).toContain('href="#home-tools"');
        expect(html).toContain('id="home-tools"');
        expect(html).toContain('Example workspace');
        expect(html.match(/class="suite-home-features"/g)).toHaveLength(3);
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
        expect(html).not.toContain('Sign in to get started');
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
