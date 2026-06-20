import { Prisma } from "@prisma/client";

// Returns the page id plus every descendant id at any depth (within a transaction).
export async function collectPageAndDescendants(
  tx: Prisma.TransactionClient,
  rootId: string
): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await tx.page.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    if (!children.length) break;
    const childIds = children.map((c) => c.id);
    ids.push(...childIds);
    frontier = childIds;
  }
  return ids;
}
