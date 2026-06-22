import { prisma } from "@core/db/prisma";
import { PageError } from "@modules/page/errors/page-error";
import {
    PAGE_ACCESS_DENIED,
    PAGE_INVALID_MOVE_POSITION,
    PAGE_NEIGHBOR_NOT_FOUND,
    PAGE_NEIGHBOR_NOT_SIBLING,
    PAGE_NOT_FOUND,
} from "@modules/page/errors/page-error.constants";
import { MovePageInput, MovePageInputSchema } from "@modules/page/move-page.models";
import { toPage } from "@modules/page/page-result.mapper";
import { Page } from "@modules/page/page.models";
import { generateKeyBetween } from "fractional-indexing";

export async function movePage(input: MovePageInput): Promise<Page> {
    const { currentUser, pageId, afterId, beforeId } = MovePageInputSchema.parse(input);

    const row = await prisma.page.findUnique({ where: { id: pageId } });
    if (!row) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }
    if (row.userId !== currentUser.id) {
        throw new PageError({ errorCode: PAGE_ACCESS_DENIED, message: `Access denied to page ${pageId}` });
    }

    let afterSortOrder: string | null = null;
    if (afterId) {
        const afterPage = await prisma.page.findUnique({ where: { id: afterId } });
        if (!afterPage || afterPage.userId !== currentUser.id) {
            throw new PageError({ errorCode: PAGE_NEIGHBOR_NOT_FOUND, message: `Neighbor page ${afterId} not found` });
        }
        if (afterPage.parentId !== row.parentId) {
            throw new PageError({ errorCode: PAGE_NEIGHBOR_NOT_SIBLING, message: `Page ${afterId} is not a sibling` });
        }
        afterSortOrder = afterPage.sortOrder;
    }

    let beforeSortOrder: string | null = null;
    if (beforeId) {
        const beforePage = await prisma.page.findUnique({ where: { id: beforeId } });
        if (!beforePage || beforePage.userId !== currentUser.id) {
            throw new PageError({ errorCode: PAGE_NEIGHBOR_NOT_FOUND, message: `Neighbor page ${beforeId} not found` });
        }
        if (beforePage.parentId !== row.parentId) {
            throw new PageError({ errorCode: PAGE_NEIGHBOR_NOT_SIBLING, message: `Page ${beforeId} is not a sibling` });
        }
        beforeSortOrder = beforePage.sortOrder;
    }

    let newSortOrder: string;
    try {
        newSortOrder = generateKeyBetween(afterSortOrder, beforeSortOrder);
    } catch {
        throw new PageError({ errorCode: PAGE_INVALID_MOVE_POSITION, message: "Invalid move position: afterId must come before beforeId" });
    }

    const updatedRow = await prisma.page.update({
        where: { id: pageId },
        data: { sortOrder: newSortOrder, updatedAt: new Date() },
    });

    return toPage(updatedRow);
}
