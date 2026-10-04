import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';

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
    Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
import { AppBar } from './appbar';

describe('homepage app bar account identity', () => {
    it('shows the account name beside the avatar and links to settings without requiring stored credentials', () => {
        auth.isAuthenticated = true;
        const html = renderToStaticMarkup(<MemoryRouter><AppBar /></MemoryRouter>);
        expect(html).toContain(`href="${settingsPageRoute}"`);
        expect(html).toContain('aria-label="Logged in as reader@example.com — Open Settings"');
        expect(html).toContain('sm:block">reader@example.com</span>');
        expect(html).toContain('max-w-40 truncate');
    });

    it('does not show an account identity for a logged-out visitor', () => {
        auth.isAuthenticated = false;
        const html = renderToStaticMarkup(<MemoryRouter><AppBar /></MemoryRouter>);
        expect(html).not.toContain('Logged in as');
        expect(html).not.toContain(auth.currentUser.label);
        auth.isAuthenticated = true;
    });
});
