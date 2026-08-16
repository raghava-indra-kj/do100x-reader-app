import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { ChatAppError, type ChatErrorDetails } from '@domain/chat/models/chat-types';
import type { PageStore } from './store';

export interface AiMeaningEntry {
    id: string;
    searchTerm: string;
    pageTitle: string;
    sectionTitle: string;
    isLoading: boolean;
    responseMarkdown: string;
    rawResponse: any | null;
    error: string | null;
    errorDetails: ChatErrorDetails | null;
}

export class MeaningStore {
    private readonly pageStore: PageStore;
    private abortControllers: Map<string, AbortController> = new Map();

    history: AiMeaningEntry[] = [];
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
            fetchMeaning: action,
            reaskMeaning: action,
            reask: action,
            cancel: action,
            retry: action,
        });
    }

    get activeEntry(): AiMeaningEntry | null {
        return this.history.find(e => e.id === this.activeEntryId) || null;
    }

    reask(entryId: string, newText: string) {
        this.reaskMeaning(entryId, newText);
    }

    reaskMeaning(entryId: string, newSearchTerm: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.searchTerm = newSearchTerm.trim();
        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.rawResponse = null;
        entry.error = null;
        entry.errorDetails = null;

        this.fetchMeaning(entryId);
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
                description: 'The AI request was stopped before completing.',
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

        this.fetchMeaning(entryId);
    }

    open(text: string, pageTitle: string, sectionTitle: string) {
        const term = text.trim();
        const page = pageTitle.trim();
        const sec = sectionTitle.trim();

        // Check if matching entry already exists in history
        const existing = this.history.find(
            e => e.searchTerm.toLowerCase() === term.toLowerCase() && 
                 e.pageTitle.toLowerCase() === page.toLowerCase() && 
                 e.sectionTitle.toLowerCase() === sec.toLowerCase()
        );

        if (existing) {
            this.activeEntryId = existing.id;
        } else {
            const id = String(Date.now() + Math.random());
            const newEntry: AiMeaningEntry = {
                id,
                searchTerm: term,
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
            this.fetchMeaning(id);
        }

        this.pageStore.uiSettingsStore.setSidebarPanel('meaning');
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

    async fetchMeaning(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        let currentUserId = '';
        try {
            const raw = localStorage.getItem('current_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                currentUserId = parsed.id || '';
            }
        } catch {}

        if (!currentUserId) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Sign in required to use AI features.';
                entry.errorDetails = {
                    errorType: 'CONFIG_ERROR',
                    message: 'Authentication Required',
                    description: 'Please sign in to configure and use your personal AI models.',
                };
            });
            return;
        }

        // Cancel previous inflight request if any
        const prevController = this.abortControllers.get(entryId);
        if (prevController) {
            prevController.abort();
        }
        const controller = new AbortController();
        this.abortControllers.set(entryId, controller);
        
        // 1. Fetch user's settings to get meaningModelId
        const configRes = await getModelConfig({ userId: currentUserId });
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

        const modelId = configRes.data.meaningModelId;
        if (!modelId) {
            this.abortControllers.delete(entryId);
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Default Model for Meanings is not configured. Please go to Settings to select one.';
                entry.errorDetails = {
                    errorType: 'CONFIG_ERROR',
                    message: 'Meaning Model Not Selected',
                    description: 'Please go to Settings -> Model Selection and select a default model for Meanings.',
                };
            });
            return;
        }

        const contextInfo = entry.sectionTitle 
            ? `under the section "${entry.sectionTitle}" of the page "${entry.pageTitle}"`
            : `on the page "${entry.pageTitle}"`;

        const userPrompt = `I am reading text ${contextInfo}.

Selected term/passage to lookup:
"${entry.searchTerm}"

Please provide a concise, clear definition, part of speech, pronunciation if applicable, and 2-3 usage examples tailored to this reading context.`;

        // 2. Query chat endpoint
        const chatRes = await getChatCompletion({
            userId: currentUserId,
            modelId,
            systemPrompt: 'You are a dictionary assistant. Provide a concise, clear definition, part of speech, pronunciation if applicable, and 2-3 usage examples for the selected word or text, matching the context of the page/topic. Return the output cleanly formatted in Markdown.',
            userPrompt,
            pageId: this.pageStore.pageId,
            actionType: 'meaning',
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
                    entry.error = chatRes.error.message || 'Failed to fetch AI meaning.';
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
