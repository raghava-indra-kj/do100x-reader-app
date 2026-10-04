import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { z } from 'zod';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbPageSchema, type DbPage } from '../models/db-page';
import { DbPageListItemSchema, type DbPageListItem } from '../models/db-page-list-item';
import type { IPagesRepo } from './pages-repo';
import { SectionEditSnapshotSchema, type SectionEditSnapshot, type SectionEditParams } from '../models/section-edit';

export class PageRepoApi implements IPagesRepo {
    async getSectionEditSnapshot(pageId: string): AsyncResult<SectionEditSnapshot, AppError> {
        try {
            const { data } = await apiClient.get(`/pages/${pageId}/edit-targets`);
            return ok(SectionEditSnapshotSchema.parse(data));
        } catch (error) { return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load the section. Try again.'), cause: error })); }
    }

    async editSectionBody(params: SectionEditParams): AsyncResult<{ content: string; contentVersion: number }, AppError> {
        try {
            const { pageId, ...body } = params;
            const { data } = await apiClient.patch(`/pages/${pageId}/section-body`, body);
            return ok(z.object({ content: z.string(), contentVersion: z.number().int() }).parse(data));
        } catch (error) { return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the section. Try again.'), cause: error })); }
    }
    async getPage({ pageId }: { pageId: string }): AsyncResult<DbPage, AppError> {
        try {
            const { data } = await apiClient.get(`/pages/${pageId}`);
            return ok(DbPageSchema.parse(data));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load the page. Try again.'), cause: error }));
        }
    }

    async createPage(params: {
        parentPageId: string | null;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/pages', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t create the page. Try again.'), cause: error }));
        }
    }

    async editPage(params: {
        pageId: string;
        contentVersion: number;
        title: string;
        content: string;
        category: string | null;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.put(`/pages/${params.pageId}`, params);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t save the page. Try again.'), cause: error }));
        }
    }

    async updateShareStatus(params: {
        pageId: string;
        isPublic: boolean;
    }): AsyncResult<{ isPublic: boolean; isPubliclyAccessible: boolean }, AppError> {
        try {
            const { data } = await apiClient.patch(`/pages/${params.pageId}/share`, {
                isPublic: params.isPublic,
            });
            return ok(data as { isPublic: boolean; isPubliclyAccessible: boolean });
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t update sharing. Try again.'), cause: error }));
        }
    }

    async deletePage({ pageId }: { pageId: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/pages/${pageId}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t delete the page. Try again.'), cause: error }));
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
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t load pages. Try again.'), cause: error }));
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
            return err(new AppError({ message: getApiErrorMessage(error, 'Couldn’t reorder the pages. Try again.'), cause: error }));
        }
    }
}
