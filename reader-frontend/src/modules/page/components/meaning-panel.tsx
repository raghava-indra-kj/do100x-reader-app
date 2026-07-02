import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { Sparkles } from 'lucide-react';

export const PageMeaningPanel = observer(function PageMeaningPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="AI Meaning"
            icon={<Sparkles size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.meaningStore}
            queryLabel="Term"
            rephraseLabel="Rephrase Term / Context"
            rephrasePlaceholder="Modify term or add instructions..."
            emptyStateLabel="Select text on the page and click 'AI Meaning' to look up details."
            loadingLabel={`Consulting AI for "${store.meaningStore.activeEntry?.searchTerm}"...`}
        />
    );
});
