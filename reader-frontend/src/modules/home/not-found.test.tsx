import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>do100x</header> }));
import NotFoundPage from './not-found';

describe('unknown suite addresses', () => {
    it('explains the missing page and offers an explicit home link without redirecting', () => {
        const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/pages/removed']}><NotFoundPage /></MemoryRouter>);
        expect(html).toContain('Page not found');
        expect(html).toContain('href="/"');
        expect(html).toContain('This page doesn’t exist. Go home to choose an app.');
        expect(html).toContain('Go home');
        expect(html).not.toContain('http-equiv');
    });
});
