import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { MarkdownRenderer } from '@lib/md-view';
import '@lib/md-view/md-view.css';
import '@lib/md-view/md-view-hljs.css';

export const PageMain = observer(function PageMain() {
    const store = usePageStore();

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

    return (
        <div className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
            <MarkdownRenderer
                markdown={section.fullMarkdown}
                colors={uiSettings.colorSchema.value}
                fontSizes={uiSettings.fontSize.value}
                fonts={uiSettings.fontFamilies.value}
            />
        </div>
    );
});
