import type { PageListItem } from '@domain/page/models/page-list-item';
import type { PageSubpageSort } from './theme/page-subpage-sort';

export function sortSubpages(pages: PageListItem[], sort: PageSubpageSort): PageListItem[] {
    return [...pages].sort((a, b) => {
        if (sort.key === 'title') return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
        if (sort.key === 'createdAt') return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
        return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
    });
}

export function groupSubpages(pages: PageListItem[]): { category: string | null; pages: PageListItem[] }[] {
    const groups = new Map<string | null, PageListItem[]>();
    for (const page of pages) groups.set(page.category, [...(groups.get(page.category) ?? []), page]);
    return [...groups].sort(([a], [b]) => a === null ? 1 : b === null ? -1 : a.localeCompare(b))
        .map(([category, items]) => ({ category, pages: items }));
}
