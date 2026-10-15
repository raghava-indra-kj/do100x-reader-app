import { AiLookupDrafts } from './ai-lookup-drafts';
import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { createPage } from '@domain/page/services/pages-service';
import { createComment } from '@domain/comment/services/comments-service';
import { ChatAppError, type ChatErrorDetails } from '@domain/chat/models/chat-types';
import { toast } from '@modules/core/ui/primitives/toast';
import type { PageStore } from './store';
import type { AnnotationAnchor } from '@reader/md-ast';

export type DoubtAttachment = { anchor: AnnotationAnchor; contentVersion: number };

export interface AiDoubtEntry {
    id: string;
    pageId: string;
    attachment?: DoubtAttachment;
    searchTerm: string;
    selectedText: string;
    pageTitle: string;
    sectionTitle: string;
    pendingText?: string;
    isLoading: boolean;
    responseMarkdown: string;
    responseRevision: number;
    rawResponse: any | null;
    error: string | null;
    errorDetails: ChatErrorDetails | null;
    isSaved: boolean;
    savedPageId: string | null;
    isSavingPage: boolean;
}

export class DoubtStore {
    private readonly pageStore: PageStore;
    private abortControllers: Map<string, AbortController> = new Map();
    private lifetime = 0;
    private readonly questionCommentSaves = observable.map<string, 'saving' | 'saved'>();
    private readonly answerSaves = observable.map<string, { status: 'saving' | 'saved'; pageId?: string; question: string; response: string }>();

    readonly drafts = new AiLookupDrafts();
    history: AiDoubtEntry[] = [];
    activeEntryId: string | null = null;
    isExpanded: boolean = false;

    constructor(pageStore: PageStore) {
        this.pageStore = pageStore;
        makeObservable(this, {
            history: observable,
            activeEntryId: observable,
            isExpanded: observable,
            activeEntry: computed,
            open: action,
            close: action,
            toggleExpand: action,
            setActiveEntry: action,
            removeEntry: action,
            clearHistory: action,
            fetchDoubt: action,
            reaskDoubt: action,
            reask: action,
            cancel: action,
            retry: action,
            dispose: action,
            saveAsSubPage: action,
            saveQuestionAsComment: action,
        });
    }

    get activeEntry(): AiDoubtEntry | null {
        return this.history.find(e => e.id === this.activeEntryId) || null;
    }

    reask(entryId: string, newText: string) {
        this.reaskDoubt(entryId, newText);
    }

    reaskDoubt(entryId: string, newSearchTerm: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.pendingText = newSearchTerm.trim();
        entry.isLoading = true;
        entry.error = null;
        entry.errorDetails = null;

        this.fetchDoubt(entryId);
    }

    cancel(entryId: string) {
        const controller = this.abortControllers.get(entryId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(entryId);
        }
        const entry = this.history.find(e => e.id === entryId);
        if (entry && entry.isLoading) {
            entry.isLoading = false;
            entry.error = 'Request cancelled';
            entry.errorDetails = {
                errorType: 'CANCELLED',
                message: 'Request cancelled',
                description: 'The request was cancelled.',
            };
        }
    }

    retry(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.isLoading = true;
        entry.error = null;
        entry.errorDetails = null;

        this.fetchDoubt(entryId);
    }

    open(doubtText: string, selectedText: string, pageTitle: string, sectionTitle: string, attachment?: DoubtAttachment) {
        const query = doubtText.trim();
        const passage = selectedText.trim();
        const page = pageTitle.trim();
        const sec = sectionTitle.trim();
        const pageId = this.pageStore.pageId;
        // Keep the original selection/revision, including while AI is running or
        // the page changes. Never reconstruct an attachment by quotation search.
        const target = attachment ? { contentVersion: attachment.contentVersion, anchor: { ...attachment.anchor, segments: attachment.anchor.segments.map(segment => ({ ...segment })) } } : undefined;
        const targetKey = JSON.stringify(target ?? null);

        // Check if matching entry already exists in history
        const existing = this.history.find(
            e => e.pageId === pageId && e.sectionTitle === sec && e.searchTerm.toLowerCase() === query.toLowerCase() &&
                 e.selectedText.toLowerCase() === passage.toLowerCase() && JSON.stringify(e.attachment ?? null) === targetKey
        );

        if (existing) {
            this.activeEntryId = existing.id;
        } else {
            const id = String(Date.now() + Math.random());
            const newEntry: AiDoubtEntry = {
                id,
                pageId,
                attachment: target,
                searchTerm: query,
                selectedText: passage,
                pageTitle: page,
                sectionTitle: sec,
                isLoading: true,
                responseMarkdown: '',
                responseRevision: 0,
                rawResponse: null,
                error: null,
                errorDetails: null,
                isSaved: false,
                savedPageId: null,
                isSavingPage: false,
            };
            this.history.push(newEntry);
            this.activeEntryId = id;
            this.fetchDoubt(id);
        }

        this.drafts.setComposing(false);
        this.pageStore.uiSettingsStore.setSidebarPanel('doubt');
    }

