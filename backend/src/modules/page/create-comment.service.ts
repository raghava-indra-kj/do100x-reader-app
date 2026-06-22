import { generateUuid } from "@lib/uuid";
import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_NOT_FOUND } from "@modules/page/errors/page-error.constants";
import { toComment } from "@modules/page/comment-result.mapper";
import { Comment } from "@modules/page/comment.models";
import { CreateCommentInput, CreateCommentInputSchema } from "@modules/page/create-comment.models";

export async function createComment(input: CreateCommentInput): Promise<Comment> {
    const { currentUser, pageId, comment, selectionText } = CreateCommentInputSchema.parse(input);

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }

    const id = generateUuid();
    const now = new Date();

    const row = await prisma.comment.create({
        data: {
            id,
            pageId,
            userId: currentUser.id,
            selectionText: selectionText ?? null,
            comment,
            createdAt: now,
            updatedAt: now,
        },
    });

    return toComment(row);
}
