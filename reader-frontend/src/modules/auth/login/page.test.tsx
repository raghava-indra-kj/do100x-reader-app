// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { suiteApps } from '@modules/core/apps/app-catalog';

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

    it('changes the image and caption for every app while keeping Google sign-in mounted', async () => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        const host = document.createElement('div');
        const root = createRoot(host);
        try {
            await act(async () => root.render(<MemoryRouter><LoginPage /></MemoryRouter>));
            const signIn = host.querySelector('.login-controls button');
            const buttons = host.querySelectorAll<HTMLButtonElement>('[aria-controls="login-app-preview"]');
            const images = new Set<string>();
            expect(signIn?.textContent).toBe('Sign in with Google');
            expect(Array.from(buttons, button => button.textContent)).toEqual(suiteApps.map(app => app.name));
            for (const [index, app] of suiteApps.entries()) {
                await act(async () => buttons[index].click());
                expect(host.querySelector('button[aria-pressed="true"]')).toBe(buttons[index]);
                expect(host.querySelector('figcaption h2')?.textContent).toBe(app.name);
                expect(host.querySelector('figcaption p')?.textContent).toBe(app.description);
                const src = host.querySelector('figure img')?.getAttribute('src');
                expect(src).toBeTruthy();
                images.add(src!);
                expect(host.querySelector('.login-controls button')).toBe(signIn);
            }
            expect(images.size).toBe(suiteApps.length);
        } finally {
            await act(async () => root.unmount());
            vi.unstubAllGlobals();
        }
    });
});
