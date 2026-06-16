import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { getPage } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { PageUiSettingsStore } from './ui-settings-store';

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
    private _currentPage: Page | null;
    private _currentSectionId: string | null;

    constructor({ pageId }: { pageId: string }) {
        this.pageId = pageId;
        this.initDataState = DataState.init();
        this.uiSettingsStore = new PageUiSettingsStore();
        this._currentPage = null;
        this._currentSectionId = null;
        makeObservable<PageStore, "_currentPage" | "_currentSectionId">(this, {
            initDataState: observable.ref,
            _currentPage: observable.ref,
            _currentSectionId: observable.ref,
            optCurrentPage: computed,
            flatSections: computed,
            navigableSections: computed,
            currentSection: computed,
            hasPrevSection: computed,
            hasNextSection: computed,
            setCurrentSection: action,
            goToPrevSection: action,
            goToNextSection: action,
        });
    }

    mount() {
        this.loadPage();
    }

    get optCurrentPage(): Page | null {
        return this._currentPage;
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

        const maxLevel = this.uiSettingsStore.headingLevel.value ?? 6;
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
    }

    /** Sections shallow enough to navigate to at the current heading level (mirrors the TOC). */
    get navigableSections(): Section[] {
        const maxLevel = this.uiSettingsStore.headingLevel.value ?? 6;
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
                this._currentSectionId = null;
                this.initDataState = DataState.data(undefined);
            } else {
                this.initDataState = DataState.error(result.error);
            }
        });
    }
}
