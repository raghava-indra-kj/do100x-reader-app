import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, err } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { Page } from '@domain/page/models/page';
const services = vi.hoisted(() => ({ getPage: vi.fn(), swapSortOrder: vi.fn() }));
vi.mock('@domain/page/services/pages-service', () => ({ ...services, updatePageShareStatus: vi.fn() }));
vi.mock('@domain/comment/services/comments-service', () => ({ getComments: async () => ({ ok: true, data: [] }) }));
vi.mock('@domain/vocabulary/services/vocabulary-service', () => ({ getVocabulary: async () => ({ ok: true, data: { total: 0 } }) }));
vi.mock('./meaning-store', () => ({ MeaningStore: class {} }));
vi.mock('./doubt-store', () => ({ DoubtStore: class {} }));
vi.mock('./explanation-store', () => ({ ExplanationStore: class {} }));
import { PageStore } from './store';

const page = (isOwner = true) => new Page({ id: 'parent', parentPageId: null, title: 'Parent', content: 'Text', contentVersion: 1, category: null, childrenCount: 2, sections: [], createdAt: new Date(), updatedAt: new Date(), isOwner });
describe('synchronized Reader collection mutations', () => {
    beforeEach(() => { vi.clearAllMocks(); services.getPage.mockResolvedValue(ok(page())); });
    it('notifies both collection views only after a successful server reorder', async () => {
        const store = new PageStore({ pageId: 'parent' }); await store.loadPage();
        services.swapSortOrder.mockResolvedValue(ok(undefined));
        expect(await store.reorderSubpages('a', 'b')).toBeNull();
        expect(store.subpagesVersion).toBe(1);
        expect(store.reorderingSubpages).toBe(false);
        services.swapSortOrder.mockResolvedValue(err(new AppError({ message: 'Unable to save' })));
        expect(await store.reorderSubpages('a', 'b')).toBe('Unable to save');
        expect(store.subpagesVersion).toBe(1);
    });
    it('serializes simultaneous reorder requests from the two views', async () => {
        const store = new PageStore({ pageId: 'parent' }); await store.loadPage();
        let finish!: (value: ReturnType<typeof ok<void>>) => void;
        services.swapSortOrder.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        const pending = store.reorderSubpages('a', 'b');
        expect(store.reorderingSubpages).toBe(true);
        await store.reorderSubpages('b', 'a');
        expect(services.swapSortOrder).toHaveBeenCalledTimes(1);
        finish(ok(undefined)); await pending;
        expect(store.subpagesVersion).toBe(1);
    });
    it('does not reorder visitor pages or make a request for an unchanged position', async () => {
        services.getPage.mockResolvedValue(ok(page(false)));
        const store = new PageStore({ pageId: 'parent' }); await store.loadPage();
        await store.reorderSubpages('a', 'b');
        expect(services.swapSortOrder).not.toHaveBeenCalled();
        services.getPage.mockResolvedValue(ok(page())); await store.loadPage();
        await store.reorderSubpages('a', 'a');
        expect(services.swapSortOrder).not.toHaveBeenCalled();
    });
});
