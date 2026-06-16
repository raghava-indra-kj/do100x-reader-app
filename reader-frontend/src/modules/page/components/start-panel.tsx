import { Tabs } from '@modules/core/ui/primitives/tabs';
import { PageSubpages } from './subpages';
import { PageToc } from './toc';

export function StartPanel() {
    return (
        <aside className="flex h-full flex-col bg-[var(--color-surface-raised)]">
            <Tabs
                defaultValue="contents"
                variant="underline"
                tabs={[
                    { value: 'contents', label: 'Contents', panel: <PageToc /> },
                    { value: 'subpages', label: 'Subpages', panel: <PageSubpages /> },
                ]}
            />
        </aside>
    );
}
