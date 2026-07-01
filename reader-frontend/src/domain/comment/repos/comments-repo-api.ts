import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbCommentSchema, type DbComment } from '../models/db-comment';
import type { ICommentsRepo } from './comments-repo';

export class CommentsRepoApi implements ICommentsRepo {
    async getComments(params: { pageId?: string; isExplanation?: boolean; date?: string }): AsyncResult<DbComment[], AppError> {
        try {
            const query: Record<string, string> = {};
            if (params.pageId) query.pageId = params.pageId;
            if (params.isExplanation !== undefined) query.isExplanation = String(params.isExplanation);
            if (params.date) query.date = params.date;
            const { data } = await apiClient.get('/comments', { params: query });
            return ok((data as unknown[]).map((item) => DbCommentSchema.parse(item)));
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to get comments'), cause: error }));
        }
    }

    async createComment(params: {
        pageId: string;
        pageTitle: string;
        sectionTitle: string | null;
        selectedText: string;
        body: string;
        linkedPageId: string | null;
        isExplanation: boolean;
    }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/comments', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create comment'), cause: error }));
        }
    }

    async editComment({ commentId, body, linkedPageId }: {
        commentId: string;
        body: string;
        linkedPageId?: string | null;
    }): AsyncResult<void, AppError> {
        try {
            const payload: Record<string, unknown> = { body };
            if (linkedPageId !== undefined) {
                payload.linkedPageId = linkedPageId;
            }
            await apiClient.put(`/comments/${commentId}`, payload);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to edit comment'), cause: error }));
        }
    }

    async deleteComment({ commentId }: { commentId: string }): AsyncResult<void, AppError> {
        try {
            await apiClient.delete(`/comments/${commentId}`);
            return ok(undefined);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete comment'), cause: error }));
        }
    }
}