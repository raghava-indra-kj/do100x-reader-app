import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { createPage } from '@domain/page/services/pages-service';
import { ChatAppError, type ChatErrorDetails } from '@domain/chat/models/chat-types';
import { toast } from '@modules/core/ui/primitives/toast';
import type { PageStore } from './store';

export interface AiDoubtEntry {
    id: string;
    searchTerm: string;
    selectedText: string;
    pageTitle: string;
    sectionTitle: string;
    isLoading: boolean;
    responseMarkdown: string;
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
            saveAsSubPage: action,
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

        entry.searchTerm = newSearchTerm.trim();
        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.rawResponse = null;
        entry.error = null;
        entry.errorDetails = null;
        entry.isSaved = false;
        entry.savedPageId = null;

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
        entry.responseMarkdown = '';
        entry.rawResponse = null;
        entry.error = null;
        entry.errorDetails = null;
        entry.isSaved = false;
        entry.savedPageId = null;

        this.fetchDoubt(entryId);
    }

    open(doubtText: string, selectedText: string, pageTitle: string, sectionTitle: string) {
        const query = doubtText.trim();
        const passage = selectedText.trim();
        const page = pageTitle.trim();
        const sec = sectionTitle.trim();

        // Check if matching entry already exists in history
        const existing = this.history.find(
            e => e.searchTerm.toLowerCase() === query.toLowerCase() && 
                 e.selectedText.toLowerCase() === passage.toLowerCase()
        );

        if (existing) {
            this.activeEntryId = existing.id;
        } else {
            const id = String(Date.now() + Math.random());
            const newEntry: AiDoubtEntry = {
                id,
                searchTerm: query,
                selectedText: passage,
                pageTitle: page,
                sectionTitle: sec,
                isLoading: true,
                responseMarkdown: '',
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

    async fetchDoubt(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;



        // Cancel previous inflight request if any
        const prevController = this.abortControllers.get(entryId);
        if (prevController) {
            prevController.abort();
        }
        const controller = new AbortController();
        this.abortControllers.set(entryId, controller);
        
        // 1. Fetch user's settings to get doubtModelId
        const configRes = await getModelConfig();
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
"${entry.searchTerm}"

Please help me understand this and directly answer my doubt.`;

        // 2. Query chat endpoint
        const chatRes = await getChatCompletion({
            modelId,
            systemPrompt: 'You are a learning assistant. The user is studying a passage and has a question/doubt about it. Provide a clear, detailed, and helpful answer. Format your response cleanly in Markdown.',
            userPrompt,
            pageId: this.pageStore.pageId,
            actionType: 'doubt',
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
                    entry.error = chatRes.error.message || 'Couldn’t get an answer. Try again.';
                    entry.errorDetails = {
                        errorType: 'UNKNOWN',
                        message: chatRes.error.message || 'Couldn’t get a response. Try again.',
                        rawError: chatRes.error,
                    };
                }
            }
        });
    }

    async saveAsSubPage(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry || !entry.responseMarkdown || entry.isSaved || entry.isSavingPage) return;

        entry.isSavingPage = true;

        const result = await createPage({
            parentPageId: this.pageStore.pageId,
            title: `Question: ${entry.searchTerm}`,
            content: `### Context\n\n> ${entry.selectedText.split('\n').join('\n> ')}\n\n### Question\n\n*${entry.searchTerm}*\n\n### Answer\n\n${entry.responseMarkdown}`,
            category: null,
        });

        runInAction(() => {
            entry.isSavingPage = false;
            if (result.ok) {
                entry.isSaved = true;
                entry.savedPageId = result.data;
                toast.success('Answer saved as a subpage');
            } else {
                toast.error(result.error.message || 'Couldn’t save the subpage. Try again.');
            }
        });
    }
}
