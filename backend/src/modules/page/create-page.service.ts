import { prisma } from "@core/db/prisma";
import { CreatePageInput, CreatePageInputSchema } from "@modules/page/create-page.models";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_PARENT_NOT_FOUND } from "@modules/page/errors/page-error.constants";
import { insertPage } from "@modules/page/insert-page.service";
import { toPage } from "@modules/page/page-result.mapper";
import { Page } from "@modules/page/page.models";
import { parseMarkdown, toJson } from "@reader/md-ast";
import { generateKeyBetween } from "fractional-indexing";

export async function createPage(input: CreatePageInput): Promise<Page> {
    const { currentUser, title, content, parentId } = CreatePageInputSchema.parse(input);

    const parent = await prisma.page.findUnique({ where: { id: parentId } });
    if (!parent || parent.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_PARENT_NOT_FOUND, message: `Parent page ${parentId} not found` });
    }

    const doc = parseMarkdown({ source: content ?? "" });
    const contentJson = toJson(doc);

    const row = await prisma.$transaction(async (tx) => {
        const lastSibling = await tx.page.findFirst({
            where: { userId: currentUser.id, parentId },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
        });
        const sortOrder = generateKeyBetween(lastSibling?.sortOrder ?? null, null);

        const newPage = await insertPage({ tx, userId: currentUser.id, parentId, title, content: contentJson, sortOrder });

        await tx.page.update({ where: { id: parentId }, data: { childrenCount: { increment: 1 } } });

        return newPage;
    });

    return toPage(row);
}
