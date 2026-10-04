import { sumMoney } from '@reader/finance-core';
import { amount, FinanceError, parse, reconcileSchema, reopenSchema } from './contract';
import { activeAccount, audit, calendar, checkVersion, ownedBook, wire, writeBook, type Actor, type FinanceDb } from './context';

export async function listReconciliations(db: FinanceDb, userId: string, bookId: string) {
  await ownedBook(db, userId, bookId);
  return wire(await db.finance_reconciliation.findMany({ where: { bookId }, orderBy: [{ date: 'desc' }, { id: 'desc' }] }));
}
export async function reconcileAccount(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(reconcileSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    await activeAccount(tx, bookId, value.accountId);
    const date = calendar(value.date);
    const latest = await tx.finance_reconciliation.findFirst({ where: { bookId, accountId: value.accountId, reopenedAt: null }, orderBy: { date: 'desc' } });
    if (latest && date <= latest.date) throw new FinanceError(409, 'Choose a statement end date after the latest reconciliation.');
    const movements = await tx.finance_movement.findMany({ where: { bookId, accountId: value.accountId, effectiveDate: { lte: date }, cleared: true, transaction: { deletedAt: null, status: 'POSTED' } } });
    const ledgerMinor = sumMoney(movements.map(m => m.amountMinor));
    const statementMinor = amount(value.statementBalance, book.currencyScale);
    if (ledgerMinor !== statementMinor) throw new FinanceError(422, 'The statement balance doesn’t match cleared entries. Check for missing, uncleared or duplicate entries. No balancing transaction will be added.', { ledgerMinor: ledgerMinor.toString(), statementMinor: statementMinor.toString(), differenceMinor: (statementMinor - ledgerMinor).toString() });
    const item = await tx.finance_reconciliation.create({ data: { bookId, accountId: value.accountId, date, statementMinor, ledgerMinor, notes: value.notes } });
    await tx.finance_movement.updateMany({ where: { id: { in: movements.filter(m => !m.reconciliationId).map(m => m.id) } }, data: { reconciliationId: item.id } });
    await audit(tx, actor, bookId, 'reconciliation', item.id, 'CREATE', null, item);
    return wire(item);
  });
}
export async function reopenReconciliation(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(reopenSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = await tx.finance_reconciliation.findFirst({ where: { bookId, id } });
    if (!old) throw new FinanceError(404, 'Reconciliation not found');
    checkVersion(old, value.expectedVersion);
    if (old.reopenedAt) throw new FinanceError(409, 'This reconciliation is already open.');
    // Later balances depend on this statement too. Explicitly reopen the entire
    // dependent chain and retain every old statement and reason in the audit.
    const chain = await tx.finance_reconciliation.findMany({ where: { bookId, accountId: old.accountId, reopenedAt: null, date: { gte: old.date } } });
    for (const item of chain) {
      const after = await tx.finance_reconciliation.update({ where: { id: item.id }, data: { reopenedAt: new Date(), version: { increment: 1 } } });
      await tx.finance_movement.updateMany({ where: { bookId, reconciliationId: item.id }, data: { reconciliationId: null } });
      await audit(tx, actor, bookId, 'reconciliation', item.id, 'REOPEN', item, { ...after, reason: value.reason });
    }
    return { reopenedIds: chain.map(item => item.id) };
  });
}
