import type { Prisma, PrismaClient } from "@prisma/client";

export async function canReadPage(db: PrismaClient | Prisma.TransactionClient, pageId: string, userId: string): Promise<boolean> {
  const visited = new Set<string>();
  let id: string | null = pageId;
  while (id && !visited.has(id)) {
    visited.add(id);
    const page: { userId: string; isPublic: boolean; parentId: string | null } | null = await db.page.findFirst({ where: { id, deletedAt: null }, select: { userId: true, isPublic: true, parentId: true } });
    if (!page) return false;
    if (page.userId === userId || page.isPublic) return true;
    id = page.parentId;
  }
  return false;
}
