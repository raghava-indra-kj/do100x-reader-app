import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@modules/core/ui/components/appbar', () => ({ AppBar: () => <header>do100x</header> }));
import HomePage from './page';

describe('compact suite home', () => {
    it('makes all three apps first-class links without nested buttons or marketing sections', () => {
        const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
        for (const [name, route] of [['Reader', '/reader'], ['Finance', '/finance'], ['Tasks', '/tasks']]) {
            expect(html).toContain(`href="${route}"`);
            expect(html).toContain(`aria-label="Open ${name}"`);
        }
        expect(html.match(/class="suite-home-card /g)).toHaveLength(3);
        expect(html.match(/<h1\b/g)).toHaveLength(1);
        expect(html).toContain('aria-label="Choose an app"');
        expect(html).toContain('Your apps</h1>');
        expect(html).toContain('Read and organize your pages.');
        expect(html).toContain('Track spending and upcoming bills.');
        expect(html).toContain('Plan tasks and track your time.');
        expect(html.match(/class="suite-home-open"/g)).toHaveLength(3);
        for (const oldCopy of ['Do everything', '100 times better', 'One Google account', 'Built for your everyday', 'Markdown', 'Read with clarity', 'Know your cash flow', 'Make room for progress']) {
            expect(html).not.toContain(oldCopy);
        }
        expect(html).not.toContain('suite-home-tagline');
        expect(html).not.toContain('suite-home-footer');
        expect(html).not.toContain('<button');
        expect(html).not.toContain('Why Reader?');
        expect(html).not.toContain('https://reader.do100x.com');
    });
});
