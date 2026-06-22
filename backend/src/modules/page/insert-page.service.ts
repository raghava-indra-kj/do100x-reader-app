import { Prisma, page } from "@prisma-generated";
import { generateUuid } from "@lib/uuid";

export async function insertPage({
    tx,
    userId,
    parentId,
    title,
    content,
    sortOrder,
}: {
    tx: Prisma.TransactionClient;
    userId: string;
    parentId: string | null;
    title: string;
    content?: unknown;
    sortOrder: string;
}): Promise<page> {
    const id = generateUuid();
    const now = new Date();

    return tx.page.create({
        data: {
            id,
            userId,
            parentId,
            title,
            content: content ?? Prisma.DbNull,
            sortOrder,
            childrenCount: 0,
            createdAt: now,
            updatedAt: now,
        },
    });
}
