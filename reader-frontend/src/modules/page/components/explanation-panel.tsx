import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { Compass } from 'lucide-react';

export const PageExplanationPanel = observer(function PageExplanationPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="AI Explanation"
            icon={<Compass size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.explanationStore}
            queryLabel="Passage"
            rephraseLabel="Rephrase Passage / Instructions"
            rephrasePlaceholder="Modify passage or add custom instructions..."
            emptyStateLabel="Select text on the page and click 'AI Explain' to get an explanation."
            loadingLabel="Generating AI explanation..."
        />
    );
});
