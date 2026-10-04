import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient, Prisma } from '@prisma/client';
import { pageSearchQuery, searchPages } from './page-search';

const row = (id: string, parentId: string | null = null) => ({ id, parentId, title: id, category: null, updatedAt: new Date('2026-10-04T00:00:00Z') });
function database(rows: ReturnType<typeof row>[], parents: { id: string; title: string; parentId: string | null }[] = []) {
  const raw = vi.fn().mockResolvedValue(rows);
  const findMany = vi.fn().mockImplementation(async ({ where }) => parents.filter(p => where.id.in.includes(p.id)));
  return { db: { $queryRaw: raw, page: { findMany } } as unknown as PrismaClient, raw, findMany };
}
describe('owner-only page search', () => {
  it('validates query types and limits', () => {
    expect(pageSearchQuery.parse({})).toEqual({ q: '', limit: 20 });
    expect(pageSearchQuery.parse({ q: '  Python  ', limit: '5' })).toEqual({ q: 'Python', limit: 5 });
    for (const value of [{ q: ['a'] }, { q: 'x'.repeat(201) }, { limit: 0 }, { limit: 51 }, { limit: 'invalid' }]) expect(pageSearchQuery.safeParse(value).success).toBe(false);
  });
  it('keeps search text and identity as parameters and limits before returning results', async () => {
    const { db, raw } = database([row('first'), row('second')]);
    const query = `%_\\' OR 1=1 --`;
    const result = await searchPages(db, 'owner', { q: query, limit: 1 });
    const sql = raw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain('userId = ? AND deletedAt IS NULL');
    expect(sql.sql).toContain('CASE');
    expect(sql.sql).toContain('LIMIT ?');
    expect(sql.sql).not.toContain(query);
    expect(sql.values).toContain('owner');
    expect(sql.values).toContain(query);
    expect(result.items.map(p => p.id)).toEqual(['first']);
    expect(result.hasMore).toBe(true);
  });
  it('uses recent-update ordering for an empty query', async () => {
    const { db, raw } = database([]);
    expect(await searchPages(db, 'owner', { q: '', limit: 20 })).toEqual({ items: [], hasMore: false });
    expect((raw.mock.calls[0][0] as Prisma.Sql).sql).not.toContain('CASE');
    expect((raw.mock.calls[0][0] as Prisma.Sql).sql).toContain('updatedAt DESC, id ASC');
  });
  it('batches shared ancestors with owner and deletion filters', async () => {
    const { db, findMany } = database([row('a', 'parent'), row('b', 'parent')], [{ id: 'parent', title: 'Parent', parentId: 'root' }, { id: 'root', title: 'Home', parentId: null }]);
    const result = await searchPages(db, 'owner', { q: '', limit: 20 });
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[0][0].where).toEqual({ id: { in: ['parent'] }, userId: 'owner', deletedAt: null });
    expect(result.items[0].ancestors.map(p => p.title)).toEqual(['Home', 'Parent']);
    expect(result.items[0].pathIncomplete).toBe(false);
  });
  it('stops cycles and missing ancestors without returning unowned parent details', async () => {
    const { db } = database([row('a', 'b'), row('missing', 'not-owned')], [{ id: 'b', title: 'Parent', parentId: 'a' }, { id: 'a', title: 'a', parentId: 'b' }]);
    const result = await searchPages(db, 'owner', { q: '', limit: 20 });
    expect(result.items[0].ancestors).toEqual([{ id: 'b', title: 'Parent' }]);
    expect(result.items.every(item => item.pathIncomplete)).toBe(true);
    expect(result.items[1].ancestors).toEqual([]);
  });
  it('caps ancestor traversal depth', async () => {
    const { db, findMany } = database([row('result', 'p0')], Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, title: `p${i}`, parentId: `p${i + 1}` })));
    const result = await searchPages(db, 'owner', { q: '', limit: 20 });
    expect(findMany).toHaveBeenCalledTimes(32);
    expect(result.items[0].ancestors).toHaveLength(32);
    expect(result.items[0].pathIncomplete).toBe(true);
  });
});
