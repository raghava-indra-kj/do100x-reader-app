import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
    isAuthenticated: false,
    status: 'anonymous',
    error: null as string | null,
    bootstrap: vi.fn(),
}));
vi.mock('../provider/store', () => ({ useAuthStore: () => auth }));
vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>do100x</header> }));
vi.mock('./google-sign-in', () => ({ GoogleSignIn: () => <button>Sign in with Google</button> }));
import LoginPage from './page';

describe('suite sign-in copy', () => {
    beforeEach(() => { auth.status = 'anonymous'; auth.error = null; });
    const render = () => renderToStaticMarkup(<MemoryRouter><LoginPage /></MemoryRouter>);

    it('keeps sign-in instructions brief and retains the Google control', () => {
        const html = render();
        expect(html).toContain('Sign in to do100x</h1>');
        expect(html).toContain('Sign in to continue.');
        expect(html).toContain('Sign in with Google');
        expect(html).not.toContain('One Google account');
        expect(html).not.toContain('Welcome to');
    });

    it('identifies the sign-in check without presenting another sign-in control', () => {
        auth.status = 'loading';
        const html = render();
        expect(html).toContain('role="status"');
        expect(html).toContain('Checking sign-in…');
        expect(html).not.toContain('Sign in with Google');
    });

    it('preserves the actual error and retry action', () => {
        auth.status = 'error'; auth.error = 'Example sign-in failure';
        const html = render();
        expect(html).toContain('role="alert"');
        expect(html).toContain(auth.error);
        expect(html).toContain('Retry');
        expect(html).not.toContain('Sign in with Google');
    });
});
