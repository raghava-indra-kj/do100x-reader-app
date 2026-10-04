import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const auth = vi.hoisted(() => ({ status: 'anonymous', isAuthenticated: false }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock('./store', () => ({ useAuthStore: () => auth }));
vi.mock('react-router-dom', async importOriginal => ({
    ...await importOriginal<typeof import('react-router-dom')>(),
    Navigate: (props: { to: string; state?: unknown }) => { redirect(props); return null; },
}));
vi.mock('@modules/core/ui/primitives/button', () => ({ Button: ({ children }: { children: ReactNode }) => <button>{children}</button> }));
import { AuthGuard } from './guard';

describe('suite sign-in destinations', () => {
    it.each(['/reader', '/finance', '/tasks', '/settings'])('keeps %s behind sign-in and remembers that exact app', path => {
        auth.status = 'anonymous'; auth.isAuthenticated = false; redirect.mockClear();
        const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`${path}?view=default#start`]}><AuthGuard><p>Private application</p></AuthGuard></MemoryRouter>);
        expect(html).not.toContain('Private application');
        expect(redirect).toHaveBeenCalledWith(expect.objectContaining({ to: '/login', state: { returnTo: `${path}?view=default#start` } }));
    });
    it('still renders an authenticated application', () => {
        auth.status = 'authenticated'; auth.isAuthenticated = true; redirect.mockClear();
        const html = renderToStaticMarkup(<MemoryRouter><AuthGuard><p>Private application</p></AuthGuard></MemoryRouter>);
        expect(html).toContain('Private application');
        expect(redirect).not.toHaveBeenCalled();
    });
});
