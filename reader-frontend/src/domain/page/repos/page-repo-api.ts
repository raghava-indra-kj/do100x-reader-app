import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbPageSchema, type DbPage } from '../models/db-page';
import { DbPageListItemSchema, type DbPageListItem } from '../models/db-page-list-item';
import type { IPagesRepo } from './pages-repo';
import { z } from 'zod';

const ReaderDocumentSchema = z.object({
    id: z.string(),
    readerSpaceId: z.string(),
    parentDocumentId: z.string().nullable(),
    title: z.string(),
    category: z.string().nullable(),
    meaningSystemPrompt: z.string().nullable().optional(),
    explanationSystemPrompt: z.string().nullable().optional(),
    doubtSystemPrompt: z.string().nullable().optional(),
    childrenCount: z.number().int().nonnegative(),
    permission: z.enum(['viewer', 'editor', 'admin', 'owner']),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    revision: z.object({
        number: z.number().int().positive(),
        markdown: z.string(),
        createdById: z.string(),
    }),
});

const ReaderDocumentListItemSchema = z.object({
    id: z.string(),
    parentDocumentId: z.string().nullable(),
    title: z.string(),
    category: z.string().nullable(),
    childrenCount: z.number().int().nonnegative(),
    revisionNumber: z.number().int().positive(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

function canEdit(permission: z.infer<typeof ReaderDocumentSchema>['permission']): boolean {
    return permission === 'owner' || permission === 'admin' || permission === 'editor';
}

function toDbPage(document: z.infer<typeof ReaderDocumentSchema>): DbPage {
    return DbPageSchema.parse({
        id: document.id,
        readerSpaceId: document.readerSpaceId,
        userId: document.revision.createdById,
        parentPageId: document.parentDocumentId,
        title: document.title,
        content: document.revision.markdown,
        category: document.category,
        sortOrder: 0,
        childrenCount: document.childrenCount,
        isOwner: canEdit(document.permission),
        revisionNumber: document.revision.number,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        meaningSystemPrompt: document.meaningSystemPrompt ?? null,
        explanationSystemPrompt: document.explanationSystemPrompt ?? null,
        doubtSystemPrompt: document.doubtSystemPrompt ?? null,
    });
}

export class PageRepoApi implements IPagesRepo {
    async getPage({ pageId }: { pageId: string }): AsyncResult<DbPage, AppError> {
        try {
            const shareToken = typeof window === 'undefined'
                ? null
                : new URLSearchParams(window.location.search).get('share');
            const { data } = await apiClient.get(`/reader/documents/${pageId}`, {
                params: shareToken ? { share: shareToken } : undefined,
            });
            return ok(toDbPage(ReaderDocumentSchema.parse(data)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to get page'), cause: error }));
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
            const { data } = await apiClient.post('/reader/documents', {
                parentDocumentId: params.parentPageId,
                title: params.title,
                markdown: params.content,
                category: params.category,
                meaningSystemPrompt: params.meaningSystemPrompt,
                explanationSystemPrompt: params.explanationSystemPrompt,
                doubtSystemPrompt: params.doubtSystemPrompt,
            });
            return ok(z.object({ id: z.string() }).parse(data).id);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create page'), cause: error }));
        }
    }

    async editPage(params: {
        pageId: string;
        title: string;
        content: string;
        category: string | null;
        baseRevision: number;
        meaningSystemPrompt?: string;
        explanationSystemPrompt?: string;
        doubtSystemPrompt?: string;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.put(`/reader/documents/${params.pageId}`, {
                title: params.title,
                markdown: params.content,
                category: params.category,
                baseRevision: params.baseRevision,
                meaningSystemPrompt: params.meaningSystemPrompt,
                explanationSystemPrompt: params.explanationSystemPrompt,
                doubtSystemPrompt: params.doubtSystemPrompt,
            });
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to edit page'), cause: error }));
        }
    }

    async deletePage({ pageId }: { pageId: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/reader/documents/${pageId}`);
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
            const documentQuery: Record<string, string> = {};
            if (params.parentPageId !== undefined) {
                documentQuery['parentDocumentId'] = params.parentPageId ?? 'null';
            }
            if (params.searchQuery) documentQuery['search'] = params.searchQuery;
            const { data } = await apiClient.get('/reader/documents', { params: documentQuery });
            return ok((data as unknown[]).map((item, index) => {
                const document = ReaderDocumentListItemSchema.parse(item);
                return DbPageListItemSchema.parse({
                    id: document.id,
                    userId: '',
                    parentPageId: document.parentDocumentId,
                    title: document.title,
                    category: document.category,
                    sortOrder: index,
                    childrenCount: document.childrenCount,
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt,
                });
            }));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to query pages'), cause: error }));
        }
    }

    async swapSortOrder({ pageId1, pageId2 }: {
        pageId1: string;
        pageId2: string;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.post('/reader/documents/reorder', { documentId1: pageId1, documentId2: pageId2 });
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to swap sort order'), cause: error }));
        }
    }
}
