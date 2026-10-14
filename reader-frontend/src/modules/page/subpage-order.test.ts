import { describe, expect, it } from 'vitest';
import { PageListItem } from '@domain/page/models/page-list-item';
import { groupSubpages, sortSubpages } from './subpage-order';
import { PageSubpageSort } from './theme/page-subpage-sort';

const row = (id: string, title: string, order: number, category: string | null = null) => new PageListItem({ id, title, sortOrder: order, category, parentPageId: 'parent', createdAt: new Date(`2026-10-${10 + order}T00:00:00Z`), updatedAt: new Date() });
describe('main and sidebar collection ordering', () => {
    it('uses saved ordering without mutating the fetched collection', () => {
        const rows = [row('a', 'Zebra', 2), row('b', 'Alpha', 0), row('c', 'Middle', 1)];
        expect(sortSubpages(rows, PageSubpageSort.SORT_ORDER).map(item => item.id)).toEqual(['b', 'c', 'a']);
        expect(rows.map(item => item.id)).toEqual(['a', 'b', 'c']);
        expect(sortSubpages(rows, PageSubpageSort.TITLE).map(item => item.id)).toEqual(['b', 'c', 'a']);
    });
    it('preserves ordering within groups and keeps uncategorized pages last', () => {
        const rows = [row('a', 'One', 0, 'Work'), row('b', 'Two', 1), row('c', 'Three', 2, 'Work'), row('d', 'Four', 3, 'Learn')];
        expect(groupSubpages(rows).map(group => [group.category, group.pages.map(item => item.id)])).toEqual([['Learn', ['d']], ['Work', ['a', 'c']], [null, ['b']]]);
    });
});
