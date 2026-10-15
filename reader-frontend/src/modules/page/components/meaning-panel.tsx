import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';

export const PageMeaningPanel = observer(function PageMeaningPanel() {
    const store = usePageStore();
    return (
        <PageAiLookupPanel
            title="Word meanings"
            onStart={(text, context) => store.meaningStore.open(text, context.pageTitle, context.sectionTitle)}
            startLabel="Look up"
            startPlaceholder="Enter a word or phrase…"
            storeInstance={store.meaningStore}
            queryLabel="Term"
            rephraseLabel="Edit word or context"
            rephrasePlaceholder="Edit the word or add context…"
            emptyStateLabel="Select a word in the article, or enter it below."
            loadingLabel={`Looking up “${store.meaningStore.activeEntry?.searchTerm}”…`}
        />
    );
});
