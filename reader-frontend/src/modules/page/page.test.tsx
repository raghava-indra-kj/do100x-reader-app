import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readerPageWithIdRoute, readerPageWithIdRouteValue } from '@boot/routes';

vi.mock('./view', () => ({ PageView: ({ pageId }: { pageId: string }) => <p>Document: {pageId}</p> }));
import PagePage from './page';

describe('Reader document route parameters', () => {
    it('passes the exact document ID to the existing Reader view', () => {
        const id = 'document with spaces';
        const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`${readerPageWithIdRouteValue(id)}?view=quizzes#answer`]}>
            <Routes><Route path={readerPageWithIdRoute} element={<PagePage />} /></Routes>
        </MemoryRouter>);
        expect(html).toContain(`Document: ${id}`);
    });
});
