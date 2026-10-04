import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';
import type { ButtonHTMLAttributes } from 'react';

const auth = vi.hoisted(() => ({
    isAuthenticated: true,
    currentUser: { label: 'reader@example.com', email: 'reader@example.com' },
}));
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => auth }));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({
    useMotivationPreferences: () => ({ motivationsEnabled: false }),
    canShowMotivations: () => false,
}));
vi.mock('@modules/core/ui/components/theme-selector', () => ({ ThemeSelector: () => null }));
vi.mock('./appbar-logo', () => ({ AppBarLogo: () => null }));
vi.mock('./logout-button', () => ({ LogoutButton: () => null }));
vi.mock('../motivation-reels', () => ({ MotivationReelsDialog: () => null }));
vi.mock('@modules/core/ui/primitives/button', () => ({
    Button: ({ children, 'aria-label': label }: ButtonHTMLAttributes<HTMLButtonElement>) => <button aria-label={label}>{children}</button>,
}));
import { AppBar } from './appbar';

describe('homepage app bar account identity', () => {
    it('shows only the avatar and keeps account identity accessible on the settings link', () => {
        auth.isAuthenticated = true;
        const html = renderToStaticMarkup(<MemoryRouter><AppBar /></MemoryRouter>);
        expect(html).toContain(`href="${settingsPageRoute}"`);
        expect(html).toContain('aria-label="Account settings — reader@example.com"');
        expect(html).toContain('title="Account settings — reader@example.com"');
        expect(html).not.toContain('>reader@example.com</span>');
        expect(html).not.toContain('max-w-40 truncate');
    });

    it('does not show an account identity for a logged-out visitor', () => {
        auth.isAuthenticated = false;
        const html = renderToStaticMarkup(<MemoryRouter><AppBar /></MemoryRouter>);
        expect(html).not.toContain('Account settings —');
        expect(html).not.toContain(auth.currentUser.label);
        auth.isAuthenticated = true;
    });
    it.each([['/finance', 'Finance'], ['/tasks', 'Tasks'], ['/reader/pages/example', 'Reader']])('uses the shared header and control order for %s', (path, name) => {
        const html = renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><AppBar /></MemoryRouter>);
        expect(html.match(/class="suite-appbar"/g)).toHaveLength(1);
        expect(html).toContain(`class="suite-appbar-name">${name}</span>`);
        expect(html).toContain('aria-label="Switch apps"');
        expect(html.indexOf('Switch apps')).toBeLessThan(html.indexOf('Account settings —'));
        expect(html).not.toContain('Sign out');
    });
});
