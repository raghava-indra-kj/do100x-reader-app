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
    private _currentPage: Page | null;
    uiSettingsStore: PageUiSettingsStore;
    private _currentSectionIndex: number;

    constructor({ pageId }: { pageId: string }) {
        this.pageId = pageId;
        this.initDataState = DataState.init();
        this._currentPage = null;
        this.uiSettingsStore = new PageUiSettingsStore();
        this._currentSectionIndex = 0;
        makeObservable<PageStore, "_currentPage" | "_currentSectionIndex">(this, {
            initDataState: observable.ref,
            _currentPage: observable.ref,
            _currentSectionIndex: observable.ref,
            currentPage: computed,
            optCurrentPage: computed,
            flatSections: computed,
            currentSection: computed,
            currentSectionIndex: computed,
            hasNextSection: computed,
            hasPrevSection: computed,
            nextSection: action,
            prevSection: action,
            setCurrentSectionIndex: action,
        });
    }

    mount() {
        this.loadPage();
    }

    unmount() {

    }

    get optCurrentPage(): Page | null {
        return this._currentPage;
    }

    get currentPage(): Page {
        if (!this._currentPage) {
            throw new Error('currentPage is not loaded yet');
        }
        return this._currentPage;
    }

    get flatSections(): Section[] {
        if (!this._currentPage) return [];
        return flattenSections(this._currentPage.sections);
    }

    get currentSection(): Section | null {
        if (!this._currentPage) return null;
        return this.flatSections[this._currentSectionIndex] ?? null;
    }

    async loadPage() {
        this.initDataState = DataState.loading();
        const result = await getPage({ pageId: this.pageId });
        runInAction(() => {
            if (result.ok) {
                this._currentPage = result.data;
                this._currentSectionIndex = 0;
                this.initDataState = DataState.data(undefined);
            } else {
                this.initDataState = DataState.error(result.error);
            }
        });
    }

    get currentSectionIndex(): number {
        return this._currentSectionIndex;
    }

    setCurrentSectionIndex(index: number) {
        const max = this.flatSections.length - 1;
        this._currentSectionIndex = Math.max(0, Math.min(index, max));
    }

    get hasNextSection(): boolean {
        return this._currentSectionIndex < this.flatSections.length - 1;
    }

    get hasPrevSection(): boolean {
        return this._currentSectionIndex > 0;
    }

    nextSection() {
        if (!this.hasNextSection) return;
        this._currentSectionIndex++;
    }

    prevSection() {
        if (!this.hasPrevSection) return;
        this._currentSectionIndex--;
    }
}