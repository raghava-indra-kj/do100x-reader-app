import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { getChatCompletion } from '@domain/chat/services/chat-service';
import { createPage } from '@domain/page/services/pages-service';
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
    error: string | null;
    isSaved: boolean;
    savedPageId: string | null;
    isSavingPage: boolean;
}

export class DoubtStore {
    private readonly pageStore: PageStore;

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
            saveAsSubPage: action,
        });
    }

    get activeEntry(): AiDoubtEntry | null {
        return this.history.find(e => e.id === this.activeEntryId) || null;
    }

    reaskDoubt(entryId: string, newSearchTerm: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry) return;

        entry.searchTerm = newSearchTerm.trim();
        entry.isLoading = true;
        entry.responseMarkdown = '';
        entry.error = null;
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
                error: null,
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

    async fetchDoubt(entryId: string) {
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
        
        // 1. Fetch user's settings to get doubtModelId
        const configRes = await getModelConfig({ userId: currentUserId });
        if (!configRes.ok) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'AI configuration not found. Please verify your settings.';
            });
            return;
        }

        const modelId = configRes.data.doubtModelId;
        if (!modelId) {
            runInAction(() => {
                entry.isLoading = false;
                entry.error = 'Default Model for Asking Doubts is not configured. Please go to Settings to select one.';
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
            userId: currentUserId,
            modelId,
            systemPrompt: 'You are a learning assistant. The user is studying a passage and has a question/doubt about it. Provide a clear, detailed, and helpful answer. Format your response cleanly in Markdown.',
            userPrompt,
            pageId: this.pageStore.pageId,
            actionType: 'doubt',
        });

        runInAction(() => {
            entry.isLoading = false;
            if (chatRes.ok) {
                entry.responseMarkdown = chatRes.data.response;
            } else {
                entry.error = chatRes.error.message || 'Failed to fetch AI answer.';
            }
        });
    }

    async saveAsSubPage(entryId: string) {
        const entry = this.history.find(e => e.id === entryId);
        if (!entry || !entry.responseMarkdown || entry.isSaved || entry.isSavingPage) return;

        entry.isSavingPage = true;
        let currentUserId = '';
        try {
            const raw = localStorage.getItem('current_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                currentUserId = parsed.id || '';
            }
        } catch {}

        const result = await createPage({
            userId: currentUserId,
            parentPageId: this.pageStore.pageId,
            title: `Doubt: ${entry.searchTerm}`,
            content: `### Context\n\n> ${entry.selectedText.split('\n').join('\n> ')}\n\n### Doubt\n\n*${entry.searchTerm}*\n\n### Answer\n\n${entry.responseMarkdown}`,
            category: null,
        });

        runInAction(() => {
            entry.isSavingPage = false;
            if (result.ok) {
                entry.isSaved = true;
                entry.savedPageId = result.data;
                toast.success('Doubt saved as sub-page');
            } else {
                toast.error(result.error.message || 'Failed to save sub-page');
            }
        });
    }
}
