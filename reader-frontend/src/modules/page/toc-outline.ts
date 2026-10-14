import type { Section } from '@domain/page/models/section';

export interface OutlineNode { section: Section; children: OutlineNode[]; label?: string; }

/** Keep the ancestor context of search matches, without inventing heading levels. */
export function buildOutline(sections: Section[], maxLevel: number, query = ''): OutlineNode[] {
    const term = query.trim().toLocaleLowerCase();
    return sections.flatMap(section => {
        const children = buildOutline(section.children, maxLevel, query);
        if (section.level > maxLevel) return children;
        const matches = (section.title ?? section.rawTitle ?? 'Introduction').toLocaleLowerCase().includes(term);
        return !term || matches || children.length ? [{ section, children }] : [];
    });
}
export function outlineAncestors(nodes: OutlineNode[], id: string): string[] {
    for (const node of nodes) {
        if (node.section.id === id) return [id];
        const path = outlineAncestors(node.children, id);
        if (path.length) return [node.section.id, ...path];
    }
    return [];
}
export function outlineBranches(nodes: OutlineNode[]): string[] {
    return nodes.flatMap(node => node.children.length ? [node.section.id, ...outlineBranches(node.children)] : []);
}

/** The page title already provides the outer hierarchy; show its body as Overview. */
export function compactOutline(nodes: OutlineNode[], pageTitle: string): OutlineNode[] {
    const root = nodes[0];
    if (nodes.length !== 1 || !root.children.length || root.section.title?.trim() !== pageTitle.trim()) return nodes;
    return [{ section: root.section, children: [], label: 'Overview' }, ...root.children];
}

export function filterOutline(nodes: OutlineNode[], query: string): OutlineNode[] {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return nodes;
    return nodes.flatMap(node => {
        const children = filterOutline(node.children, query);
        const title = node.label ?? node.section.title ?? node.section.rawTitle ?? 'Introduction';
        return title.toLocaleLowerCase().includes(term) || children.length ? [{ ...node, children }] : [];
    });
}
