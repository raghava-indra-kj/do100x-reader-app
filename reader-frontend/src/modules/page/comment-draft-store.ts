import { makeAutoObservable, observable } from 'mobx';
import type { CommentTarget } from './components/comment-target';

export interface CommentDraftContext {
    pageId: string;
    pageTitle: string;
    sectionId: string;
    sectionTitle: string;
    selectedText: string;
    target: CommentTarget;
}
export interface CommentDraft extends CommentDraftContext {
    id: string;
    body: string;
    isExplanation: boolean;
    pageNote: boolean;
    revision: number;
    savedRevision: number | null;
    savingRevision: number | null;
    error: string;
}
export interface CommentDraftSubmission { id: string; revision: number; draft: CommentDraft }

/** Deliberately memory-only. A PageStore owns drafts for one page and account. */
export class CommentDraftStore {
    drafts: CommentDraft[] = [];
    private sequence = 0;
    constructor() { makeAutoObservable(this, { drafts: observable.shallow }, { autoBind: true }); }
    get(id: string | null) { return this.drafts.find(draft => draft.id === id); }
    begin(context: CommentDraftContext) {
        const draft: CommentDraft = { ...context, id: `comment-draft-${++this.sequence}`, body: '', isExplanation: false, pageNote: false, revision: 0, savedRevision: null, savingRevision: null, error: '' };
        this.drafts = [...this.drafts, draft];
        return draft.id;
    }
    update(id: string, changes: Partial<Pick<CommentDraft, 'body' | 'isExplanation' | 'pageNote' | 'target'>>) {
        this.drafts = this.drafts.map(draft => draft.id === id ? { ...draft, ...changes, revision: draft.revision + 1, error: '' } : draft);
    }
    recoverable(pageId: string) {
        return this.drafts.filter(draft => draft.pageId === pageId && Boolean(draft.body.trim()) && draft.savedRevision !== draft.revision);
    }
    park(id: string | null) {
        const draft = this.get(id);
        if (draft && draft.savingRevision === null && (!draft.body.trim() || draft.savedRevision === draft.revision)) this.discard(draft.id);
    }
    discard(id: string) { this.drafts = this.drafts.filter(draft => draft.id !== id); }
    submit(id: string): CommentDraftSubmission | null {
        const draft = this.get(id);
        if (!draft || !draft.body.trim() || draft.savingRevision !== null || draft.savedRevision === draft.revision || (!draft.target.anchor && !draft.pageNote)) return null;
        const submission = { id, revision: draft.revision, draft: { ...draft } };
        this.drafts = this.drafts.map(item => item.id === id ? { ...item, savingRevision: draft.revision, error: '' } : item);
        return submission;
    }
    complete(submission: CommentDraftSubmission, error?: string) {
        const failed = error !== undefined;
        this.drafts = this.drafts.map(draft => draft.id !== submission.id || draft.savingRevision !== submission.revision ? draft : {
            ...draft, savingRevision: null,
            savedRevision: failed ? draft.savedRevision : submission.revision,
            error: failed && draft.revision === submission.revision ? error || 'Couldn’t save your comment. Your draft is still here; try again.' : '',
        });
    }
}
