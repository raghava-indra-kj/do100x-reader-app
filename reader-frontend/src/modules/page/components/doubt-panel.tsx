import { ReaderActionButton } from './reader-action-button';
import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { FilePlus, Check, StickyNote } from 'lucide-react';
import type { AiDoubtEntry, DoubtStore } from '../doubt-store';

export const SaveQuestionComment = observer(function SaveQuestionComment({ entry, store }: { entry: AiDoubtEntry; store: DoubtStore }) {
    const state = store.questionCommentState(entry);
    const isCheck = entry.intent === 'check-understanding';
    const subject = isCheck ? 'explanation' : 'question';
    const tooltip = {
        saved: isCheck ? 'Explanation saved to comments' : 'Question saved to comments',
        saving: `Saving ${subject}…`,
        idle: `Save ${subject} as ${entry.attachment ? 'comment' : 'page note'}`,
    }[state];
    return <ReaderActionButton tooltip={tooltip} disabled={state !== 'idle'} className="reader-icon-button disabled:opacity-50" onClick={() => void store.saveQuestionAsComment(entry.id)}>{state === 'saved' ? <Check size={14} /> : <StickyNote size={14} />}</ReaderActionButton>;
});

export const PageDoubtPanel = observer(function PageDoubtPanel() {
    const store = usePageStore();
    const doubtStore = store.doubtStore;
    const isCheck = doubtStore.activeEntry?.intent === 'check-understanding';

    const renderHeaderActions = (activeEntry: AiDoubtEntry) => {
        return (
            <><SaveQuestionComment entry={activeEntry} store={doubtStore} />{activeEntry.responseMarkdown && !activeEntry.isLoading && <ReaderActionButton
                onClick={() => doubtStore.saveAsSubPage(activeEntry.id)}
                disabled={activeEntry.isSaved || activeEntry.isSavingPage}
                className={`p-1 transition-colors cursor-pointer ${
                    activeEntry.isSaved
                        ? 'text-[var(--color-brand)] cursor-default'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand)] disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                tooltip={activeEntry.isSaved ? "Saved as a subpage" : "Save as a subpage"}
            >
                {activeEntry.isSavingPage ? (
                    <span className="inline-block animate-spin text-xs">⏳</span>
                ) : activeEntry.isSaved ? (
                    <Check size={14} />
                ) : (
                    <FilePlus size={14} />
                )}
            </ReaderActionButton>}</>
        );
    };

    return (
        <PageAiLookupPanel
            title="Questions"
            onStart={(text, context) => store.doubtStore.open(text, context.sectionMarkdown, context.pageTitle, context.sectionTitle)}
            startLabel="Ask AI"
            startPlaceholder="Ask about this section…"
            storeInstance={store.doubtStore}
            historyLabel={(entry: AiDoubtEntry) => entry.intent === 'check-understanding' ? `Understanding check · ${entry.searchTerm}` : entry.searchTerm}
            queryLabel={isCheck ? 'Your explanation' : 'Question'}
            rephraseLabel={isCheck ? 'Revise your explanation' : 'Edit your question'}
            rephrasePlaceholder={isCheck ? 'Write your revised explanation…' : 'Edit the question to generate a replacement answer…'}
            reaskLabel={isCheck ? 'Check again' : 'Update answer'}
            emptyStateLabel="Select a passage and choose “Ask or comment”, or ask AI from a saved comment."
            loadingLabel={isCheck ? 'Checking your understanding…' : 'Getting an answer…'}
            extraHeaderActions={renderHeaderActions}
        />
    );
});