    close() {
        this.isExpanded = false;
        this.pageStore.uiSettingsStore.setSidebarPanel('contents');
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
    }

    setActiveEntry(id: string) {
        this.activeEntryId = id;
    }

    removeEntry(id: string) {
        this.cancel(id);
        this.drafts.remove(id);
        const index = this.history.findIndex(e => e.id === id);
        if (index > -1) {
            this.history.splice(index, 1);
            if (this.activeEntryId === id) {
                this.activeEntryId = this.history.length > 0 ? this.history[this.history.length - 1].id : null;
            }
        }
    }

    clearHistory() {
        for (const entry of this.history) {
            this.cancel(entry.id);
        }
        this.drafts.clearEdits();
        this.history = [];
        this.activeEntryId = null;
    }

    async fetchDoubt(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;
        const requestedText = entry.pendingText ?? entry.searchTerm;

        // Cancel previous inflight request if any
        const prevController = this.abortControllers.get(entryId);
        if (prevController) {
            prevController.abort();
        }
        const controller = new AbortController();
        this.abortControllers.set(entryId, controller);

        // 1. Fetch user's settings to get doubtModelId
        try {
            const configRes = await getModelConfig();
            if (controller.signal.aborted || this.abortControllers.get(entryId) !== controller) return;
            if (!configRes.ok) {
                this.abortControllers.delete(entryId);
                runInAction(() => {
                    entry.isLoading = false;
                    entry.error = 'Set up your AI connection in settings.';
                    entry.errorDetails = {
                        errorType: 'CONFIG_ERROR',
                        message: 'AI connection needed',
                        description: 'Add a provider URL and API key in settings.',
                    };
                });
                return;
            }

            const modelId = configRes.data.doubtModelId;
            if (!modelId) {
                this.abortControllers.delete(entryId);
                runInAction(() => {
                    entry.isLoading = false;
                    entry.error = 'Choose a model for questions in settings.';
                    entry.errorDetails = {
                        errorType: 'CONFIG_ERROR',
                        message: 'Choose a question model',
                        description: 'Choose a model for questions in Settings → AI models.',
                    };
                });
                return;
            }

            const userPrompt = `I am reading a page titled "${entry.pageTitle}" under the section "${entry.sectionTitle}".

Here is the passage I am studying:
"""
${entry.selectedText}
"""

My doubt/question is:
"${requestedText}"

Please help me understand this and directly answer my doubt.`;

            // 2. Query chat endpoint
            const chatRes = await getChatCompletion({
                modelId,
                systemPrompt: 'You are a learning assistant. The user is studying a passage and has a question/doubt about it. Provide a clear, detailed, and helpful answer. Format your response cleanly in Markdown.',
                userPrompt,
                pageId: entry.pageId,
                actionType: 'doubt',
                signal: controller.signal,
            });

            if (controller.signal.aborted || this.abortControllers.get(entryId) !== controller) return;
            this.abortControllers.delete(entryId);

            runInAction(() => {
                entry.isLoading = false;
                if (chatRes.ok) {
                    entry.searchTerm = requestedText;
                    entry.pendingText = undefined;
                    entry.isSaved = false;
                    entry.savedPageId = null;
                    entry.isSavingPage = false;
                    entry.responseRevision += 1;
                    entry.responseMarkdown = chatRes.data.response;
                    entry.rawResponse = chatRes.data.rawResponse ?? null;
                    entry.error = null;
                    entry.errorDetails = null;
                } else {
                    if (chatRes.error instanceof ChatAppError) {
                        entry.error = chatRes.error.details.message;
                        entry.errorDetails = chatRes.error.details;
                    } else {
                        entry.error = chatRes.error.message || 'Couldn’t get an answer. Try again.';
                        entry.errorDetails = {
                            errorType: 'UNKNOWN',
                            message: chatRes.error.message || 'Couldn’t get a response. Try again.',
                            rawError: chatRes.error,
                        };
                    }
                }
            });
        } catch (error) {
            if (controller.signal.aborted || this.abortControllers.get(entryId) !== controller) return;
            this.abortControllers.delete(entryId);
            runInAction(() => {
                entry.isLoading = false;
                entry.error = error instanceof Error ? error.message : 'Couldn’t get a response. Try again.';
                entry.errorDetails = { errorType: 'UNKNOWN', message: entry.error };
            });
        }
    }

