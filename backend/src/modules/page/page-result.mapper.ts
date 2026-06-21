import { page } from "@prisma-generated";
import { Page, PageBody } from "./page.models";

export function toPage(row: page): Page {
    return {
        id: row.id,
        userId: row.userId,
        parentId: row.parentId,
        title: row.title,
        content: row.content as PageBody | null,
        isPublic: row.isPublic,
        category: row.category,
        sortOrder: row.sortOrder,
        childrenCount: row.childrenCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
    };
}
