import { observer } from 'mobx-react-lite';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
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
import type { BlockCommentSelection } from './comment-target';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';
import './reader-experience.css';
import './reader-annotations.css';
import './reading-width.css';

export interface ReaderSectionActions {
    editSection(): void;
    commentOnBlocks(): void;
}

export const PageMain = observer(function PageMain({ ref }: { ref?: Ref<ReaderSectionActions> }) {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const currentPage = store.optCurrentPage;
    const section = store.currentSection;
    const maxLevel = store.headingLevel.value ?? 6;
    const contentRef = useRef<HTMLDivElement>(null);
    const clickedRange = useRef<MarkdownSectionRange | null>(null);
    const [selectingVersion, setSelectingVersion] = useState<number | null>(null);
    const [blockSelection, setBlockSelection] = useState<BlockCommentSelection | null>(null);
    // Pin the snapshot outside the keyed reader so a refresh never destroys an
    // open draft. The server will reject a stale snapshot at save time.
    const [editing, setEditing] = useState<{ page: Page; range: MarkdownSectionRange } | null>(null);
    // Heading offsets belong to the section and revision in which they were picked.
    useEffect(() => { clickedRange.current = null; }, [currentPage, section, maxLevel]);
    useImperativeHandle(ref, () => ({
        editSection() {
            if (currentPage?.isOwner && section?.sourceRange) {
                setEditing({ page: currentPage, range: clickedRange.current ?? section.sourceRange });
            }
        },
        commentOnBlocks() {
            if (currentPage?.document && section) setSelectingVersion(currentPage.contentVersion);
        },
    }), [currentPage, section]);
    const editor = editing && <SectionEditDialog page={editing.page} range={editing.range} onClose={() => setEditing(null)} />;
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
    if (!section || page.isEmpty) {
        return <><EmptyPagePlaceholder page={page} />{editor}</>;
    }

    const uiSettings = store.uiSettingsStore;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;
    const currentIndex = store.navigableSections.indexOf(section);
    const previous = store.navigableSections[currentIndex - 1];
    const next = store.navigableSections[currentIndex + 1];
    const theme = { colors, fontSizes: uiSettings.fontSize.value, fonts: uiSettings.fontFamilies.value };

    return (
        <div className="reader-page-layout" data-reading-width={uiSettings.readingWidth}>
            <div ref={contentRef} role="region" aria-label="Reading content" className="reader-reading-surface">
                <ReaderAnnotations key={`${page.id}:${page.contentVersion}`} enabled={!editing} page={page} containerRef={contentRef}
                    selecting={selectingVersion === page.contentVersion} onEndSelection={() => setSelectingVersion(null)} onCompose={setBlockSelection}>
                    <SectionReader
                        key={section.id}
                        page={page}
                        section={section}
                        maxLevel={maxLevel}
                        {...theme}
                        onSelectRange={range => { clickedRange.current = range; }}
                    />
                </ReaderAnnotations>
                {!editing && <SelectionPopover
                    containerRef={contentRef}
                    page={page}
                    section={section}
                    blockSelection={blockSelection}
                    onClearBlocks={() => setBlockSelection(null)}
                />}
            </div>
            {(previous || next) && <nav className="reader-section-navigation" aria-label="Section navigation">
                {previous && <button type="button" className="reader-section-step" onClick={() => store.goToPrevSection()}>
                    <span className="reader-step-arrow"><ArrowLeft size={17} aria-hidden="true" /></span>
                    <span className="reader-step-destination"><small>Previous section</small><strong>{previous.title || 'Introduction'}</strong></span>
                </button>}
                {next && <button type="button" className="reader-section-step is-next" onClick={() => store.goToNextSection()}>
                    <span className="reader-step-destination"><small>Next section</small><strong>{next.title || 'Introduction'}</strong></span>
                    <span className="reader-step-arrow"><ArrowRight size={17} aria-hidden="true" /></span>
                </button>}
            </nav>}
            {editor}
        </div>
    );
});
