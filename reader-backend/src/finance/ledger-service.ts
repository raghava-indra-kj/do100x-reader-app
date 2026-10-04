import { Prisma, type finance_book } from '@prisma/client';
import { formatMoney, sumMoney } from '@reader/finance-core';
import { archiveSchema, bulkCategorySchema, FinanceError, parse, querySchema, transactionSchema, transactionUpdateSchema, type TransactionValue } from './contract';
import { audit, calendar, checkVersion, hash, ownedBook, retry, transact, wire, writeBook, type Actor, type FinanceDb, type FinanceTx } from './context';
import { validateLedger } from './ledger-validation';

export const transactionInclude = { movements: { orderBy: { id: 'asc' as const }, include: { payments: true, sourceRecords: true } }, splits: { orderBy: { id: 'asc' as const } } };

export async function loadTransaction(db: FinanceDb, bookId: string, id: string) {
  const item = await db.finance_transaction.findFirst({ where: { bookId, id }, include: transactionInclude });
  if (!item) throw new FinanceError(404, 'Transaction not found');
  return item;
}
async function validated(db: FinanceDb, book: finance_book, value: TransactionValue) {
  const [accounts, categories] = await Promise.all([
    db.finance_account.findMany({ where: { bookId: book.id, id: { in: value.movements.map(item => item.accountId) } } }),
    db.finance_category.findMany({ where: { bookId: book.id, id: { in: value.splits.map(item => item.categoryId) } } }),
  ]);
  return validateLedger(value, book.currencyScale, accounts, categories);
}
async function validateRefunds(db: FinanceDb, bookId: string, value: TransactionValue, netMinor: bigint, selfId?: string) {
  if (value.refundOfId) {
    const original = await loadTransaction(db, bookId, value.refundOfId);
    if (original.deletedAt || original.kind !== 'EXPENSE' || original.status !== 'POSTED') throw new FinanceError(422, 'Link the refund to an active, posted expense.');
    const refunds = await db.finance_transaction.findMany({ where: { bookId, refundOfId: original.id, deletedAt: null, ...(selfId ? { id: { not: selfId } } : {}) }, include: { movements: true } });
    const alreadyRefunded = sumMoney(refunds.flatMap(item => item.movements.map(movement => movement.amountMinor)));
    const originalAmount = -sumMoney(original.movements.map(item => item.amountMinor));
    if (alreadyRefunded + netMinor > originalAmount) throw new FinanceError(422, 'Linked refunds total more than the original expense.');
  }
  if (selfId) {
    const refunds = await db.finance_transaction.findMany({ where: { bookId, refundOfId: selfId, deletedAt: null }, include: { movements: true } });
    if (refunds.length && (value.kind !== 'EXPENSE' || value.status !== 'POSTED' || -netMinor < sumMoney(refunds.flatMap(item => item.movements.map(m => m.amountMinor))))) throw new FinanceError(409, 'This change conflicts with linked refunds. Review them first.');
  }
}
function metadata(value: TransactionValue) {
  return { kind: value.kind, status: value.status, date: calendar(value.date), description: value.description, merchant: value.merchant ?? null, paymentMethod: value.paymentMethod ?? null, bankReference: value.bankReference ?? null, notesMarkdown: value.notesMarkdown ?? null, tags: value.tags, refundOfId: value.refundOfId ?? null };
}

export async function protectReconciledPeriod(db: FinanceDb, bookId: string, accountId: string, date: Date) {
  if (await db.finance_reconciliation.findFirst({ where: { bookId, accountId, reopenedAt: null, date: { gte: date } }, select: { id: true } })) throw new FinanceError(409, 'Reopen the reconciled period before adding or changing an entry within it.');
}

