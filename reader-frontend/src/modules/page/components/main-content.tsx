import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { MarkdownRenderer } from '@lib/md-view';
import '@lib/md-view/md-view.css';
import '@lib/md-view/md-view-hljs.css';

export const PageMain = observer(function PageMain() {
    const store = usePageStore();
    const themeStore = useThemeStore();

    if (!store.optCurrentPage) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-[var(--color-text-muted)]">Loading…</span>
            </div>
        );
    }

    const section = store.currentSection;
    if (!section) {
        return null;
    }

    const uiSettings = store.uiSettingsStore;
    const maxLevel = uiSettings.headingLevel.value ?? 6;
    const colors = themeStore.theme.value === 'dark' ? PageColorSchema.DARK.value : PageColorSchema.LIGHT.value;

    return (
        <div className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
            <MarkdownRenderer
                markdown={section.chunkMarkdown(maxLevel)}
                colors={colors}
                fontSizes={uiSettings.fontSize.value}
                fonts={uiSettings.fontFamilies.value}
            />
        </div>
    );
});
