import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import type { PageStore } from './store';

export interface AiMeaningEntry {
    id: string;
    searchTerm: string;
    pageTitle: string;
    sectionTitle: string;
    isLoading: boolean;
    responseMarkdown: string;
    error: string | null;
}

export class MeaningStore {
    private readonly pageStore: PageStore;

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
        });
    }

    get activeEntry(): AiMeaningEntry | null {
        return this.history.find(e => e.id === this.activeEntryId) || null;
    }

    reaskMeaning(entryId: string, newSearchTerm: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.searchTerm = newSearchTerm.trim();
        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.error = null;

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
                error: null,
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
        const index = this.history.findIndex(e => e.id === id);
        if (index > -1) {
            this.history.splice(index, 1);
            if (this.activeEntryId === id) {
                this.activeEntryId = this.history.length > 0 ? this.history[this.history.length - 1].id : null;
            }
        }
    }

    clearHistory() {
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
        
        // 1. Fetch user's settings to get meaningModelId
        const configRes = await getModelConfig({ userId: currentUserId });
        if (!configRes.ok) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'AI configuration not found. Please verify your settings.';
            });
            return;
        }

        const modelId = configRes.data.meaningModelId;
        if (!modelId) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Default Model for Meanings is not configured. Please go to Settings to select one.';
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
        });

        runInAction(() => {
            entry.isLoading = false;
            if (chatRes.ok) {
                entry.responseMarkdown = chatRes.data.response;
            } else {
                entry.error = chatRes.error.message || 'Failed to fetch AI meaning.';
            }
        });
    }
}
