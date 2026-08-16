import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@reader/md-view';
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

    if (store.initDataState.isError) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-center max-w-sm p-6 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-[var(--color-text-strong)]">Failed to load page</h3>
                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                            {store.initDataState.error?.message || 'An unexpected error occurred while fetching the page content.'}
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
            </div>
        );
    }

    if (!store.optCurrentPage || store.initDataState.isLoading) {
        return <PageSkeletonLoader />;
    }

    const page = store.optCurrentPage;
    const section = store.currentSection;
    if (!section || page.isEmpty) {
        return <EmptyPagePlaceholder page={page} />;
    }

    const uiSettings = store.uiSettingsStore;
    const maxLevel = store.headingLevel.value ?? 6;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

    return (
        <div ref={contentRef} className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
            <MarkdownRenderer
                key={section.id}
                markdown={section.chunkMarkdown(maxLevel)}
                colors={colors}
                fontSizes={uiSettings.fontSize.value}
                fonts={uiSettings.fontFamilies.value}
            />
            <SelectionPopover
                containerRef={contentRef}
                page={page}
                section={section}
            />
        </div>
    );
});
