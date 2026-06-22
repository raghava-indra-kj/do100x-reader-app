import { comment } from "@prisma-generated";
import { Comment } from "@modules/page/comment.models";

export function toComment(row: comment): Comment {
    return {
        id: row.id,
        pageId: row.pageId,
        userId: row.userId,
        selectionText: row.selectionText,
        comment: row.comment,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
