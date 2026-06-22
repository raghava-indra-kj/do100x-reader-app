import { parseMarkdown, fromJson, toJson, reuseIds } from "@reader/md-ast";
import { Prisma } from "@prisma-generated";
import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_NOT_FOUND, PAGE_ACCESS_DENIED } from "@modules/page/errors/page-error.constants";
import { Page } from "@modules/page/page.models";
import { toPage } from "@modules/page/page-result.mapper";
import { UpdatePageInput, UpdatePageInputSchema } from "@modules/page/update-page.models";

export async function updatePage(input: UpdatePageInput): Promise<Page> {
    const { currentUser, pageId, title, content } = UpdatePageInputSchema.parse(input);

    const row = await prisma.page.findUnique({ where: { id: pageId } });
    if (!row) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }
    if (row.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_ACCESS_DENIED, message: `Access denied to page ${pageId}` });
    }

    let newContent: Prisma.InputJsonValue | undefined;
    if (content != null) {
        const freshDoc = parseMarkdown({ source: content });
        if (row.content !== null) {
            newContent = toJson(reuseIds({ previous: fromJson(row.content), next: freshDoc })) as unknown as Prisma.InputJsonValue;
        } else {
            newContent = toJson(freshDoc) as unknown as Prisma.InputJsonValue;
        }
    }

    const updatedRow = await prisma.page.update({
        where: { id: pageId },
        data: {
            title,
            ...(newContent !== undefined ? { content: newContent } : {}),
            updatedAt: new Date(),
        },
    });

    return toPage(updatedRow);
}