/** Internal transactional operation reused by manual requests and import commit. */
export async function createLedgerTransaction(tx: FinanceTx, actor: Actor, book: finance_book, input: unknown) {
  const value = parse(transactionSchema, input);
  const old = retry(await tx.finance_transaction.findUnique({ where: { bookId_requestKey: { bookId: book.id, requestKey: value.requestKey } }, include: transactionInclude }), value);
  if (old) return old;
  const checked = await validated(tx, book, value);
  await validateRefunds(tx, book.id, value, checked.netMinor);
  for (const movement of checked.movements) await protectReconciledPeriod(tx, book.id, movement.accountId, calendar(movement.effectiveDate));
  const item = await tx.finance_transaction.create({ data: { bookId: book.id, ...metadata(value), requestKey: value.requestKey, requestHash: hash(value), source: actor.source } });
  await tx.finance_movement.createMany({ data: checked.movements.map(m => ({ bookId: book.id, transactionId: item.id, accountId: m.accountId, amountMinor: m.amountMinor, effectiveDate: calendar(m.effectiveDate), cleared: m.cleared })) });
  if (checked.splits.length) await tx.finance_split.createMany({ data: checked.splits.map(s => ({ bookId: book.id, transactionId: item.id, categoryId: s.categoryId, amountMinor: s.amountMinor })) });
  const result = await loadTransaction(tx, book.id, item.id);
  await audit(tx, actor, book.id, 'transaction', item.id, 'CREATE', null, result);
  return result;
}
export async function createTransaction(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  // Validate before opening a database transaction as well as at the internal boundary.
  const value = parse(transactionSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => wire(await createLedgerTransaction(tx, actor, book, value)));
}
export async function getTransaction(db: FinanceDb, userId: string, bookId: string, id: string) {
  await ownedBook(db, userId, bookId);
  return wire(await loadTransaction(db, bookId, id));
}
export async function listTransactions(db: FinanceDb, userId: string, bookId: string, input: unknown = {}) {
  await ownedBook(db, userId, bookId);
  const q = parse(querySchema, input);
  if (q.from && q.to && q.from > q.to) throw new FinanceError(422, 'The end date must not be before the start date.');
  const where: Prisma.finance_transactionWhereInput = {
    bookId, deletedAt: q.deleted ? { not: null } : null,
    date: { ...(q.from ? { gte: calendar(q.from) } : {}), ...(q.to ? { lte: calendar(q.to) } : {}) },
    kind: q.kind, status: q.status, paymentMethod: q.paymentMethod,
    ...(q.accountId ? { movements: { some: { accountId: q.accountId } } } : {}),
    ...(q.categoryId ? { splits: { some: { categoryId: q.categoryId } } } : {}),
    ...(q.search ? { OR: [{ description: { contains: q.search } }, { merchant: { contains: q.search } }, { bankReference: { contains: q.search } }] } : {}),
  };
  if (q.cursor) {
    const cursor = await db.finance_transaction.findFirst({ where: { ...where, id: q.cursor }, select: { id: true, date: true } });
    if (!cursor) throw new FinanceError(422, 'The transaction list has changed. Refresh it.');
    where.AND = [{ OR: [{ date: { lt: cursor.date } }, { date: cursor.date, id: { lt: cursor.id } }] }];
  }
  const rows = await db.finance_transaction.findMany({ where, include: transactionInclude, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: q.take + 1 });
  return wire({ items: rows.slice(0, q.take), nextCursor: rows.length > q.take ? rows[q.take - 1].id : null });
}
export async function updateTransaction(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(transactionUpdateSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = await loadTransaction(tx, bookId, id);
    checkVersion(old, value.expectedVersion);
    if (old.deletedAt) throw new FinanceError(409, 'Restore this transaction before editing it.');
    const checked = await validated(tx, book, value);
    await validateRefunds(tx, bookId, value, checked.netMinor, id);
    const byAccount = new Map(checked.movements.map(m => [m.accountId, m]));
    // Keep IDs stable. Matches and provenance must never migrate to a new payment.
    for (const existing of old.movements) {
      const next = byAccount.get(existing.accountId);
      const sourceChanged = !next || next.amountMinor !== existing.amountMinor || calendar(next.effectiveDate).getTime() !== existing.effectiveDate.getTime() || value.status !== old.status;
      const changed = sourceChanged || next?.cleared !== existing.cleared;
      if (changed && existing.reconciliationId) throw new FinanceError(409, 'Reopen the reconciliation before changing this entry.');
      // Clearing is reviewed ledger metadata, not a rewrite of bank source money.
      // A manual uncleared movement matched by an import must remain clearable.
      if (sourceChanged && existing.sourceRecords.length) throw new FinanceError(409, 'Imported entry amounts, dates and accounts can’t be edited. Add a separate correction.');
      if (existing.payments.length && (!next || next.amountMinor !== existing.amountMinor || calendar(next.effectiveDate).getTime() !== existing.effectiveDate.getTime() || value.status !== 'POSTED' || value.kind !== old.kind)) throw new FinanceError(409, 'Remove payment links before changing this entry.');
      if (changed) {
        await protectReconciledPeriod(tx, bookId, existing.accountId, existing.effectiveDate);
        if (next) await protectReconciledPeriod(tx, bookId, next.accountId, calendar(next.effectiveDate));
      }
      if (!next) await tx.finance_movement.delete({ where: { id: existing.id } });
      else await tx.finance_movement.update({ where: { id: existing.id }, data: { amountMinor: next.amountMinor, effectiveDate: calendar(next.effectiveDate), cleared: next.cleared } });
    }
    for (const next of checked.movements.filter(m => !old.movements.some(old => old.accountId === m.accountId))) {
      await protectReconciledPeriod(tx, bookId, next.accountId, calendar(next.effectiveDate));
      await tx.finance_movement.create({ data: { bookId, transactionId: id, accountId: next.accountId, amountMinor: next.amountMinor, effectiveDate: calendar(next.effectiveDate), cleared: next.cleared } });
    }
    await tx.finance_split.deleteMany({ where: { bookId, transactionId: id } });
    if (checked.splits.length) await tx.finance_split.createMany({ data: checked.splits.map(s => ({ bookId, transactionId: id, categoryId: s.categoryId, amountMinor: s.amountMinor })) });
    await tx.finance_transaction.update({ where: { id }, data: { ...metadata(value), version: { increment: 1 } } });
    const result = await loadTransaction(tx, bookId, id);
    await audit(tx, actor, bookId, 'transaction', id, 'UPDATE', old, result);
    return wire(result);
  });
}
export async function deleteTransaction(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(archiveSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = await loadTransaction(tx, bookId, id);
    checkVersion(old, value.expectedVersion);
    if (old.movements.some(m => m.reconciliationId || m.payments.length)) throw new FinanceError(409, 'Reopen the reconciliation and remove payment links before deleting or restoring this transaction.');
    for (const movement of old.movements) await protectReconciledPeriod(tx, bookId, movement.accountId, movement.effectiveDate);
    if (value.deleted && await tx.finance_transaction.count({ where: { bookId, refundOfId: id, deletedAt: null } })) throw new FinanceError(409, 'Delete or unlink refunds before deleting the original expense.');
    if (!value.deleted) {
      const valueForRefund: TransactionValue = { ...old, date: old.date.toISOString().slice(0, 10), tags: old.tags as string[], movements: [], splits: [] };
      await validateRefunds(tx, book.id, valueForRefund, sumMoney(old.movements.map(m => m.amountMinor)), id);
    }
    const item = await tx.finance_transaction.update({ where: { id }, data: { deletedAt: value.deleted ? new Date() : null, version: { increment: 1 } }, include: transactionInclude });
    await audit(tx, actor, bookId, 'transaction', id, value.deleted ? 'DELETE' : 'RESTORE', old, item);
    return wire(item);
  });
}
export async function accountBalances(db: FinanceDb, userId: string, bookId: string, asOf?: string) {
  return transact(db, tx => readBalances(tx, userId, bookId, asOf));
}
async function readBalances(db: FinanceDb, userId: string, bookId: string, asOf?: string) {
  await ownedBook(db, userId, bookId);
  const accounts = await db.finance_account.findMany({ where: { bookId }, orderBy: { name: 'asc' } });
  const movements = await db.finance_movement.findMany({ where: { bookId, ...(asOf ? { effectiveDate: { lte: calendar(asOf) } } : {}), transaction: { deletedAt: null } }, include: { transaction: { select: { status: true } } } });
  return wire(accounts.map(account => {
    const rows = movements.filter(m => m.accountId === account.id);
    const postedMinor = sumMoney(rows.filter(m => m.transaction.status === 'POSTED').map(m => m.amountMinor));
    const pendingMinor = sumMoney(rows.filter(m => m.transaction.status === 'PENDING').map(m => m.amountMinor));
    const clearedMinor = sumMoney(rows.filter(m => m.transaction.status === 'POSTED' && m.cleared).map(m => m.amountMinor));
    return { ...account, postedMinor, pendingMinor, projectedMinor: postedMinor + pendingMinor, clearedMinor };
  }));
}
export async function listChanges(db: FinanceDb, userId: string, bookId: string, cursor?: string) {
  await ownedBook(db, userId, bookId);
  const boundary = cursor ? await db.finance_change.findFirst({ where: { id: cursor, bookId } }) : null;
  if (cursor && !boundary) throw new FinanceError(422, 'Couldn’t load more history. Refresh and try again.');
  const rows = await db.finance_change.findMany({ where: { bookId, ...(boundary ? { OR: [{ createdAt: { lt: boundary.createdAt } }, { createdAt: boundary.createdAt, id: { lt: boundary.id } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101 });
  return wire({ items: rows.slice(0, 100), nextCursor: rows.length > 100 ? rows[99].id : null });
}

export async function bulkCategorize(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(bulkCategorySchema, input);
  if (new Set(value.items.map(item => item.id)).size !== value.items.length) throw new FinanceError(422, 'The same transaction was included more than once.');
  return writeBook(db, actor, bookId, async (tx, book) => {
    const results = [];
    for (const target of value.items) {
      const item = await loadTransaction(tx, bookId, target.id);
      const net = sumMoney(item.movements.map(m => m.amountMinor));
      if (!['INCOME', 'EXPENSE', 'REFUND'].includes(item.kind)) throw new FinanceError(422, 'Only income, expenses and refunds can have categories.');
      results.push(await updateTransaction(tx, actor, bookId, target.id, {
        expectedVersion: target.expectedVersion, kind: item.kind, status: item.status, date: item.date.toISOString().slice(0, 10), description: item.description,
        merchant: item.merchant, paymentMethod: item.paymentMethod, bankReference: item.bankReference, notesMarkdown: item.notesMarkdown, tags: item.tags, refundOfId: item.refundOfId,
        movements: item.movements.map(m => ({ accountId: m.accountId, amount: formatMoney(m.amountMinor, book.currencyScale), effectiveDate: m.effectiveDate.toISOString().slice(0, 10), cleared: m.cleared })),
        splits: [{ categoryId: value.categoryId, amount: formatMoney(item.kind === 'INCOME' ? net : -net, book.currencyScale) }],
      }));
    }
    return results;
  });
}
