import { action, makeObservable, observable, runInAction } from 'mobx';
import { DataState } from '@lib/utils/data-state';
import type { DictionaryResult } from '@domain/dictionary/models/dictionary-models';
import { lookupWord } from '@domain/dictionary/services/dictionary-service';
import { AppError } from '@core/errors/app-error';

/**
 * MobX store managing the dictionary panel state.
 * Owned by PageStore — same lifecycle as the page.
 */
export class DictionaryStore {
    isOpen = false;
    searchWord = '';
    lookupState: DataState<DictionaryResult> = DataState.init();

    private abortController: AbortController | null = null;

    constructor() {
        makeObservable(this, {
            isOpen: observable,
            searchWord: observable,
            lookupState: observable.ref,
            open: action,
            close: action,
            setSearchWord: action,
            lookup: action,
        });
    }

    /** Opens the panel, optionally pre-filling a word and triggering a lookup. */
    open(word?: string) {
        this.isOpen = true;
        if (word) {
            this.searchWord = word;
            this.lookup();
        }
    }

    close() {
        this.isOpen = false;
        this.abortController?.abort();
    }

    setSearchWord(word: string) {
        this.searchWord = word;
    }

    /** Triggers an API lookup for the current searchWord. */
    lookup() {
        const word = this.searchWord.trim();
        if (!word) {
            this.lookupState = DataState.error(
                new AppError({ message: 'Please enter a word to look up' }),
            );
            return;
        }

        // Cancel any in-flight request
        this.abortController?.abort();
        this.abortController = new AbortController();

        this.lookupState = DataState.loading();

        lookupWord(word).then((result) => {
            runInAction(() => {
                if (result.ok) {
                    this.lookupState = DataState.data(result.data);
                } else {
                    this.lookupState = DataState.error(result.error);
                }
            });
        });
    }
}
