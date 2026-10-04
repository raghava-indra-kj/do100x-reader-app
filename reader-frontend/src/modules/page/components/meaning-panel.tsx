import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { Sparkles } from 'lucide-react';

export const PageMeaningPanel = observer(function PageMeaningPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="Word meanings"
            icon={<Sparkles size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.meaningStore}
            queryLabel="Term"
            rephraseLabel="Edit word or context"
            rephrasePlaceholder="Edit the word or add context…"
            emptyStateLabel="Select a word and choose “Meaning with AI”."
            loadingLabel={`Looking up “${store.meaningStore.activeEntry?.searchTerm}”…`}
        />
    );
});
