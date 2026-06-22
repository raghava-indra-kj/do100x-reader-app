import { prisma } from "@core/db/prisma";
import { DeletePageInput, DeletePageInputSchema } from "@modules/page/delete-page.models";
import { PageError } from "@modules/page/errors/page-error";
import { PAGE_ACCESS_DENIED, PAGE_CANNOT_DELETE_HOMEPAGE, PAGE_NOT_FOUND } from "@modules/page/errors/page-error.constants";
import { Prisma } from "@prisma-generated";

async function deleteSubtree({ tx, pageId }: { tx: Prisma.TransactionClient; pageId: string }): Promise<void> {
    const children = await tx.page.findMany({ where: { parentId: pageId }, select: { id: true } });

    for (const child of children) {
        await deleteSubtree({ tx, pageId: child.id });
    }

    await tx.comment.deleteMany({ where: { pageId } });
    await tx.page.delete({ where: { id: pageId } });
}

export async function deletePage(input: DeletePageInput): Promise<void> {
    const { currentUser, pageId } = DeletePageInputSchema.parse(input);

    const row = await prisma.page.findUnique({ where: { id: pageId } });
    if (!row) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }
    if (row.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_ACCESS_DENIED, message: `Access denied to page ${pageId}` });
    }
    if (pageId === currentUser.homepageId) {
        throw new PageError({ errorCode: PAGE_CANNOT_DELETE_HOMEPAGE, message: "Cannot delete the homepage" });
    }

    await prisma.$transaction(async (tx) => {
        await deleteSubtree({ tx, pageId });
        if (row.parentId) {
            await tx.page.update({ where: { id: row.parentId }, data: { childrenCount: { decrement: 1 } } });
        }
    });
}
