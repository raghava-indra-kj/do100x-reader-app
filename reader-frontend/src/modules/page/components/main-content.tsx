import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { MarkdownRenderer } from '@lib/md-view';
import '@lib/md-view/md-view.css';
import '@lib/md-view/md-view-hljs.css';

function sectionToMarkdown(section: { rawTitle: string | null; content: string | null }, includeTitle: boolean): string {
    const parts: string[] = [];
    if (includeTitle && section.rawTitle) {
        parts.push(section.rawTitle);
        parts.push('');
    }
    if (section.content) {
        parts.push(section.content);
    }
    return parts.join('\n');
}

export const PageMain = observer(function PageMain() {
    const store = usePageStore();
    const section = store.currentSection;

    if (!store.optCurrentPage) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-[var(--color-text-muted)]">Loading…</span>
            </div>
        );
    }

    if (!section) {
        return null;
    }

    const uiSettings = store.uiSettingsStore;
    const markdown = sectionToMarkdown(section, true);

    return (
        <div className="mx-auto max-w-[var(--container-prose)] px-[var(--space-6)] py-[var(--space-8)]">
            <MarkdownRenderer
                markdown={markdown}
                colors={uiSettings.colorSchema.value}
                fontSizes={uiSettings.fontSize.value}
                fonts={uiSettings.fontFamilies.value}
            />
        </div>
    );
});