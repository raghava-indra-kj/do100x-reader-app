import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { getPage } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import type { PageHeadingLevel } from './theme/page-heading-level';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { PageUiSettingsStore } from './ui-settings-store';
import { DictionaryStore } from './dictionary-store';
import { PageReadingState } from './reading-state';
import { MeaningStore } from './meaning-store';
import { DoubtStore } from './doubt-store';
import { ExplanationStore } from './explanation-store';

export interface Motivation {
    quote: string;
    meaning: string;
    by: string;
}

export const PageContext = createContext<PageStore | null>(null);

export const usePageStore = () => {
    const store = useContext(PageContext);
    if (!store) throw new Error('usePageStore must be used within a PageProvider');
    return store;
};

function flattenSections(sections: Section[]): Section[] {
    const result: Section[] = [];
    function walk(items: Section[]) {
        for (const s of items) {
            result.push(s);
            walk(s.children);
        }
    }
    walk(sections);
    return result;
}

export class PageStore {
    readonly pageId: string;
    initDataState: DataState<void>;
    uiSettingsStore: PageUiSettingsStore;
    dictionaryStore: DictionaryStore;
    meaningStore: MeaningStore;
    doubtStore: DoubtStore;
    explanationStore: ExplanationStore;
    readingState: PageReadingState;
    private _currentPage: Page | null;
    private _currentSectionId: string | null;
    _parentPageTitle: string | null;
    _motivationQuote: Motivation | null;
    commentsVersion: number;
    vocabVersion: number;

    constructor({ pageId }: { pageId: string }) {
        this.pageId = pageId;
        this.initDataState = DataState.init();
        this.uiSettingsStore = new PageUiSettingsStore();
        this.dictionaryStore = new DictionaryStore();
        this.meaningStore = new MeaningStore(this);
        this.doubtStore = new DoubtStore(this);
        this.explanationStore = new ExplanationStore(this);
        this.readingState = new PageReadingState({ pageId });
        this._currentPage = null;
        this._currentSectionId = null;
        this._parentPageTitle = null;
        this._motivationQuote = null;
        this.commentsVersion = 0;
        this.vocabVersion = 0;
        makeObservable<PageStore, "_currentPage" | "_currentSectionId" | "_parentPageTitle">(this, {
            initDataState: observable.ref,
            _currentPage: observable.ref,
            _currentSectionId: observable.ref,
            _parentPageTitle: observable.ref,
            _motivationQuote: observable.ref,
            commentsVersion: observable,
            vocabVersion: observable,
            optCurrentPage: computed,
            flatSections: computed,
            navigableSections: computed,
            currentSection: computed,
            hasPrevSection: computed,
            hasNextSection: computed,
            parentPageTitle: computed,
            motivationQuote: computed,
            readingProgress: computed,
            headingLevel: computed,
            setCurrentSection: action,
            goToPrevSection: action,
            goToNextSection: action,
            triggerMotivation: action,
            dismissMotivation: action,
            setHeadingLevel: action,
            bumpCommentsVersion: action,
            bumpVocabVersion: action,
        });
    }

    mount() {
        this.loadPage();
    }

    bumpCommentsVersion() {
        this.commentsVersion++;
    }

    bumpVocabVersion() {
        this.vocabVersion++;
    }

    get optCurrentPage(): Page | null {
        return this._currentPage;
    }

    get parentPageTitle(): string | null {
        return this._parentPageTitle;
    }

    get motivationQuote(): Motivation | null {
        return this._motivationQuote;
    }

    get flatSections(): Section[] {
        if (!this._currentPage) return [];
        return flattenSections(this._currentPage.sections);
    }

    /**
     * The selected section, snapped up to the nearest heading at or above the current
     * heading level. Because the view renders a section's whole subtree, lowering the
     * heading level widens the view to the enclosing section — at H1 a single top-level
     * heading expands to the entire page.
     */
    get currentSection(): Section | null {
        const flat = this.flatSections;
        if (flat.length === 0) return null;

        const maxLevel = this.headingLevel.value ?? 6;
        const selected = this._currentSectionId
            ? flat.findIndex((s) => s.id === this._currentSectionId)
            : 0;
        const start = selected === -1 ? 0 : selected;

        for (let i = start; i >= 0; i--) {
            if (flat[i].level <= maxLevel) return flat[i];
        }
        return flat[0];
    }

    setCurrentSection(section: Section) {
        this._currentSectionId = section.id;
        this.readingState.setSectionId(section.id);
    }

    /** Resolves the per-page heading level override, or the global default (H2) when none is set. */
    get headingLevel(): PageHeadingLevel {
        return this.readingState.headingLevelOverride ?? this.uiSettingsStore.defaultHeadingLevel;
    }

    setHeadingLevel(level: PageHeadingLevel) {
        this.readingState.setHeadingLevel(level);
    }

    /** Sections shallow enough to navigate to at the current heading level (mirrors the TOC). */
    get navigableSections(): Section[] {
        const maxLevel = this.headingLevel.value ?? 6;
        return this.flatSections.filter((s) => s.level <= maxLevel);
    }

    get hasPrevSection(): boolean {
        const current = this.currentSection;
        return current ? this.navigableSections.indexOf(current) > 0 : false;
    }

    get hasNextSection(): boolean {
        const current = this.currentSection;
        if (!current) return false;
        const sections = this.navigableSections;
        return sections.indexOf(current) < sections.length - 1;
    }

    get readingProgress(): number {
        const sections = this.navigableSections;
        if (sections.length === 0) return 0;
        const current = this.currentSection;
        if (!current) return 0;
        const index = sections.indexOf(current);
        if (index < 0) return 0;
        return Math.round(((index + 1) / sections.length) * 100);
    }

    goToPrevSection() {
        const current = this.currentSection;
        if (!current) return;
        const prev = this.navigableSections[this.navigableSections.indexOf(current) - 1];
        if (prev) this.setCurrentSection(prev);
    }

    goToNextSection() {
        const current = this.currentSection;
        if (!current) return;
        const next = this.navigableSections[this.navigableSections.indexOf(current) + 1];
        if (next) this.setCurrentSection(next);
    }

    async loadPage() {
        this.initDataState = DataState.loading();
        const result = await getPage({ pageId: this.pageId });
        runInAction(() => {
            if (result.ok) {
                this._currentPage = result.data;
                const persistedSectionId = result.data.isEmpty ? null : this.readingState.sectionId;
                this._currentSectionId =
                    persistedSectionId && this.flatSections.some((s) => s.id === persistedSectionId)
                        ? persistedSectionId
                        : null;
                if (result.data.isEmpty && this.uiSettingsStore.sidebarPanel === 'contents') {
                    this.uiSettingsStore.setSidebarPanel('subpages');
                }
                this.initDataState = DataState.data(undefined);
                if (result.data.parentPageId) {
                    this.loadParentPageTitle(result.data.parentPageId);
                }
            } else {
                this.initDataState = DataState.error(result.error);
            }
        });
    }

    triggerMotivation(quote: Motivation) {
        this._motivationQuote = quote;
    }

    dismissMotivation() {
        this._motivationQuote = null;
    }

    async loadParentPageTitle(parentPageId: string) {
        const result = await getPage({ pageId: parentPageId });
        runInAction(() => {
            if (result.ok) {
                this._parentPageTitle = result.data.title;
            }
        });
    }
}
