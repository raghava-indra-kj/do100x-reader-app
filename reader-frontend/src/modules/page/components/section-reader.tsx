import { useMemo, useRef, useState, type MouseEvent, type ElementType } from 'react';
import type { Components } from 'react-markdown';
import { Pencil } from 'lucide-react';
import { locateSections, type MarkdownSectionRange } from '@reader/md-ast';
import { MarkdownRenderer, type MarkdownRendererProps } from '@reader/md-view';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';

/** The entire reading chunk stays in one renderer, preserving cross-block Markdown context. */
export function SectionReader({ page, section, maxLevel, onEdit, ...theme }: {
    page: Page;
    section: Section;
    maxLevel: number;
    onEdit: (range: MarkdownSectionRange) => void;
} & Pick<MarkdownRendererProps, 'colors' | 'fontSizes' | 'fonts'>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const ranges = useMemo(() => locateSections(page.content), [page.content]);
    const own = section.sourceRange;
    const start = own?.headingStart ?? own?.bodyStart ?? 0;
    const end = ranges.find((range) => range.kind === 'heading' && range.headingStart! > start && range.level <= maxLevel)?.headingStart ?? page.content.length;
    const visible = ranges.filter((range) => (range.headingStart ?? range.bodyStart) >= start && (range.headingStart ?? range.bodyStart) < end);
    const [selected, setSelected] = useState<MarkdownSectionRange | null>(own ?? visible[0] ?? null);
    const canEdit = page.isOwner && Boolean(own);

    const components = useMemo(() => {
        const overrides: Partial<Components> = {};
        for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
            overrides[tag] = ({ node, children }) => {
                const offset = node?.position?.start.offset;
                const range = offset === undefined ? undefined : visible.find((item) => item.headingStart === start + offset);
                const Tag = tag as ElementType;
                return <Tag className={`md-heading-${tag.slice(1)}`} data-reader-heading-start={range?.headingStart ?? undefined}>
                    {children}
                </Tag>;
            };
        }
        return overrides;
    }, [page.content, start, end]);

    const selectClickedSection = (event: MouseEvent<HTMLDivElement>) => {
        if (!canEdit || !(event.target instanceof Element) || event.target.closest('button,a,input,textarea,select') || window.getSelection()?.toString()) return;
        let candidate = visible[0];
        for (const marker of containerRef.current?.querySelectorAll<HTMLElement>('[data-reader-heading-start]') ?? []) {
            if (marker.contains(event.target) || (marker.compareDocumentPosition(event.target) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                candidate = visible.find((range) => range.headingStart === Number(marker.dataset.readerHeadingStart)) ?? candidate;
            }
        }
        if (candidate) setSelected(candidate);
    };

    return <>
        {canEdit && selected && <div className="sticky top-0 z-10 mb-2 ml-auto w-fit rounded-md bg-[var(--color-surface-canvas)]">
            <button type="button" title={`Edit only: ${selected.title ?? 'Introduction / page body'}`} aria-label={`Edit only: ${selected.title ?? 'Introduction / page body'}`} onClick={() => onEdit(selected)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]">
                <Pencil size={14} aria-hidden="true" />
            </button>
        </div>}
        <div ref={containerRef} onClick={selectClickedSection}>
            <MarkdownRenderer markdown={own ? page.content.slice(start, end) : section.chunkMarkdown(maxLevel)} {...theme} components={components} />
        </div>
    </>;
}
