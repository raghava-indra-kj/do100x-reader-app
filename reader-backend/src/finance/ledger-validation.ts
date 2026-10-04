import { sumMoney } from '@reader/finance-core';
import { amount, FinanceError, type TransactionValue } from './contract';

export interface LedgerAccount { id: string; archivedAt: Date | null }
export interface LedgerCategory { id: string; kind: 'INCOME' | 'EXPENSE'; archivedAt: Date | null }

/** Shared by manual entry, MCP and import commit. No transport may bypass it. */
export function validateLedger(value: TransactionValue, scale: number, accounts: LedgerAccount[], categories: LedgerCategory[]) {
  const accountMap = new Map(accounts.map(account => [account.id, account]));
  const categoryMap = new Map(categories.map(category => [category.id, category]));
  if (new Set(value.movements.map(movement => movement.accountId)).size !== value.movements.length) throw new FinanceError(422, 'Use one entry per account in each transaction.');
  if (new Set(value.splits.map(split => split.categoryId)).size !== value.splits.length) throw new FinanceError(422, 'Use each category only once in a split.');
  const movements = value.movements.map(movement => {
    const account = accountMap.get(movement.accountId);
    if (!account || account.archivedAt) throw new FinanceError(404, 'Account unavailable in this book.');
    const amountMinor = amount(movement.amount, scale);
    if (amountMinor === 0n) throw new FinanceError(422, 'Account entry amounts can’t be zero.');
    return { ...movement, amountMinor, effectiveDate: movement.effectiveDate ?? value.date };
  });
  const splits = value.splits.map(split => {
    const category = categoryMap.get(split.categoryId);
    if (!category || category.archivedAt) throw new FinanceError(404, 'Category unavailable in this book.');
    const expectedKind = value.kind === 'INCOME' ? 'INCOME' : 'EXPENSE';
    if (category.kind !== expectedKind) throw new FinanceError(422, 'Choose a category that matches the transaction type.');
    const amountMinor = amount(split.amount, scale);
    if (value.kind === 'REFUND' ? amountMinor >= 0n : amountMinor <= 0n) throw new FinanceError(422, 'Use positive category amounts for income and expenses, and negative amounts for refunds.');
    return { ...split, amountMinor };
  });
  const netMinor = sumMoney(movements.map(movement => movement.amountMinor));
  const classifiedMinor = sumMoney(splits.map(split => split.amountMinor));
  if (value.refundOfId && value.kind !== 'REFUND') throw new FinanceError(422, 'Only refunds can link to an original expense.');
  if (['TRANSFER', 'ADJUSTMENT'].includes(value.kind) && splits.length) throw new FinanceError(422, 'Transfers and balance corrections don’t count as income or spending.');
  if (value.kind === 'TRANSFER' && (movements.length < 2 || netMinor !== 0n)) throw new FinanceError(422, 'A transfer needs at least two accounts, with amounts totaling zero.');
  if (value.kind === 'INCOME' && netMinor <= 0n) throw new FinanceError(422, 'Income must increase the total balance.');
  if (value.kind === 'EXPENSE' && netMinor >= 0n) throw new FinanceError(422, 'Expenses must decrease the total balance.');
  if (value.kind === 'REFUND' && netMinor <= 0n) throw new FinanceError(422, 'A refund must increase the total balance.');
  const classifiableMinor = value.kind === 'EXPENSE' ? -netMinor : value.kind === 'REFUND' ? -netMinor : netMinor;
  if (value.kind === 'REFUND' ? classifiedMinor < classifiableMinor : classifiedMinor > classifiableMinor && !['TRANSFER', 'ADJUSTMENT'].includes(value.kind)) throw new FinanceError(422, 'Category splits total more than the transaction amount.');
  return { movements, splits, netMinor, uncategorizedMinor: classifiableMinor - classifiedMinor };
}
