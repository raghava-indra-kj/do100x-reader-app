import { observer } from 'mobx-react-lite';
import { useMemo, useRef, useState } from 'react';
import type { Page } from '@domain/page/models/page';
import type { MarkdownSectionRange } from '@reader/md-ast';
import { SectionEditDialog } from './section-edit-dialog';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { SectionReader } from './section-reader';
import { AlertTriangle, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { PageSkeletonLoader } from './page-skeleton-loader';
import { Button } from '@modules/core/ui/primitives/button';
import { SelectionPopover } from './selection-popover';
import { EmptyPagePlaceholder } from './empty-page-placeholder';
import { ReaderAnnotations } from './reader-annotations';
import { PageAnnotationControls, PageAnnotationSlot } from './page-annotations';
import { annotationTargetFor } from '../page-annotation-target';
import type { BlockCommentSelection } from './comment-target';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';
import './reader-experience.css';
import './reader-annotations.css';

export const PageMain = observer(function PageMain() {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const contentRef = useRef<HTMLDivElement>(null);
    const [blockSelection, setBlockSelection] = useState<BlockCommentSelection | null>(null);
    // Pin the snapshot outside the keyed reader so a refresh never destroys an
    // open draft. The server will reject a stale snapshot at save time.
    const [editing, setEditing] = useState<{ page: Page; range: MarkdownSectionRange } | null>(null);
    const editor = editing && <SectionEditDialog page={editing.page} range={editing.range} onClose={() => setEditing(null)} />;
    const annotationPage = store.optCurrentPage;
    const annotationSection = store.currentSection;
    const annotationTarget = useMemo(
        () => annotationPage && annotationSection ? annotationTargetFor(annotationPage, annotationSection.sourceRange) : null,
        [annotationPage, annotationSection],
    );

    if (store.initDataState.isError) {
        return (
            <><div className="flex h-full items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm p-6 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Couldn’t load this page</h3>
                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                            {store.initDataState.error?.message || 'Couldn’t load the page. Try again.'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => store.loadPage()}
                        className="mt-2 flex items-center gap-1.5"
                    >
                        <RefreshCw size={13} />
                        <span>Try again</span>
                    </Button>
                </div>
            </div>{editor}</>
        );
    }

    if (!store.optCurrentPage || store.initDataState.isLoading) {
        return <><PageSkeletonLoader />{editor}</>;
    }

    const page = store.optCurrentPage;
    const section = store.currentSection;
    if (!section || page.isEmpty) {
        return <><EmptyPagePlaceholder page={page} />{editor}</>;
    }

    const uiSettings = store.uiSettingsStore;
    const maxLevel = store.headingLevel.value ?? 6;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;
    const currentIndex = store.navigableSections.indexOf(section);
    const previous = store.navigableSections[currentIndex - 1];
    const next = store.navigableSections[currentIndex + 1];

    const maxWidth = uiSettings.readingWidth === 'full' ? '100%' : uiSettings.readingWidth === 'wide' ? 1200 : 860;
    const theme = { colors, fontSizes: uiSettings.fontSize.value, fonts: uiSettings.fontFamilies.value };

    // Key takeaways render in their own lanes: the reading container below is scanned for the
    // page's Markdown (comment targets, highlights), so extra rendered Markdown must stay outside it.
    return (
        <>
            <div className="reader-takeaways-lane is-before" style={{ maxWidth }}>
                {annotationTarget && <PageAnnotationSlot target={annotationTarget} slot="before" {...theme} />}
            </div>
            <div ref={contentRef} tabIndex={-1} role="region" aria-label="Reading content" className="reader-reading-surface" style={{ maxWidth, paddingBottom: 0 }}>
                {!editing && <ReaderAnnotations page={page} containerRef={contentRef} onCompose={setBlockSelection} />}
                <SectionReader
                    key={`${section.id}:${page.contentVersion}`}
                    page={page}
                    section={section}
                    maxLevel={maxLevel}
                    {...theme}
                    onEdit={(range) => setEditing({ page, range })}
                    actions={page.isOwner && annotationTarget ? <PageAnnotationControls target={annotationTarget} sectionTitle={section.title} /> : undefined}
                />
                {!editing && <SelectionPopover
                    containerRef={contentRef}
                    page={page}
                    section={section}
                    blockSelection={blockSelection}
                    onClearBlocks={() => setBlockSelection(null)}
                />}
            </div>
            <div className="reader-takeaways-lane is-end" style={{ maxWidth }}>
                {annotationTarget && <PageAnnotationSlot target={annotationTarget} slot="after" {...theme} />}
                <nav className="reader-section-navigation" aria-label="Section navigation">
                    {previous ? <button type="button" onClick={() => store.goToPrevSection()}><ArrowLeft size={16} aria-hidden="true" /><span><small>Previous section</small><strong>{previous.title ?? 'Introduction'}</strong></span></button> : <span />}
                    {next ? <button type="button" onClick={() => store.goToNextSection()}><span><small>Next section</small><strong>{next.title ?? 'Introduction'}</strong></span><ArrowRight size={16} aria-hidden="true" /></button> : <span className="reader-section-end">End of this page · {store.navigableSections.length} sections</span>}
                </nav>
            </div>{editor}</>
    );
});
