import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@lib/md-view';
import { SelectionPopover } from './selection-popover';
import '@lib/md-view/md-view.css';
import '@lib/md-view/md-view-hljs.css';

export const PageMain = observer(function PageMain() {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const contentRef = useRef<HTMLDivElement>(null);

    if (!store.optCurrentPage) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-[var(--color-text-muted)]">Loading…</span>
            </div>
        );
    }

    const page = store.optCurrentPage;
    const section = store.currentSection;
    if (!section) {
        return null;
    }

    const uiSettings = store.uiSettingsStore;
    const maxLevel = uiSettings.headingLevel.value ?? 6;
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

    return (
        <div ref={contentRef} className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
            <MarkdownRenderer
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
