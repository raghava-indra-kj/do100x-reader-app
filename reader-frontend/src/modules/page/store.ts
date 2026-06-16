import type { Page } from '@domain/page/models/page';
import { getPage } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import { computed, makeObservable, observable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { PageUiSettingsStore } from './ui-settings-store';

export const PageContext = createContext<PageStore | null>(null);

export const usePageStore = () => {
    const store = useContext(PageContext);
    if (!store) throw new Error('usePageStore must be used within a PageProvider');
    return store;
};

export class PageStore {
    readonly pageId: string;
    initDataState: DataState<void>;
    private _currentPage: Page | null;
    uiSettingsStore: PageUiSettingsStore;

    constructor({ pageId }: { pageId: string }) {
        this.pageId = pageId;
        this.initDataState = DataState.init();
        this._currentPage = null;
        this.uiSettingsStore = new PageUiSettingsStore();
        makeObservable<PageStore, "_currentPage">(this, {
            initDataState: observable.ref,
            _currentPage: observable.ref,
            currentPage: computed,
            optCurrentPage: computed,
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

    async loadPage() {
        this.initDataState = DataState.loading();
        const result = await getPage({ pageId: this.pageId });
        runInAction(() => {
            if (result.ok) {
                this._currentPage = result.data;
                this.initDataState = DataState.data(undefined);
            } else {
                this.initDataState = DataState.error(result.error);
            }
        });
    }
}