    dispose() {
        this.lifetime += 1;
        for (const controller of this.abortControllers.values()) controller.abort();
        this.abortControllers.clear();
    }

    private questionCommentPayload(entry: AiDoubtEntry) {
        return {
            pageId: entry.pageId, pageTitle: entry.pageTitle, sectionTitle: entry.sectionTitle || null,
            selectedText: entry.selectedText, body: entry.pendingText ?? entry.searchTerm,
            ...(entry.attachment ? {
                contentVersion: entry.attachment.contentVersion,
                anchor: { ...entry.attachment.anchor, segments: entry.attachment.anchor.segments.map(segment => ({ ...segment })) },
            } : {}),
        };
    }

    questionCommentState(entry: AiDoubtEntry): 'idle' | 'saving' | 'saved' {
        return this.questionCommentSaves.get(JSON.stringify([entry.id, this.questionCommentPayload(entry)])) ?? 'idle';
    }

    async saveQuestionAsComment(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;
        const payload = this.questionCommentPayload(entry);
        const key = JSON.stringify([entry.id, payload]);
        if (this.questionCommentSaves.has(key)) return;
        const lifetime = this.lifetime;
        this.questionCommentSaves.set(key, 'saving');
        try {
            const result = await createComment(payload);
            if (!result.ok) throw result.error;
            runInAction(() => {
                // A different edit has a different key. Finishing this save must
                // never mark a newly edited question as already saved.
                this.questionCommentSaves.set(key, 'saved');
                if (lifetime === this.lifetime) {
                    this.pageStore.bumpCommentsVersion();
                    toast.success('Question saved to comments');
                }
            });
        } catch (error) {
            runInAction(() => {
                this.questionCommentSaves.delete(key);
                if (lifetime === this.lifetime) toast.error(error instanceof Error ? error.message : 'Couldn’t save this question. It remains in Questions; try again.');
            });
        }
    }

    async saveAsSubPage(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry || !entry.responseMarkdown || entry.isSaved || entry.isSavingPage) return;
        const revision = entry.responseRevision;
        const key = JSON.stringify([entry.id, revision]);
        if (this.answerSaves.has(key)) return;
        const lifetime = this.lifetime;
        const answer = { question: entry.searchTerm, response: entry.responseMarkdown };
        const payload = {
            parentPageId: entry.pageId,
            title: `Question: ${answer.question}`,
            content: `### Context\n\n> ${entry.selectedText.split('\n').join('\n> ')}\n\n### Question\n\n*${answer.question}*\n\n### Answer\n\n${answer.response}`,
            category: null,
        };
        this.answerSaves.set(key, { status: 'saving', ...answer });
        entry.isSavingPage = true;
        try {
            const result = await createPage(payload);
            if (!result.ok) throw result.error;
            runInAction(() => {
                this.answerSaves.set(key, { status: 'saved', pageId: result.data, ...answer });
                if (entry.responseRevision === revision) {
                    entry.isSaved = true;
                    entry.savedPageId = result.data;
                }
                if (lifetime === this.lifetime) {
                    this.pageStore.bumpSubpagesVersion();
                    toast.success(entry.responseRevision === revision ? 'Answer saved as a subpage' : 'Previous answer saved as a subpage');
                }
            });
        } catch (error) {
            runInAction(() => {
                this.answerSaves.delete(key);
                if (lifetime === this.lifetime) toast.error(error instanceof Error ? error.message : 'Couldn’t save the subpage. Try again.');
            });
        } finally {
            runInAction(() => { if (entry.responseRevision === revision) entry.isSavingPage = false; });
        }
    }
}
