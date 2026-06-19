import type { AsyncResult } from '@raghava.indra/result-ts';
import { ok } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { Comment } from '../models/comment';
import type { ICommentsRepo } from '../repos/comments-repo';
import { container, TYPES } from '@di/container';
import { Comment as CommentModel } from '../models/comment';

function toComment(db: import('../models/db-comment').DbComment): Comment {
    return new CommentModel({
        id: db.id,
        pageId: db.pageId,
        pageTitle: db.pageTitle,
        sectionTitle: db.sectionTitle,
        selectedText: db.selectedText,
        body: db.body,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt,
    });
}

export async function getComments(
    params: { pageId: string }
): AsyncResult<Comment[], AppError> {
    const repo = container.get<ICommentsRepo>(TYPES.ICommentsRepo);
    const result = await repo.getComments(params);
    if (!result.ok) return result;
    return ok(result.data.map(toComment));
}

export async function createComment(
    params: { pageId: string; pageTitle: string; sectionTitle: string | null; selectedText: string; body: string }
): AsyncResult<string, AppError> {
    const repo = container.get<ICommentsRepo>(TYPES.ICommentsRepo);
    const result = await repo.createComment(params);
    if (!result.ok) return result;
    return ok(result.data);
}

export async function editComment(
    params: { commentId: string; body: string }
): AsyncResult<void, AppError> {
    const repo = container.get<ICommentsRepo>(TYPES.ICommentsRepo);
    const result = await repo.editComment(params);
    if (!result.ok) return result;
    return ok(undefined);
}

export async function deleteComment(
    params: { commentId: string }
): AsyncResult<void, AppError> {
    const repo = container.get<ICommentsRepo>(TYPES.ICommentsRepo);
    return repo.deleteComment(params);
}
