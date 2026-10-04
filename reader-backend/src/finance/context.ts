import { createHash } from 'node:crypto';
import { Prisma, PrismaClient, type finance_book } from '@prisma/client';
import { parseDate } from '@reader/finance-core';
import { FinanceError, parse, uuid } from './contract';

export type FinanceDb = PrismaClient | Prisma.TransactionClient;
export type FinanceTx = Prisma.TransactionClient;
export interface Actor { userId: string; source: 'HTTP' | 'MCP' | 'IMPORT' | 'SYSTEM' }

/** Wire money is always an exact minor-unit string; calendar dates stay UTC. */
export type Wire<T> = T extends bigint | Date ? string : T extends Array<infer U> ? Wire<U>[] : T extends object ? { [K in keyof T]: Wire<T[K]> } : T;
export function wire<T>(value: T): Wire<T> {
  if (typeof value === 'bigint') return value.toString() as Wire<T>;
  if (value instanceof Date) return value.toISOString() as Wire<T>;
  if (Array.isArray(value)) return value.map(wire) as Wire<T>;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wire(item)])) as Wire<T>;
  return value as Wire<T>;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return wire(value);
}
export function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
export function calendar(value: string): Date { return parseDate(value); }
export function day(value: Date): string { return value.toISOString().slice(0, 10); }
export function checkVersion(record: { version: number } | null, expectedVersion: number) {
  if ((record?.version ?? 0) !== expectedVersion) throw new FinanceError(409, 'This item has changed. Refresh before saving.', { currentVersion: record?.version ?? 0 });
}
export function retry<T extends { requestHash: string }>(record: T | null, input: unknown): T | null {
  if (record && record.requestHash !== hash(input)) throw new FinanceError(409, 'This request conflicts with an earlier change. Refresh before trying again.');
  return record;
}
export async function transact<T>(db: FinanceDb, run: (tx: FinanceTx) => Promise<T>): Promise<T> {
  try {
    return '$transaction' in db ? await db.$transaction(run, { maxWait: 10000, timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }) : await run(db);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new FinanceError(409, 'Another change conflicts with this one. Refresh and retry the same request.');
    throw error;
  }
}
export async function ownedBook(db: FinanceDb, userId: string, bookId: string) {
  parse(uuid, bookId);
  const book = await db.finance_book.findFirst({ where: { id: bookId, userId } });
  if (!book) throw new FinanceError(404, 'Book not found');
  return book;
}

/** Serialize same-book mutations, including imports, refunds and reconciliation. */
export async function writeBook<T>(db: FinanceDb, actor: Actor, bookId: string, run: (tx: FinanceTx, book: finance_book) => Promise<T>, allowArchived = false): Promise<T> {
  parse(uuid, bookId);
  return transact(db, async tx => {
    await tx.$queryRaw`SELECT id FROM finance_book WHERE id = ${bookId} AND userId = ${actor.userId} FOR UPDATE`;
    const book = await ownedBook(tx, actor.userId, bookId);
    if (book.archivedAt && !allowArchived) throw new FinanceError(409, 'Restore this book before making changes.');
    return run(tx, book);
  });
}
export async function audit(tx: FinanceTx, actor: Actor, bookId: string, entityType: string, entityId: string, action: string, before: unknown, after: unknown) {
  await tx.finance_change.create({ data: {
    bookId, actorId: actor.userId, source: actor.source, entityType, entityId, action,
    before: before == null ? Prisma.DbNull : wire(before) as Prisma.InputJsonValue, after: after == null ? Prisma.DbNull : wire(after) as Prisma.InputJsonValue,
  } });
}
export async function activeAccount(db: FinanceDb, bookId: string, id: string) {
  const item = await db.finance_account.findFirst({ where: { bookId, id, archivedAt: null } });
  if (!item) throw new FinanceError(404, 'Account unavailable in this book.');
  return item;
}
export async function activeCategory(db: FinanceDb, bookId: string, id: string) {
  const item = await db.finance_category.findFirst({ where: { bookId, id, archivedAt: null } });
  if (!item) throw new FinanceError(404, 'Category unavailable in this book.');
  return item;
}
