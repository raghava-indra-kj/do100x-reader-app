import { action, makeObservable, observable, runInAction } from 'mobx';
import { toast } from '@modules/core/ui/primitives/toast';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { ChatAppError } from '@domain/chat/models/chat-types';
import { createPageAnnotations, deletePageAnnotation, getPageAnnotations, reorderPageAnnotations, updatePageAnnotation } from '@domain/page-annotation/services/page-annotation-service';
import type { PageAnnotation, PageAnnotationKind, PageAnnotationPatch } from '@domain/page-annotation/models/page-annotation';
import { ANNOTATION_SYSTEM_PROMPT, buildAnnotationPrompt, parseAnnotationReply } from './page-annotation-ai';
import { annotationKeyOf, type PageAnnotationTarget } from './page-annotation-target';
import type { PageStore } from './store';

/** Key takeaways for the open page: loading, generating through the annotation model, and deleting. */
export class PageAnnotationStore {
    private readonly pageStore: PageStore;
    private controller: AbortController | null = null;
    private loadRequest = 0;

    items: PageAnnotation[] = [];
    /** Anchor key being generated, if any. */
    generatingKey: string | null = null;
    error: string | null = null;
    /** Set after a successful generation so the new takeaways scroll into view once. */
    revealed: { key: string } | null = null;
    /** Open groups, as `<anchor key>|<before|after>`. Collapsed by default so reading stays uninterrupted. */
    expanded = new Set<string>();

    constructor(pageStore: PageStore) {
        this.pageStore = pageStore;
        makeObservable(this, {
            items: observable.ref,
            generatingKey: observable,
            error: observable,
            revealed: observable.ref,
            clearRevealed: action,
            expanded: observable,
            setExpanded: action,
            clearError: action,
        });
    }

    itemsFor(key: string): PageAnnotation[] {
        return this.items.filter((item) => annotationKeyOf(item.anchor) === key);
    }

    setExpanded(id: string, open: boolean) {
        if (open) this.expanded.add(id); else this.expanded.delete(id);
    }

    clearError() { this.error = null; }

    clearRevealed() { this.revealed = null; }

    async load() {
        const request = ++this.loadRequest;
        const result = await getPageAnnotations({ pageId: this.pageStore.pageId });
        if (request !== this.loadRequest) return;
        runInAction(() => { if (result.ok) this.items = result.data; });
    }

    /** Returns true when the edit was saved. Edited items stop being replaced by regeneration. */
    async update(id: string, patch: PageAnnotationPatch): Promise<boolean> {
        const result = await updatePageAnnotation({ id, ...patch });
        if (!result.ok) { toast.error(result.error.message); return false; }
        await this.load();
        return true;
    }

    /** Swap an item with its neighbour in the strip it is shown in (`slot`); the saved order is per anchor. */
    async move(key: string, id: string, slot: 'before' | 'after', direction: -1 | 1) {
        const all = this.itemsFor(key);
        const fallback = this.pageStore.uiSettingsStore.annotationPlacement;
        const visible = all.filter((item) => (item.placement ?? fallback) === slot);
        const at = visible.findIndex((item) => item.id === id);
        const neighbour = visible[at + direction];
        if (at < 0 || !neighbour) return;
        const ids = all.map((item) => item.id);
        const a = ids.indexOf(id);
        const b = ids.indexOf(neighbour.id);
        [ids[a], ids[b]] = [ids[b], ids[a]];
        const result = await reorderPageAnnotations({ pageId: this.pageStore.pageId, ids });
        if (!result.ok) { toast.error(result.error.message); return; }
        await this.load();
    }

    async remove(id: string) {
        const result = await deletePageAnnotation({ id });
        if (!result.ok) { toast.error(result.error.message); return; }
        runInAction(() => { this.items = this.items.filter((item) => item.id !== id); });
    }

    cancel() { this.controller?.abort(); }

    /** Returns true when new items were saved. Replaces earlier AI-written items on the same anchor. */
    async generate(target: PageAnnotationTarget, kinds: readonly PageAnnotationKind[], sectionTitle: string | null): Promise<boolean> {
        if (this.generatingKey || !kinds.length) return false;
        const controller = new AbortController();
        this.controller = controller;
        runInAction(() => { this.generatingKey = target.key; this.error = null; });
        const fail = (message: string) => { runInAction(() => { this.error = message; }); return false; };
        try {
            const config = await getModelConfig();
            if (controller.signal.aborted) return false;
            if (!config.ok) return fail('Add your AI connection in Settings → AI models.');
            const modelId = config.data.annotationModelId;
            if (!modelId) return fail('Choose a key takeaways model in Settings → AI models.');

            const chat = await getChatCompletion({
                modelId,
                systemPrompt: ANNOTATION_SYSTEM_PROMPT,
                userPrompt: buildAnnotationPrompt({ pageTitle: this.pageStore.optCurrentPage?.title ?? target.title, sectionTitle, source: target.source, kinds }),
                pageId: this.pageStore.pageId,
                actionType: 'annotation',
                signal: controller.signal,
            });
            if (controller.signal.aborted) return false;
            if (!chat.ok) return fail(chat.error instanceof ChatAppError ? chat.error.details.message : chat.error.message || 'Couldn’t generate key takeaways. Try again.');

            const items = parseAnnotationReply(chat.data.response, kinds);
            if (!items) return fail('The model’s reply couldn’t be used. Try again, or pick a different model.');

            const saved = await createPageAnnotations({ pageId: this.pageStore.pageId, anchor: target.anchor, items, replace: true });
            if (controller.signal.aborted) return false;
            if (!saved.ok) return fail(saved.error.message);

            await this.load();
            runInAction(() => {
                for (const slot of ['before', 'after']) this.expanded.add(`${target.key}|${slot}`);
                this.revealed = { key: target.key };
            });
            return true;
        } catch (error) {
            if (controller.signal.aborted) return false;
            return fail(error instanceof Error ? error.message : 'Couldn’t generate key takeaways. Try again.');
        } finally {
            if (this.controller === controller) this.controller = null;
            runInAction(() => { this.generatingKey = null; });
        }
    }

    dispose() { this.controller?.abort(); }
}
