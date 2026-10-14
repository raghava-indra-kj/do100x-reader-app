import { ReaderActionButton } from './reader-action-button';
import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { PageAiLookupPanel } from './ai-lookup-panel';
import { MessageSquare, FilePlus, Check, StickyNote } from 'lucide-react';
import { useState } from 'react';
import { createComment } from '@domain/comment/services/comments-service';
import { toast } from '@modules/core/ui/primitives/toast';
import type { AiDoubtEntry } from '../doubt-store';

function SaveQuestionComment({ entry }: { entry: AiDoubtEntry }) {
    const store = usePageStore();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    return <ReaderActionButton tooltip={saved ? 'Question saved to comments' : 'Save question as comment'} disabled={saving || saved} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-brand)] disabled:opacity-50" onClick={async () => {
        if (saving || saved) return;
        setSaving(true);
        try {
            const result = await createComment({ pageId: store.pageId, pageTitle: entry.pageTitle, sectionTitle: entry.sectionTitle || null, selectedText: entry.selectedText, body: entry.searchTerm });
            if (!result.ok) throw result.error;
            setSaved(true);
            store.bumpCommentsVersion();
            toast.success('Question saved to comments');
        } catch { toast.error('Couldn’t save this question. Please try again.'); }
        finally { setSaving(false); }
    }}>{saved ? <Check size={14} /> : <StickyNote size={14} />}</ReaderActionButton>;
}

export const PageDoubtPanel = observer(function PageDoubtPanel() {
    const store = usePageStore();
    const doubtStore = store.doubtStore;

    const renderHeaderActions = (activeEntry: AiDoubtEntry) => {
        return (
            <><SaveQuestionComment key={`${activeEntry.id}:${activeEntry.searchTerm}`} entry={activeEntry} />{activeEntry.responseMarkdown && !activeEntry.isLoading && <ReaderActionButton
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
            icon={<MessageSquare size={12} className="text-[var(--color-brand)]" />}
            storeInstance={store.doubtStore}
            queryLabel="Question"
            rephraseLabel="Edit your question"
            rephrasePlaceholder="Edit your question or ask a follow-up…"
            emptyStateLabel="Select a passage and choose “Ask or comment”, or ask AI from a saved comment."
            loadingLabel="Getting an answer…"
            extraHeaderActions={renderHeaderActions}
        />
    );
});
