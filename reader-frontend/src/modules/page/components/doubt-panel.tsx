import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { MessageSquare, FilePlus, Check } from 'lucide-react';

export const PageDoubtPanel = observer(function PageDoubtPanel() {
    const store = usePageStore();
    const doubtStore = store.doubtStore;

    const renderHeaderActions = (activeEntry: any) => {
        if (!activeEntry.responseMarkdown || activeEntry.isLoading) return null;
        return (
            <button
                onClick={() => doubtStore.saveAsSubPage(activeEntry.id)}
                disabled={activeEntry.isSaved || activeEntry.isSavingPage}
                className={`p-1 transition-colors cursor-pointer ${
                    activeEntry.isSaved
                        ? 'text-[var(--color-brand)] cursor-default'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand)] disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={activeEntry.isSaved ? "Saved as sub-page" : "Save as sub-page"}
            >
                {activeEntry.isSavingPage ? (
                    <span className="inline-block animate-spin text-xs">⏳</span>
                ) : activeEntry.isSaved ? (
                    <Check size={14} />
                ) : (
                    <FilePlus size={14} />
                )}
            </button>
        );
    };

    return (
        <PageAiLookupPanel
            title="AI Doubt"
            icon={<MessageSquare size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.doubtStore}
            queryLabel="Doubt"
            rephraseLabel="Re-ask or Rephrase Doubt"
            rephrasePlaceholder="Rephrase your question or ask a follow-up..."
            emptyStateLabel="Select text on the page, write a question in 'Ask Doubt', and click 'Ask AI' to explain."
            loadingLabel="Querying AI for doubt..."
            extraHeaderActions={renderHeaderActions}
        />
    );
});
