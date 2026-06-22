import { generateKeyBetween } from "fractional-indexing";
import { Prisma } from "@prisma-generated";
import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import {
    PAGE_NOT_FOUND,
    PAGE_PARENT_NOT_FOUND,
    PAGE_CANNOT_REPARENT_HOMEPAGE,
    PAGE_REPARENT_WOULD_CREATE_CYCLE,
} from "@modules/page/errors/page-error.constants";
import { Page } from "@modules/page/page.models";
import { toPage } from "@modules/page/page-result.mapper";
import { ReparentPageInput, ReparentPageInputSchema } from "@modules/page/reparent-page.models";

async function wouldCreateCycle({
    tx,
    pageId,
    newParentId,
}: {
    tx: Prisma.TransactionClient;
    pageId: string;
    newParentId: string;
}): Promise<boolean> {
    let currentId: string | null = newParentId;
    while (currentId !== null) {
        if (currentId === pageId) return true;
        const node = await tx.page.findUnique({ where: { id: currentId }, select: { parentId: true } });
        currentId = node?.parentId ?? null;
    }
    return false;
}

export async function reparentPage(input: ReparentPageInput): Promise<Page> {
    const { currentUser, pageId, newParentId } = ReparentPageInputSchema.parse(input);

    if (pageId === newParentId) {
        throw new PageError({ errorCode: PAGE_REPARENT_WOULD_CREATE_CYCLE, message: "Cannot reparent a page to itself" });
    }

    const row = await prisma.page.findUnique({ where: { id: pageId } });
    if (!row || row.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }

    if (pageId === currentUser.homepageId) {
        throw new PageError({ errorCode: PAGE_CANNOT_REPARENT_HOMEPAGE, message: "Cannot reparent the homepage" });
    }

    const newParent = await prisma.page.findUnique({ where: { id: newParentId } });
    if (!newParent || newParent.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_PARENT_NOT_FOUND, message: `Parent page ${newParentId} not found` });
    }

    const updatedRow = await prisma.$transaction(async (tx) => {
        const cycle = await wouldCreateCycle({ tx, pageId, newParentId });
        if (cycle) {
            throw new PageError({ errorCode: PAGE_REPARENT_WOULD_CREATE_CYCLE, message: "Cannot reparent to a descendant" });
        }

        const lastSibling = await tx.page.findFirst({
            where: { userId: currentUser.id, parentId: newParentId },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
        });
        const sortOrder = generateKeyBetween(lastSibling?.sortOrder ?? null, null);

        const updated = await tx.page.update({
            where: { id: pageId },
            data: { parentId: newParentId, sortOrder, updatedAt: new Date() },
        });

        if (row.parentId) {
            await tx.page.update({ where: { id: row.parentId }, data: { childrenCount: { decrement: 1 } } });
        }
        await tx.page.update({ where: { id: newParentId }, data: { childrenCount: { increment: 1 } } });

        return updated;
    });

    return toPage(updatedRow);
}
