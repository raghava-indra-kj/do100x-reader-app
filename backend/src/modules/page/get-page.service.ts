import { prisma } from "@core/db/prisma";
import { CurrentUser } from "@core/models/current-user";
import { PageError } from "./errors/page-error";
import { PAGE_NOT_FOUND, PAGE_ACCESS_DENIED } from "./errors/page-error.constants";
import { Page } from "./page.models";
import { toPage } from "./page-result.mapper";

export async function getPage({ pageId, currentUser }: { pageId: string; currentUser: CurrentUser }): Promise<Page> {
    const row = await prisma.page.findUnique({ where: { id: pageId } });
    if (!row) {
        throw new PageError({ errorCode: PAGE_NOT_FOUND, message: `Page ${pageId} not found` });
    }

    if (currentUser.id === row.userId) {
        return toPage(row);
    }

    throw new PageError({ errorCode: PAGE_ACCESS_DENIED, message: `Access denied to page ${pageId}` });
}

