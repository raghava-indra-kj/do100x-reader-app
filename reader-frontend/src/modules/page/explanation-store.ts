import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { ChatAppError, type ChatErrorDetails } from '@domain/chat/models/chat-types';
import type { PageStore } from './store';

export interface AiExplanationEntry {
    id: string;
    selectedText: string;
    pageTitle: string;
    sectionTitle: string;
    isLoading: boolean;
    responseMarkdown: string;
    rawResponse: any | null;
    error: string | null;
    errorDetails: ChatErrorDetails | null;
}

export class ExplanationStore {
    private readonly pageStore: PageStore;
    private abortControllers: Map<string, AbortController> = new Map();

    history: AiExplanationEntry[] = [];
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
            fetchExplanation: action,
            reaskExplanation: action,
            reask: action,
            cancel: action,
            retry: action,
        });
    }

    get activeEntry(): AiExplanationEntry | null {
        return this.history.find(e => e.id === this.activeEntryId) || null;
    }

    reask(entryId: string, newText: string) {
        this.reaskExplanation(entryId, newText);
    }

    reaskExplanation(entryId: string, newSelectedText: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.selectedText = newSelectedText.trim();
        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.rawResponse = null;
        entry.error = null;
        entry.errorDetails = null;

        this.fetchExplanation(entryId);
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
            entry.error = 'Request was cancelled';
            entry.errorDetails = {
                errorType: 'CANCELLED',
                message: 'Request Cancelled',
                description: 'The AI explanation request was cancelled.',
            };
        }
    }

    retry(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.rawResponse = null;
        entry.error = null;
        entry.errorDetails = null;

        this.fetchExplanation(entryId);
    }

    open(text: string, pageTitle: string, sectionTitle: string) {
        const passage = text.trim();
        const page = pageTitle.trim();
        const sec = sectionTitle.trim();

        // Check if matching entry already exists in history
        const existing = this.history.find(
            e => e.selectedText.toLowerCase() === passage.toLowerCase() && 
                 e.pageTitle.toLowerCase() === page.toLowerCase() && 
                 e.sectionTitle.toLowerCase() === sec.toLowerCase()
        );

        if (existing) {
            this.activeEntryId = existing.id;
        } else {
            const id = String(Date.now() + Math.random());
            const newEntry: AiExplanationEntry = {
                id,
                selectedText: passage,
                pageTitle: page,
                sectionTitle: sec,
                isLoading: true,
                responseMarkdown: '',
                rawResponse: null,
                error: null,
                errorDetails: null,
            };
            this.history.push(newEntry);
            this.activeEntryId = id;
            this.fetchExplanation(id);
        }

        this.pageStore.uiSettingsStore.setSidebarPanel('explanation');
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
        this.history = [];
        this.activeEntryId = null;
    }

    async fetchExplanation(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        // Cancel previous inflight request if any
        const prevController = this.abortControllers.get(entryId);
        if (prevController) {
            prevController.abort();
        }
        const controller = new AbortController();
        this.abortControllers.set(entryId, controller);
        
        // 1. Fetch user's settings to get explanationModelId
        const configRes = await getModelConfig();
        if (!configRes.ok) {
            this.abortControllers.delete(entryId);
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'AI configuration not found. Please verify your settings.';
                entry.errorDetails = {
                    errorType: 'CONFIG_ERROR',
                    message: 'AI Configuration Missing',
                    description: 'No AI configuration found. Please go to Settings to configure your Base URL and API key.',
                };
            });
            return;
        }

        const modelId = configRes.data.explanationModelId;
        if (!modelId) {
            this.abortControllers.delete(entryId);
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Default Model for Explanation is not configured. Please go to Settings to select one.';
                entry.errorDetails = {
                    errorType: 'CONFIG_ERROR',
                    message: 'Explanation Model Not Selected',
                    description: 'Please go to Settings -> Model Selection and select a default model for Explanations.',
                };
            });
            return;
        }

        const contextInfo = entry.sectionTitle 
            ? `under the section "${entry.sectionTitle}" of the page "${entry.pageTitle}"`
            : `on the page "${entry.pageTitle}"`;

        const userPrompt = `I am reading text ${contextInfo}.

Please explain the following passage:
"""
${entry.selectedText}
"""`;

        // 2. Query chat endpoint
        const chatRes = await getChatCompletion({
            modelId,
            systemPrompt: 'You are a learning assistant. Explain the selected passage in context, breaking down complex terms and helping the user understand it clearly. Return the output cleanly formatted in Markdown.',
            userPrompt,
            pageId: this.pageStore.pageId,
            actionType: 'explanation',
            signal: controller.signal,
        });

        this.abortControllers.delete(entryId);

        runInAction(() => {
            entry.isLoading = false;
            if (chatRes.ok) {
                entry.responseMarkdown = chatRes.data.response;
                entry.rawResponse = chatRes.data.rawResponse ?? null;
                entry.error = null;
                entry.errorDetails = null;
            } else {
                if (chatRes.error instanceof ChatAppError) {
                    entry.error = chatRes.error.details.message;
                    entry.errorDetails = chatRes.error.details;
                } else {
                    entry.error = chatRes.error.message || 'Failed to fetch AI explanation.';
                    entry.errorDetails = {
                        errorType: 'UNKNOWN',
                        message: chatRes.error.message || 'AI request failed',
                        rawError: chatRes.error,
                    };
                }
            }
        });
    }
}
