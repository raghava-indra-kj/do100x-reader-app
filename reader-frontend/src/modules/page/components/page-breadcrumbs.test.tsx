// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Page } from '@domain/page/models/page';
import { PageListItem } from '@domain/page/models/page-list-item';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { getPageNavigation, queryPages } from '@domain/page/services/pages-service';
import { PageBreadcrumbs } from './page-breadcrumbs';

vi.mock('@domain/page/services/pages-service', () => ({ getPageNavigation: vi.fn(), queryPages: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const page = new Page({
    id: 'article', title: 'An unusually long chapter title', parentPageId: 'book',
    ancestors: [{ id: 'root', title: 'My library' }, { id: 'book', title: 'Book' }],
    category: null, content: 'Article', contentVersion: 1, sections: [], childrenCount: 0,
    createdAt: new Date(0), updatedAt: new Date(0),
});

function CurrentRoute() { return <output>{useLocation().pathname}</output>; }
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.mocked(getPageNavigation).mockReset().mockResolvedValue(ok({
        path: [...page.ancestors, page],
        children: [
            { id: 'book', title: 'Book', parentPageId: 'root', childrenCount: 1 },
            { id: 'manual', title: 'Other book', parentPageId: 'root', childrenCount: 1 },
            { id: page.id, title: page.title, parentPageId: 'book', childrenCount: 1 },
            { id: 'appendix', title: 'Appendix', parentPageId: page.id, childrenCount: 0 },
        ],
    }));
    vi.mocked(queryPages).mockReset().mockResolvedValue(ok([
        new PageListItem({ id: 'glossary', title: 'Glossary', parentPageId: 'manual', category: null, sortOrder: 1, createdAt: new Date(0), updatedAt: new Date(0) }),
    ]));
});
afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
    vi.unstubAllGlobals();
});

describe('page path picker', () => {
    it.each([false, true])('shows full labels and navigates straight to a higher ancestor (compact: %s)', async compact => {
        await act(async () => root.render(<MemoryRouter><PageBreadcrumbs page={page} compact={compact} /><CurrentRoute /></MemoryRouter>));
        const trigger = document.querySelector('button')!;
        expect(trigger.textContent).toBe(page.title);
        expect(getPageNavigation).not.toHaveBeenCalled();
        await act(async () => trigger.click());
        const path = document.querySelector('[role="dialog"][aria-label="Page path"]')!;
        const ancestors = Array.from(path.querySelectorAll('a'));
        expect(ancestors.map(link => link.textContent)).toEqual(['My library', 'Book', 'Appendix', 'Other book']);
        expect(path.querySelector('[aria-current="page"]')?.textContent).toBe(page.title);
        expect(getPageNavigation).toHaveBeenCalledTimes(1);
        expect(queryPages).not.toHaveBeenCalled();
        const expand = path.querySelector<HTMLButtonElement>('button[aria-label="Expand Other book"]')!;
        await act(async () => expand.click());
        expect(path.querySelector('a[href="/reader/pages/glossary"]')?.textContent).toBe('Glossary');
        expect(queryPages).toHaveBeenCalledTimes(1);
        await act(async () => ancestors[0].click());
        expect(document.querySelector('output')?.textContent).toBe('/reader/pages/root');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
    it('preserves real titles and permits retry when the tree cannot load', async () => {
        vi.mocked(getPageNavigation).mockResolvedValueOnce(err(new AppError({ message: 'Offline' })));
        await act(async () => root.render(<MemoryRouter><PageBreadcrumbs page={page} /></MemoryRouter>));
        await act(async () => document.querySelector('button')!.click());
        const popup = document.querySelector('[role="dialog"]')!;
        expect(popup.querySelector('a[href="/reader/pages/root"]')?.textContent).toBe('My library');
        const retry = popup.querySelector<HTMLButtonElement>('[role=status] button')!;
        await act(async () => retry.click());
        expect(popup.querySelector('a[href="/reader/pages/manual"]')).not.toBeNull();
    });
});
