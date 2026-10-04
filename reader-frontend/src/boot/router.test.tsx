import { describe, expect, it, vi } from 'vitest';
import { createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { isValidElement, type ReactNode } from 'react';

vi.mock('@modules/auth/provider', () => ({
    AuthGuard: ({ children }: { children: ReactNode }) => children,
    AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({ MotivationPreferencesProvider: ({ children }: { children: ReactNode }) => children }));
import { AuthGuard } from '@modules/auth/provider';
import { ApplicationRoutes } from './router';
import { readerPageWithIdRoute, readerPageWithIdRouteValue } from './routes';

describe('do100x browser route contract', () => {
    const routes = createRoutesFromChildren(ApplicationRoutes().props.children);
    const resolve = (path: string) => matchRoutes(routes, path)!.at(-1)!;

    it('registers only current suite routes and a not-found screen', () => {
        expect(routes.map(route => route.path)).toEqual(['/', '/reader/pages/:id', '/login', '/reader', '/settings', '/tasks', '/finance', '*']);
    });
    it.each(['/reader', '/finance', '/tasks', '/settings'])('keeps the private app %s behind the existing guard', path => {
        const element = resolve(path).route.element;
        expect(isValidElement(element) && element.type).toBe(AuthGuard);
    });
    it('resolves public Reader document URLs without a blanket sign-in guard', () => {
        const match = resolve('/reader/pages/shared-document');
        expect(match.route.path).toBe(readerPageWithIdRoute);
        expect(match.params.id).toBe('shared-document');
        expect(isValidElement(match.route.element) && match.route.element.type).not.toBe(AuthGuard);
    });
    it.each(['/pages/a', '/md-view', '/md-parser', '/reader/pages', '/reader/pages/a/extra', '/missing'])('uses not-found instead of a compatibility redirect for %s', path => {
        expect(resolve(path).route.path).toBe('*');
    });
    it('builds canonical Reader URLs and safely encodes the document ID', () => {
        expect(readerPageWithIdRouteValue('page-123')).toBe('/reader/pages/page-123');
        const id = 'id with spaces/#?';
        expect(readerPageWithIdRouteValue(id)).toBe('/reader/pages/id%20with%20spaces%2F%23%3F');
        expect(resolve(readerPageWithIdRouteValue(id)).params.id).toBe(id);
    });
});
