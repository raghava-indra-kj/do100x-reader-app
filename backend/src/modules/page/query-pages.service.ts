import { prisma } from "@core/db/prisma";
import { QueryPagesInput, QueryPagesInputSchema } from "@modules/page/query-pages.models";
import { PageListResult } from "@modules/page/page.models";
import { toPageListItem } from "@modules/page/page-result.mapper";

export async function queryPages(input: QueryPagesInput): Promise<PageListResult> {
    const { currentUser, parentId, searchQuery } = QueryPagesInputSchema.parse(input);

    const rows = await prisma.page.findMany({
        where: {
            userId: currentUser.id,
            deletedAt: null,
            ...(parentId !== undefined ? { parentId } : {}),
            ...(searchQuery ? { title: { contains: searchQuery } } : {}),
        },
        select: {
            id: true,
            userId: true,
            parentId: true,
            title: true,
            category: true,
            sortOrder: true,
            childrenCount: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return { pages: rows.map(toPageListItem) };
}
