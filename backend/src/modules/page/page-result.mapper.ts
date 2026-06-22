import { page } from "@prisma-generated";
import { Page, PageBody, PageListItem } from "./page.models";

export function toPage(row: page): Page {
    return {
        id: row.id,
        userId: row.userId,
        parentId: row.parentId,
        title: row.title,
        content: row.content as PageBody | null,
        category: row.category,
        sortOrder: row.sortOrder,
        childrenCount: row.childrenCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toPageListItem(row: Omit<page, "content">): PageListItem {
    return {
        id: row.id,
        userId: row.userId,
        parentId: row.parentId,
        title: row.title,
        category: row.category,
        sortOrder: row.sortOrder,
        childrenCount: row.childrenCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
