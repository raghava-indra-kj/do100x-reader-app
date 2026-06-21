import { Prisma, appuser } from "@prisma-generated";
import { generateUuid } from "@lib/uuid";
import { PAGE_HOMEPAGE_DEFAULT_TITLE } from "./page.constants";

export async function createUserHomepage({
    tx,
    userId,
}: {
    tx: Prisma.TransactionClient;
    userId: string;
}): Promise<appuser & { homepageId: string }> {
    const pageId = generateUuid();
    const now = new Date();

    await tx.page.create({
        data: {
            id: pageId,
            userId,
            parentId: null,
            title: PAGE_HOMEPAGE_DEFAULT_TITLE,
            isPublic: false,
            sortOrder: 1,
            childrenCount: 0,
            createdAt: now,
            updatedAt: now,
        },
    });

    const updatedUser = await tx.appuser.update({
        where: { id: userId },
        data: { homepageId: pageId },
    });

    return updatedUser as appuser & { homepageId: string };
}
