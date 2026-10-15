import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { DbComment } from '../models/db-comment';
import type { CommentTargetInput } from '../models/comment';

export interface ICommentsRepo {

    getComments(params: { pageId?: string; isExplanation?: boolean; date?: string }): AsyncResult<DbComment[], AppError>;

    createComment(params: {
        pageId: string;
        pageTitle: string;
        sectionTitle: string | null;
        selectedText: string;
        body: string;
        linkedPageId: string | null;
        isExplanation: boolean;
    } & CommentTargetInput): AsyncResult<string, AppError>;

    editComment(params: {
        commentId: string;
        body?: string;
        linkedPageId?: string | null;
        resolved?: boolean;
    } & CommentTargetInput): AsyncResult<void, AppError>;

    deleteComment(params: { commentId: string }): AsyncResult<void, AppError>;
    deleteAllComments(params: { pageId: string }): AsyncResult<void, AppError>;
}
