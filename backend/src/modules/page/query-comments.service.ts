import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_NOT_FOUND } from "@modules/page/errors/page-error.constants";
import { toComment } from "@modules/page/comment-result.mapper";
import { CommentListResult } from "@modules/page/comment.models";
import { QueryCommentsInput, QueryCommentsInputSchema } from "@modules/page/query-comments.models";

export async function queryComments(input: QueryCommentsInput): Promise<CommentListResult> {
    const { currentUser, pageId } = QueryCommentsInputSchema.parse(input);

    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }

    const rows = await prisma.comment.findMany({
        where: { pageId },
        orderBy: { createdAt: "asc" },
    });

    return { comments: rows.map(toComment) };
}
