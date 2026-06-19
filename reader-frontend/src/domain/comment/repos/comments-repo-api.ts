import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { DbCommentSchema, type DbComment } from '../models/db-comment';
import type { ICommentsRepo } from './comments-repo';

export class CommentsRepoApi implements ICommentsRepo {
    async getComments({ pageId }: { pageId: string }): AsyncResult<DbComment[], AppError> {
        try {
            const { data } = await apiClient.get('/comments', { params: { pageId } });
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
    }): AsyncResult<string, AppError> {
        try {
            const { data } = await apiClient.post('/comments', params);
            return ok(data as string);
        } catch (error) {
            return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create comment'), cause: error }));
        }
    }

    async editComment({ commentId, body }: {
        commentId: string;
        body: string;
    }): AsyncResult<void, AppError> {
        try {
            await apiClient.put(`/comments/${commentId}`, { body });
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
