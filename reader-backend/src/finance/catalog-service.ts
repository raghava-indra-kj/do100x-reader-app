import { randomUUID } from 'node:crypto';
import { currencyScale } from '@reader/finance-core';
import { accountSchema, accountUpdateSchema, amount, bookSchema, bookUpdateSchema, categorySchema, categoryUpdateSchema, FinanceError, parse } from './contract';
import { activeCategory, audit, calendar, checkVersion, hash, ownedBook, retry, transact, wire, writeBook, type Actor, type FinanceDb } from './context';

export async function listBooks(db: FinanceDb, userId: string) {
  return wire(await db.finance_book.findMany({ where: { userId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }));
}
export async function createBook(db: FinanceDb, actor: Actor, input: unknown) {
  const value = parse(bookSchema, input);
  return transact(db, async tx => {
    // Serialize first-book/retry requests for the same authenticated identity.
    await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${actor.userId} FOR UPDATE`;
    const old = retry(await tx.finance_book.findUnique({ where: { userId_requestKey: { userId: actor.userId, requestKey: value.requestKey } } }), value);
    if (old) return wire(old);
    const book = await tx.finance_book.create({ data: { userId: actor.userId, name: value.name, currency: value.currency, currencyScale: currencyScale(value.currency), timezone: value.timezone, requestKey: value.requestKey, requestHash: hash(value) } });
    if (value.starterCategories) {
      await tx.finance_category.createMany({ data: [
        ...['Salary', 'Other income'].map(name => ({ name, kind: 'INCOME' as const })),
        ...['Food', 'Housing', 'Electricity', 'Phone & internet', 'Transport', 'Health', 'Shopping', 'Other expenses'].map(name => ({ name, kind: 'EXPENSE' as const })),
      ].map(item => ({ ...item, id: randomUUID(), bookId: book.id, requestKey: randomUUID(), requestHash: hash(item) })) });
    }
    await audit(tx, actor, book.id, 'book', book.id, 'CREATE', null, book);
    return wire(book);
  });
}
export async function updateBook(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(bookUpdateSchema, input);
  return writeBook(db, actor, bookId, async (tx, old) => {
    checkVersion(old, value.expectedVersion);
    const item = await tx.finance_book.update({ where: { id: bookId }, data: { name: value.name, timezone: value.timezone, archivedAt: value.archived === undefined ? undefined : value.archived ? new Date() : null, version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'book', bookId, 'UPDATE', old, item);
    return wire(item);
  }, true);
}
export async function getCatalog(db: FinanceDb, userId: string, bookId: string) {
  return transact(db, tx => readCatalog(tx, userId, bookId));
}
async function readCatalog(db: FinanceDb, userId: string, bookId: string) {
  const book = await ownedBook(db, userId, bookId);
  const [accounts, categories] = await Promise.all([
    db.finance_account.findMany({ where: { bookId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    db.finance_category.findMany({ where: { bookId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
  ]);
  return wire({ book, accounts, categories });
}
export async function createAccount(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(accountSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = retry(await tx.finance_account.findUnique({ where: { bookId_requestKey: { bookId, requestKey: value.requestKey } } }), value);
    if (old) return wire(old);
    const opening = amount(value.openingAmount, book.currencyScale);
    const item = await tx.finance_account.create({ data: { bookId, name: value.name, tracksDebt: value.tracksDebt, isLiquid: value.isLiquid ?? !value.tracksDebt, notes: value.notes, requestKey: value.requestKey, requestHash: hash(value) } });
    if (opening !== 0n) {
      const transaction = await tx.finance_transaction.create({ data: { bookId, kind: 'ADJUSTMENT', date: calendar(value.openingDate), description: `Opening balance: ${item.name}`, tags: [], source: actor.source, requestKey: randomUUID(), requestHash: hash({ accountId: item.id, opening: opening.toString() }) } });
      const movement = await tx.finance_movement.create({ data: { bookId, transactionId: transaction.id, accountId: item.id, amountMinor: opening, effectiveDate: calendar(value.openingDate), cleared: true } });
      await audit(tx, actor, bookId, 'transaction', transaction.id, 'OPENING_BALANCE', null, { ...transaction, movements: [movement] });
    }
    await audit(tx, actor, bookId, 'account', item.id, 'CREATE', null, item);
    return wire(item);
  });
}
export async function updateAccount(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(accountUpdateSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = await tx.finance_account.findFirst({ where: { id, bookId } });
    if (!old) throw new FinanceError(404, 'Account not found');
    checkVersion(old, value.expectedVersion);
    if (value.archived && await tx.finance_schedule.count({ where: { bookId, archivedAt: null, paused: false, OR: [{ accountId: id }, { destinationAccountId: id }] } })) throw new FinanceError(409, 'Pause or update this account’s plans before archiving it.');
    const item = await tx.finance_account.update({ where: { id }, data: { name: value.name, tracksDebt: value.tracksDebt, isLiquid: value.isLiquid, notes: value.notes, archivedAt: value.archived === undefined ? undefined : value.archived ? new Date() : null, version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'account', id, 'UPDATE', old, item);
    return wire(item);
  });
}
async function validateParent(db: FinanceDb, bookId: string, parentId: string | null | undefined, kind: string, selfId?: string) {
  const visited = new Set(selfId ? [selfId] : []);
  let id = parentId;
  while (id) {
    if (visited.has(id)) throw new FinanceError(422, 'A category can’t contain itself or one of its parent categories.');
    visited.add(id);
    const parent = await activeCategory(db, bookId, id);
    if (parent.kind !== kind) throw new FinanceError(422, 'Parent and child categories must both be income or both be expenses.');
    id = parent.parentId;
  }
}
export async function createCategory(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(categorySchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = retry(await tx.finance_category.findUnique({ where: { bookId_requestKey: { bookId, requestKey: value.requestKey } } }), value);
    if (old) return wire(old);
    await validateParent(tx, bookId, value.parentId, value.kind);
    const item = await tx.finance_category.create({ data: { bookId, name: value.name, kind: value.kind, parentId: value.parentId, requestKey: value.requestKey, requestHash: hash(value) } });
    await audit(tx, actor, bookId, 'category', item.id, 'CREATE', null, item);
    return wire(item);
  });
}
export async function updateCategory(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(categoryUpdateSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = await tx.finance_category.findFirst({ where: { bookId, id } });
    if (!old) throw new FinanceError(404, 'Category not found');
    checkVersion(old, value.expectedVersion);
    await validateParent(tx, bookId, value.parentId === undefined ? old.parentId : value.parentId, old.kind, id);
    if (value.archived && (await tx.finance_category.count({ where: { bookId, parentId: id, archivedAt: null } }) || await tx.finance_schedule.count({ where: { bookId, categoryId: id, archivedAt: null, paused: false } }))) throw new FinanceError(409, 'Move or archive the subcategories and pause linked plans before archiving this category.');
    const item = await tx.finance_category.update({ where: { id }, data: { name: value.name, parentId: value.parentId, archivedAt: value.archived === undefined ? undefined : value.archived ? new Date() : null, version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'category', id, 'UPDATE', old, item);
    return wire(item);
  });
}
