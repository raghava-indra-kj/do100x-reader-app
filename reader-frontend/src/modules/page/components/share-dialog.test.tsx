import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';

const page = vi.hoisted(() => ({ pageId: 'shared page', isPublic: true }));
vi.mock('../store', () => ({ usePageStore: () => page }));
vi.mock('@modules/core/ui/primitives/dialog', () => ({
    Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    BaseDialog: { Close: ({ children }: { children: ReactNode }) => <button>{children}</button> },
}));
import { ShareDialog } from './share-dialog';

describe('Reader share addresses', () => {
    afterEach(() => { vi.unstubAllGlobals(); page.isPublic = true; });
    it.each(['https://do100x.com', 'http://localhost:5173'])('uses the current host and canonical document route on %s', origin => {
        vi.stubGlobal('window', { location: { origin } });
        const html = renderToStaticMarkup(<ShareDialog open onOpenChange={() => {}} />);
        expect(html).toContain(`value="${origin}/reader/pages/shared%20page"`);
        expect(html).not.toContain(`value="${origin}/pages/`);
    });
    it('does not display a public share address for private documents', () => {
        vi.stubGlobal('window', { location: { origin: 'https://do100x.com' } });
        page.isPublic = false;
        expect(renderToStaticMarkup(<ShareDialog open onOpenChange={() => {}} />)).not.toContain('value="https://do100x.com/reader/pages/shared%20page"');
    });
});
