import { makeAutoObservable } from 'mobx';

/** Memory-only state owned by one user's PageStore, never shared across pages. */
export interface AiLookupContext {
    pageId: string;
    pageTitle: string;
    sectionId: string | null;
    sectionTitle: string;
    sectionMarkdown: string;
}

export class AiLookupDrafts {
    text = '';
    context: AiLookupContext | null = null;
    composing = false;
    edits = new Map<string, string>();
    focusTarget: string | null = null;

    constructor() { makeAutoObservable(this); }

    setText(text: string, context: AiLookupContext) {
        this.text = text;
        // Pin the source on the first edit; reading another section must not
        // silently change the passage sent with an already written question.
        this.context ??= { ...context };
    }
    useContext(context: AiLookupContext, text = this.text) {
        this.context = { ...context };
        this.text = text;
    }
    setComposing(value: boolean) { this.composing = value; }
    discard() { this.text = ''; this.context = null; }
    submitted() { this.discard(); this.composing = false; }
    edit(id: string, text: string) { this.edits.set(id, text); }
    remove(id: string) { this.edits.delete(id); }
    clearEdits() { this.edits.clear(); }
    restoreFocus(target: string | null) { this.focusTarget = target; }
    takeFocus(): string | null {
        const target = this.focusTarget;
        this.focusTarget = null;
        return target;
    }
}
