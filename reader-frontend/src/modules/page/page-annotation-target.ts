import { locateSections, sectionAnchorKeys, sectionSubtreeSource, type MarkdownSectionRange } from '@reader/md-ast';
import type { Page } from '@domain/page/models/page';
import type { PageAnnotation, PageAnnotationAnchorInput } from '@domain/page-annotation/models/page-annotation';

/** What key takeaways attach to: one heading with everything under it, or the whole page. */
export interface PageAnnotationTarget {
    /** `page`, or the heading's anchor key from `sectionAnchorKeys`. */
    key: string;
    anchor: PageAnnotationAnchorInput;
    title: string;
    /** Full source the takeaways are written from. */
    source: string;
}

export const annotationKeyOf = (anchor: PageAnnotation['anchor']): string => anchor.type === 'page' ? 'page' : anchor.key;

export function annotationTargetFor(page: Page, range: MarkdownSectionRange | undefined): PageAnnotationTarget {
    const wholePage: PageAnnotationTarget = { key: 'page', anchor: { type: 'page' }, title: page.title, source: page.content };
    if (!range) return wholePage;
    const ranges = locateSections(page.content);
    const index = ranges.findIndex((item) => item.kind === range.kind && item.headingStart === range.headingStart && item.bodyStart === range.bodyStart);
    if (index < 0) return wholePage;
    const key = sectionAnchorKeys(ranges)[index];
    return { key, anchor: { type: 'heading', key }, title: range.title ?? 'Introduction', source: sectionSubtreeSource(page.content, ranges, index) };
}
