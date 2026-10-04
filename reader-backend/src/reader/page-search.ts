import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const pageSearchQuery = z.object({
  q: z.string().trim().max(200).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type SearchRow = { id: string; title: string; category: string | null; parentId: string | null; updatedAt: Date };
type Parent = Pick<SearchRow, 'id' | 'title' | 'parentId'>;

/** Ranking and limiting happen in MySQL, not against a downloaded page library. */
export async function searchPages(db: PrismaClient, userId: string, query: z.infer<typeof pageSearchQuery>) {
  const { q, limit } = query;
  // LOCATE treats %, _ and backslashes literally. All values remain parameters.
  const filter = q ? Prisma.sql`AND (LOCATE(LOWER(${q}), LOWER(title)) > 0 OR LOCATE(LOWER(${q}), LOWER(COALESCE(category, ''))) > 0)` : Prisma.empty;
  const rank = q ? Prisma.sql`CASE
    WHEN LOWER(title) = LOWER(${q}) THEN 0
    WHEN LOCATE(LOWER(${q}), LOWER(title)) = 1 THEN 1
    WHEN LOCATE(LOWER(${q}), LOWER(title)) > 0 THEN 2
    ELSE 3 END,` : Prisma.empty;
  const rows = await db.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT id, title, category, parentId, updatedAt FROM page
    WHERE userId = ${userId} AND deletedAt IS NULL ${filter}
    ORDER BY ${rank} updatedAt DESC, id ASC LIMIT ${limit + 1}
  `);
  const selected = rows.slice(0, limit);
  const parents = new Map<string, Parent>();
  const fetched = new Set<string>();
  let pending = selected.flatMap(row => row.parentId ? [row.parentId] : []);
  // Bounded breadth-first batches protect malformed cycles and very deep trees.
  for (let depth = 0; depth < 32 && pending.length; depth++) {
    const ids = [...new Set(pending)].filter(id => !fetched.has(id));
    if (!ids.length) break;
    ids.forEach(id => fetched.add(id));
    const batch = await db.page.findMany({
      where: { id: { in: ids }, userId, deletedAt: null },
      select: { id: true, title: true, parentId: true },
    });
    batch.forEach(parent => parents.set(parent.id, parent));
    pending = batch.flatMap(parent => parent.parentId ? [parent.parentId] : []);
  }
  return {
    items: selected.map(row => {
      const ancestors: { id: string; title: string }[] = [];
      const visited = new Set([row.id]);
      let next = row.parentId;
      while (next && !visited.has(next)) {
        visited.add(next);
        const parent = parents.get(next);
        if (!parent) break;
        ancestors.push({ id: parent.id, title: parent.title });
        next = parent.parentId;
      }
      return { id: row.id, title: row.title, category: row.category, updatedAt: row.updatedAt,
        ancestors: ancestors.reverse(), pathIncomplete: Boolean(next) };
    }),
    hasMore: rows.length > limit,
  };
}
