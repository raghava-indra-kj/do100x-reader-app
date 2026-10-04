import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// Make popup contents inspectable in SSR; actual popup/focus behavior is browser-verified.
vi.mock('@modules/core/ui/primitives/popover', () => ({ Popover: ({ content, children }: { content: ReactNode; children: ReactNode }) => <>{children}{content}</> }));
import { AppsSwitcher } from './apps-switcher';
import { AppBarLogo } from '@modules/core/ui/components/appbar/appbar-logo';

describe('suite navigation', () => {
    it('provides one accessible switcher with local links and current workspace', () => {
        const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/finance']}><AppsSwitcher /></MemoryRouter>);
        expect(html).toContain('aria-label="Switch apps"');
        expect(html).toContain('aria-label="Apps"');
        expect(html).toMatch(/<a(?=[^>]*href="\/finance")(?=[^>]*aria-current="page")[^>]*>/);
        expect(html).toContain('href="/reader"');
        expect(html).toContain('href="/tasks"');
        expect(html).toContain('Home');
        expect(html).not.toContain('All applications');
        expect(html).not.toContain('Your do100x tools');
        expect(html).not.toContain('<small>');
    });
    it('keeps the icon-only switcher accessible', () => {
        const html = renderToStaticMarkup(<MemoryRouter><AppsSwitcher compact /></MemoryRouter>);
        expect(html).toContain('aria-label="Switch apps"');
        expect(html).not.toContain('hidden sm:inline');
        expect(html).toContain('href="/reader"');
        expect(html).toContain('href="/finance"');
        expect(html).toContain('href="/tasks"');
    });
    it('uses a keyboard-accessible local home link and locally served official logo', () => {
        const html = renderToStaticMarkup(<MemoryRouter><AppBarLogo compact /></MemoryRouter>);
        expect(html).toContain('href="/"');
        expect(html).toContain('aria-label="do100x home"');
        expect(html).toContain('src="/branding/do100x-wordmark.png"');
        expect(html).toContain('suite-logo-compact');
        expect(html).not.toContain('onClick');
    });
});
