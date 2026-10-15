import { makeAutoObservable, observable } from 'mobx';
import type { CommentFilter } from './comment-state';

interface CommentEditDraft { body: string; originalBody: string }
class CommentPanelSession {
    expanded = new Set<string>();
    edits = new Map<string, CommentEditDraft>();
    pendingSaves = new Set<string>();
    saveErrors = new Map<string, string>();
    query = '';
    filter: CommentFilter = 'active';
    constructor() { makeAutoObservable(this, { edits: observable.shallow }); }
    setExpanded(ids: Set<string>) { this.expanded = ids; }
    setView(query: string, filter: CommentFilter) { this.query = query; this.filter = filter; }
    setEdit(id: string, draft: CommentEditDraft) { this.edits.set(id, draft); this.saveErrors.delete(id); }
    discard(id: string) { this.edits.delete(id); this.saveErrors.delete(id); }
    beginSave(id: string) {
        if (this.pendingSaves.has(id)) return false;
        this.pendingSaves.add(id); this.saveErrors.delete(id); return true;
    }
    finishSave(id: string, submitted: CommentEditDraft | undefined, error?: string) {
        this.pendingSaves.delete(id);
        if (error) this.saveErrors.set(id, error);
        else if (this.edits.get(id) === submitted) this.discard(id);
    }
    clear() { this.edits.clear(); this.expanded.clear(); this.saveErrors.clear(); }
}

// PageStore is recreated for each page/account. Weak keys retain drafts across
// sidebar unmounts without writing private note text to browser storage.
const sessions = new WeakMap<object, CommentPanelSession>();
export function commentPanelSession(owner: object): CommentPanelSession {
    let session = sessions.get(owner);
    if (!session) {
        session = new CommentPanelSession();
        sessions.set(owner, session);
    }
    return session;
}
