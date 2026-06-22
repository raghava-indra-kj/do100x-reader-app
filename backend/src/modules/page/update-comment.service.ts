import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_NOT_FOUND } from "@modules/page/errors/page-error.constants";
import { CommentError } from "@modules/page/errors/comment-error";
import { COMMENT_NOT_FOUND, COMMENT_ACCESS_DENIED } from "@modules/page/errors/comment-error.constants";
import { toComment } from "@modules/page/comment-result.mapper";
import { Comment } from "@modules/page/comment.models";
import { UpdateCommentInput, UpdateCommentInputSchema } from "@modules/page/update-comment.models";

export async function updateComment(input: UpdateCommentInput): Promise<Comment> {
    const { currentUser, pageId, commentId, comment } = UpdateCommentInputSchema.parse(input);

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }

    const row = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!row || row.pageId !== pageId) {
        throw new CommentError({ errorCode: COMMENT_NOT_FOUND, message: `Comment ${commentId} not found` });
    }
    if (row.userId !== currentUser.id) {
        throw new CommentError({ errorCode: COMMENT_ACCESS_DENIED, message: `Access denied to comment ${commentId}` });
    }

    const updatedRow = await prisma.comment.update({
        where: { id: commentId },
        data: { comment, updatedAt: new Date() },
    });

    return toComment(updatedRow);
}
