import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import type { Page } from '@domain/page/models/page';
import type { MarkdownSectionRange } from '@reader/md-ast';
import { SectionEditDialog } from './section-edit-dialog';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { SectionReader } from './section-reader';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PageSkeletonLoader } from './page-skeleton-loader';
import { Button } from '@modules/core/ui/primitives/button';
import { SelectionPopover } from './selection-popover';
import { EmptyPagePlaceholder } from './empty-page-placeholder';
import '@reader/md-view/md-view.css';
import '@reader/md-view/md-view-hljs.css';

export const PageMain = observer(function PageMain() {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const contentRef = useRef<HTMLDivElement>(null);
    // Pin the snapshot outside the keyed reader so a refresh never destroys an
    // open draft. The server will reject a stale snapshot at save time.
    const [editing, setEditing] = useState<{ page: Page; range: MarkdownSectionRange } | null>(null);
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
    const section = store.currentSection;
    if (!section || page.isEmpty) {
        return <><EmptyPagePlaceholder page={page} />{editor}</>;
    }

    const uiSettings = store.uiSettingsStore;
    const maxLevel = store.headingLevel.value ?? 6;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

    return (
        <><div ref={contentRef} className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
            <SectionReader
                key={`${section.id}:${page.contentVersion}`}
                page={page}
                section={section}
                maxLevel={maxLevel}
                colors={colors}
                fontSizes={uiSettings.fontSize.value}
                fonts={uiSettings.fontFamilies.value}
                onEdit={(range) => setEditing({ page, range })}
            />
            {!editing && <SelectionPopover
                containerRef={contentRef}
                page={page}
                section={section}
            />}
        </div>{editor}</>
    );
});
