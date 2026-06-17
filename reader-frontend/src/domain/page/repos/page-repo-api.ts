import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbPageSchema, type DbPage } from '../models/db-page';
import { DbPageListItemSchema, type DbPageListItem } from '../models/db-page-list-item';
import type { IPagesRepo } from './pages-repo';

export class PageRepoApi implements IPagesRepo {
    async getPage({ pageId }: { pageId: string }): AsyncResult<DbPage, AppError> {
        try {
            const { data } = await apiClient.get(`/pages/${pageId}`);
            return ok(DbPageSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to get page'), cause: error }));
        }
    }

    async createPage(params: {
        userId: string;
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
    }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/pages', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create page'), cause: error }));
        }
    }

    async editPage({ pageId, title, content, category }: {
        pageId: string;
        title: string;
        content: string;
        category: string | null;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.put(`/pages/${pageId}`, { title, content, category });
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to edit page'), cause: error }));
        }
    }

    async deletePage({ pageId }: { pageId: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/pages/${pageId}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete page'), cause: error }));
        }
    }

    async queryPages(params: {
        parentPageId?: string | null;
        searchQuery?: string | null;
    }): AsyncResult<DbPageListItem[], AppError> {
        try {
            const query: Record<string, string> = {};
            if (params.parentPageId !== undefined) {
                query['parentPageId'] = params.parentPageId ?? 'null';
            }
            if (params.searchQuery) {
                query['searchQuery'] = params.searchQuery;
            }
            const { data } = await apiClient.get('/pages', { params: query });
            return ok((data as unknown[]).map((item) => DbPageListItemSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to query pages'), cause: error }));
        }
    }

    async swapSortOrder({ pageId1, pageId2 }: {
        pageId1: string;
        pageId2: string;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.post('/pages/swap', { pageId1, pageId2 });
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to swap sort order'), cause: error }));
        }
    }
}
