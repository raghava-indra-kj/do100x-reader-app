import { useMemo, type MouseEvent, type ElementType } from 'react';
import type { Components } from 'react-markdown';
import { locateSections, type MarkdownSectionRange } from '@reader/md-ast';
import { MarkdownRenderer, type MarkdownRendererProps } from '@lib/markdown-renderer';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';

/** The entire reading chunk stays in one renderer, preserving cross-block Markdown context. */
export function SectionReader({ page, section, maxLevel, onSelectRange, ...theme }: {
    page: Page;
    section: Section;
    maxLevel: number;
    onSelectRange?: (range: MarkdownSectionRange) => void;
} & Pick<MarkdownRendererProps, 'colors' | 'fontSizes' | 'fonts'>) {
    const ranges = useMemo(() => locateSections(page.content), [page.content]);
    const own = section.sourceRange;
    const start = own?.headingStart ?? own?.bodyStart ?? 0;
    const end = ranges.find((range) => range.kind === 'heading' && range.headingStart! > start && range.level <= maxLevel)?.headingStart ?? page.content.length;
    const visible = useMemo(() => ranges.filter((range) => (range.headingStart ?? range.bodyStart) >= start && (range.headingStart ?? range.bodyStart) < end), [ranges, start, end]);

    const components = useMemo(() => {
        const overrides: Partial<Components> = {};
        for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
            overrides[tag] = ({ node, children, ...props }) => {
                const offset = node?.position?.start.offset;
                const range = offset === undefined ? undefined : visible.find((item) => item.headingStart === offset);
                const Tag = tag as ElementType;
                return <Tag {...props} className={`md-heading-${tag.slice(1)}`} data-reader-heading-start={range?.headingStart ?? undefined}>
                    {children}
                </Tag>;
            };
        }
        return overrides;
    }, [visible]);

    const selectClickedSection = (event: MouseEvent<HTMLDivElement>) => {
        if (!onSelectRange || !page.isOwner || !own || !(event.target instanceof Element) || event.target.closest('button,a,input,textarea,select') || window.getSelection()?.toString()) return;
        let candidate = visible[0];
        for (const marker of event.currentTarget.querySelectorAll<HTMLElement>('[data-reader-heading-start]')) {
            if (marker.contains(event.target) || (marker.compareDocumentPosition(event.target) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                candidate = visible.find((range) => range.headingStart === Number(marker.dataset.readerHeadingStart)) ?? candidate;
            }
        }
        if (candidate) onSelectRange(candidate);
    };

    return <div onClick={selectClickedSection}>
        <MarkdownRenderer className="reader-document-blocks" markdown={own ? page.content : section.chunkMarkdown(maxLevel)} document={own ? page.document ?? undefined : undefined} sourceRange={own ? { start, end } : undefined} {...theme} components={components} />
    </div>;
}
