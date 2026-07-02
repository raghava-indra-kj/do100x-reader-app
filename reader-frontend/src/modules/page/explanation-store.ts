import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import type { PageStore } from './store';

export interface AiExplanationEntry {
    id: string;
    selectedText: string;
    pageTitle: string;
    sectionTitle: string;
    isLoading: boolean;
    responseMarkdown: string;
    error: string | null;
}

export class ExplanationStore {
    private readonly pageStore: PageStore;

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
        entry.error = null;

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
                error: null,
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

    async fetchExplanation(entryId: string) {
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
        
        // 1. Fetch user's settings to get explanationModelId
        const configRes = await getModelConfig({ userId: currentUserId });
        if (!configRes.ok) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'AI configuration not found. Please verify your settings.';
            });
            return;
        }

        const modelId = configRes.data.explanationModelId;
        if (!modelId) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Default Model for Explanation is not configured. Please go to Settings to select one.';
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
            userId: currentUserId,
            modelId,
            systemPrompt: 'You are a learning assistant. Explain the selected passage in context, breaking down complex terms and helping the user understand it clearly. Return the output cleanly formatted in Markdown.',
            userPrompt,
            pageId: this.pageStore.pageId,
            actionType: 'explanation',
        });

        runInAction(() => {
            entry.isLoading = false;
            if (chatRes.ok) {
                entry.responseMarkdown = chatRes.data.response;
            } else {
                entry.error = chatRes.error.message || 'Failed to fetch AI explanation.';
            }
        });
    }
}
