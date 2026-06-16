import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { DbPage } from '../models/db-page';
import type { DbPageListItem } from '../models/db-page-list-item';

export interface IPagesRepo {

    getPage(params: { pageId: string }): AsyncResult<DbPage, AppError>;

    createPage(params: {
        userId: string;
        parentPageId: string | null;
        title: string;
        content: string;
    }): AsyncResult<string, AppError>;

    editPage(params: {
        pageId: string;
        title: string;
        content: string;
    }): AsyncResult<void, AppError>;

    deletePage(params: { pageId: string }): AsyncResult<void, AppError>;

    queryPages(params: {
        parentPageId?: string | null;
        searchQuery?: string | null;
    }): AsyncResult<DbPageListItem[], AppError>;

    swapSortOrder(params: {
        pageId1: string;
        pageId2: string;
    }): AsyncResult<void, AppError>;
}
