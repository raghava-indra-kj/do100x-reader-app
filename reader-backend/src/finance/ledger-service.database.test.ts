import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { createAccount, createBook, createCategory, getCatalog, updateCategory } from './catalog-service';
import { accountBalances, createTransaction, deleteTransaction, getTransaction, listChanges, listTransactions, updateTransaction } from './ledger-service';
import { reconcileAccount, reopenReconciliation } from './reconciliation-service';

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('Finance ledger enforces exact money, scope, refunds, versions, stable IDs and reconciled history', async () => {
  const db = new PrismaClient();
  const rollback = new Error('Finance fixture rollback');
  let bookId = '';
  try {
    await db.$transaction(async tx => {
      const owner = await tx.appuser.create({ data: { email: `finance-${randomUUID()}@example.com` } });
      const outsider = await tx.appuser.create({ data: { email: `finance-${randomUUID()}@example.com` } });
      const actor = { userId: owner.id, source: 'HTTP' as const };
      const bookInput = { requestKey: randomUUID(), name: 'Personal', timezone: 'Asia/Kolkata', starterCategories: false };
      const book = await createBook(tx, actor, bookInput);
      bookId = book.id;
      expect((await createBook(tx, actor, bookInput)).id).toBe(book.id);
      await expect(createBook(tx, actor, { ...bookInput, name: 'Other' })).rejects.toMatchObject({ status: 409 });
      const bank = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Any freely named bank', openingDate: '2026-10-01', openingAmount: '1000.01' });
      const debt = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Credit card', tracksDebt: true, openingDate: '2026-10-01', openingAmount: '-100.00' });
      expect(debt.isLiquid).toBe(false);
      const salary = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Salary', kind: 'INCOME' });
      const food = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Food', kind: 'EXPENSE' });
      const child = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Groceries', kind: 'EXPENSE', parentId: food.id });
      await expect(updateCategory(tx, actor, book.id, food.id, { expectedVersion: 1, parentId: child.id })).rejects.toMatchObject({ status: 422 });
      await expect(getCatalog(tx, outsider.id, book.id)).rejects.toMatchObject({ status: 404 });
      const second = await createBook(tx, actor, { ...bookInput, requestKey: randomUUID(), name: 'Other' });
      const otherAccount = await createAccount(tx, actor, second.id, { requestKey: randomUUID(), name: 'Other account', openingDate: '2026-10-01' });
      await expect(createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'INCOME', date: '2026-10-02', description: 'No cross-book references', movements: [{ accountId: otherAccount.id, amount: '1.00' }] })).rejects.toMatchObject({ status: 404 });
      const incomeInput = { requestKey: randomUUID(), kind: 'INCOME', date: '2026-10-02', description: 'Salary', movements: [{ accountId: bank.id, amount: '500.00', cleared: true }], splits: [{ categoryId: salary.id, amount: '500.00' }] };
      const income = await createTransaction(tx, actor, book.id, incomeInput);
      expect((await createTransaction(tx, actor, book.id, incomeInput)).id).toBe(income.id);
      const expense = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'EXPENSE', date: '2026-10-03', description: 'Lunch', movements: [{ accountId: bank.id, amount: '-50.10', cleared: true }], splits: [{ categoryId: food.id, amount: '50.10' }] });
      await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'TRANSFER', date: '2026-10-04', description: 'Card repayment', movements: [{ accountId: bank.id, amount: '-100.00', cleared: true }, { accountId: debt.id, amount: '100.00', cleared: true }] });
      const pending = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'EXPENSE', status: 'PENDING', date: '2026-10-05', description: 'Pending', movements: [{ accountId: bank.id, amount: '-20.00' }] });
      const refund = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'REFUND', date: '2026-10-04', description: 'Partial refund', refundOfId: expense.id, movements: [{ accountId: bank.id, amount: '10.00', cleared: true }], splits: [{ categoryId: food.id, amount: '-10.00' }] });
      await expect(createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'REFUND', date: '2026-10-04', description: 'Too much', refundOfId: expense.id, movements: [{ accountId: bank.id, amount: '41.00' }] })).rejects.toMatchObject({ status: 422 });
      await expect(deleteTransaction(tx, actor, book.id, expense.id, { expectedVersion: 1, deleted: true })).rejects.toMatchObject({ status: 409 });
      const { requestKey: incomeKey, ...incomeFields } = incomeInput;
      const changed = await updateTransaction(tx, actor, book.id, income.id, { ...incomeFields, expectedVersion: 1, description: 'Salary renamed' });
      expect(changed.version).toBe(2);
      expect(changed.movements[0].id).toBe(income.movements[0].id);
      await expect(updateTransaction(tx, actor, book.id, income.id, { ...incomeFields, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
      const balances = await accountBalances(tx, owner.id, book.id, '2026-10-31');
      expect(balances.find((item: any) => item.id === bank.id)).toMatchObject({ postedMinor: '135991', pendingMinor: '-2000', projectedMinor: '133991' });
      expect(balances.find((item: any) => item.id === debt.id).postedMinor).toBe('0');
      const pageOne = await listTransactions(tx, owner.id, book.id, { take: 2 });
      expect(pageOne.nextCursor).toBeTruthy();
      const pageTwo = await listTransactions(tx, owner.id, book.id, { take: 2, cursor: pageOne.nextCursor });
      expect(pageTwo.items.some((item: any) => pageOne.items.some((first: any) => first.id === item.id))).toBe(false);
      await deleteTransaction(tx, actor, book.id, pending.id, { expectedVersion: 1, deleted: true });
      expect((await listTransactions(tx, owner.id, book.id, { deleted: true })).items[0].id).toBe(pending.id);
      await deleteTransaction(tx, actor, book.id, pending.id, { expectedVersion: 2, deleted: false });
      await expect(reconcileAccount(tx, actor, book.id, { accountId: bank.id, date: '2026-10-04', statementBalance: '0.00' })).rejects.toMatchObject({ status: 422 });
      const reconciliation = await reconcileAccount(tx, actor, book.id, { accountId: bank.id, date: '2026-10-04', statementBalance: '1359.91' });
      await expect(deleteTransaction(tx, actor, book.id, refund.id, { expectedVersion: 1, deleted: true })).rejects.toMatchObject({ status: 409 });
      await expect(createTransaction(tx, actor, book.id, { ...incomeInput, requestKey: randomUUID() })).rejects.toMatchObject({ status: 409 });
      await reopenReconciliation(tx, actor, book.id, reconciliation.id, { expectedVersion: 1, reason: 'Review statement' });
      await deleteTransaction(tx, actor, book.id, refund.id, { expectedVersion: 1, deleted: true });
      expect((await getTransaction(tx, owner.id, book.id, refund.id)).deletedAt).toBeTruthy();
      expect((await listChanges(tx, owner.id, book.id)).items.some((item: any) => item.action === 'REOPEN')).toBe(true);
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
  const check = new PrismaClient();
  try { expect(await check.finance_book.findUnique({ where: { id: bookId } })).toBeNull(); }
  finally { await check.$disconnect(); }
}, 70000);
