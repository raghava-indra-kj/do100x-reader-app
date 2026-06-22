import { generateKeyBetween } from "fractional-indexing";
import { Prisma, appuser } from "@prisma-generated";
import { PAGE_HOMEPAGE_DEFAULT_TITLE } from "./page.constants";
import { insertPage } from "./insert-page.service";

export async function createUserHomepage({
    tx,
    userId,
}: {
    tx: Prisma.TransactionClient;
    userId: string;
}): Promise<appuser & { homepageId: string }> {
    const page = await insertPage({
        tx,
        userId,
        parentId: null,
        title: PAGE_HOMEPAGE_DEFAULT_TITLE,
        sortOrder: generateKeyBetween(null, null),
    });

    const updatedUser = await tx.appuser.update({
        where: { id: userId },
        data: { homepageId: page.id },
    });

    return updatedUser as appuser & { homepageId: string };
}
