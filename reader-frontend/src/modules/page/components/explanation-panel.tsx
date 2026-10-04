import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { Compass } from 'lucide-react';

export const PageExplanationPanel = observer(function PageExplanationPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="Explanations"
            icon={<Compass size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.explanationStore}
            queryLabel="Passage"
            rephraseLabel="Edit selection or instructions"
            rephrasePlaceholder="Edit the selection or add instructions…"
            emptyStateLabel="Select text and choose “Explain with AI”."
            loadingLabel="Getting an explanation…"
        />
    );
});
