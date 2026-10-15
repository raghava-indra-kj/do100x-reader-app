import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';

export const PageExplanationPanel = observer(function PageExplanationPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="Explanations"
            onStart={(text, context) => store.explanationStore.open(text, context.pageTitle, context.sectionTitle)}
            startLabel="Explain"
            startPlaceholder="Paste a passage to understand…"
            useSection
            storeInstance={store.explanationStore}
            queryLabel="Passage"
            rephraseLabel="Edit selection or instructions"
            rephrasePlaceholder="Edit the selection or add instructions…"
            emptyStateLabel="Select text and choose “Explain with AI”."
            loadingLabel="Getting an explanation…"
        />
    );
});
