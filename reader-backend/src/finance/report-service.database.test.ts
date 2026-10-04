import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { createAccount, createBook, createCategory } from './catalog-service';
import { createTransaction, deleteTransaction } from './ledger-service';
import { setBudget } from './plan-service';
import { exportFinance, report, setRule, suggestions } from './report-service';
import { commitImport, stageImport } from './import-service';

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('Finance reports separate transfers/refunds/corrections and keep reviewed rules, suggestions and exports reliable', async () => {
  const db = new PrismaClient(), rollback = new Error('Finance reporting rollback');
  try {
    await db.$transaction(async tx => {
      const user = await tx.appuser.create({ data: { email: `reports-${randomUUID()}@example.com` } });
      const actor = { userId: user.id, source: 'HTTP' as const };
      const book = await createBook(tx, actor, { requestKey: randomUUID(), name: 'Reports', timezone: 'Asia/Kolkata', starterCategories: false });
      const bank = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Bank', openingDate: '2026-09-01', openingAmount: '1000.00' });
      const cash = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Cash', openingDate: '2026-09-01' });
      const parent = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Living', kind: 'EXPENSE' });
      const food = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Food', kind: 'EXPENSE', parentId: parent.id });
      const other = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Other', kind: 'EXPENSE' });
      const income = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Salary', kind: 'INCOME' });
      const create = (value: Record<string, unknown>) => createTransaction(tx, actor, book.id, { requestKey: randomUUID(), date: '2026-10-01', ...value });
      await create({ kind: 'INCOME', description: 'Salary', movements: [{ accountId: bank.id, amount: '500.00' }], splits: [{ categoryId: income.id, amount: '500.00' }] });
      const expense = await create({ kind: 'EXPENSE', description: 'Food', merchant: 'Tea house', paymentMethod: 'UPI', movements: [{ accountId: bank.id, amount: '-55.00' }], splits: [{ categoryId: food.id, amount: '50.00' }] });
      await create({ kind: 'TRANSFER', description: 'Cash withdrawal', movements: [{ accountId: bank.id, amount: '-100.00' }, { accountId: cash.id, amount: '100.00' }] });
      await create({ kind: 'REFUND', description: 'Food return', refundOfId: expense.id, merchant: 'Tea house', paymentMethod: 'UPI', movements: [{ accountId: bank.id, amount: '10.00' }], splits: [{ categoryId: food.id, amount: '-10.00' }] });
      await create({ kind: 'ADJUSTMENT', description: 'Balance correction', movements: [{ accountId: bank.id, amount: '1.00' }] });
      await create({ kind: 'EXPENSE', status: 'PENDING', description: 'Pending expense', movements: [{ accountId: bank.id, amount: '-20.00' }] });
      await setBudget(tx, actor, book.id, { categoryId: parent.id, month: '2026-10-01', amount: '30.00', expectedVersion: 0 });
      const result = await report(tx, user.id, book.id, { from: '2026-10-01', to: '2026-10-31' });
      expect(result.totals).toMatchObject({ incomeMinor: '50000', expenseMinor: '5500', refundMinor: '1000', netSpendingMinor: '4500', netIncomeMinor: '45500', adjustmentMinor: '100' });
      expect(result.cashFlow).toEqual({ incomingMinor: '51000', outgoingMinor: '5500', adjustmentMinor: '100', netMinor: '45600' });
      expect(result.budgetStatus[0]).toMatchObject({ spentMinor: '4000', remainingMinor: '-1000' });
      expect(result.categories.find(category => category.id === parent.id)?.rollupMinor).toBe('4000');
      expect(result.unclassifiedExpenseMinor).toBe('500');
      expect(result.quality.uncategorizedTransactionCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      expect(result.merchants[0]).toMatchObject({ name: 'Tea house', amountMinor: '4500' });
      expect(result.comparison?.incomeChangeMinor).toBe('50000');
      const deleted = await create({ kind: 'EXPENSE', description: '=SUM(1,2)', movements: [{ accountId: bank.id, amount: '-1.00' }] });
      await deleteTransaction(tx, actor, book.id, deleted.id, { expectedVersion: 1, deleted: true });
      const json = JSON.parse((await exportFinance(tx, user.id, book.id, { format: 'JSON' })).content);
      expect(json.transactions.some((item: any) => item.id === deleted.id && item.deletedAt)).toBe(true);
      expect(json.changes.length).toBeGreaterThan(0);
      const csv = await exportFinance(tx, user.id, book.id, { format: 'CSV', includeDeleted: true });
      expect(csv.content).toContain("'=SUM(1,2)");
      await expect(exportFinance(tx, user.id, book.id, { format: 'JSON', from: '2026-10-01' })).rejects.toMatchObject({ status: 422 });
      for (const [month, money] of [['07', '15.00'], ['08', '16.00'], ['09', '14.00']]) await create({ kind: 'EXPENSE', date: `2026-${month}-10`, description: 'Fixed monthly meal subscription', merchant: 'Monthly meals', movements: [{ accountId: bank.id, amount: `-${money}` }], splits: [{ categoryId: food.id, amount: money }] });
      const advice = await suggestions(tx, user.id, book.id, new Date('2026-10-04T00:00:00Z'));
      expect(advice.estimates.find(item => item.categoryId === food.id)?.monthlyMinor).toEqual(['0', '0', '0', '1500', '1600', '1400']);
      expect(advice.recurring.find(item => item.title === 'Monthly meals')).toMatchObject({ frequency: 'MONTHLY', expectedMinor: '1500' });
      expect(await tx.finance_schedule.count({ where: { bookId: book.id } })).toBe(0);
      const ruleInput = { id: randomUUID(), expectedVersion: 0, categoryId: food.id, matchText: 'tea', merchantName: 'Clean merchant', enabled: true };
      const rule = await setRule(tx, actor, book.id, ruleInput);
      expect((await setRule(tx, actor, book.id, ruleInput)).id).toBe(rule.id);
      const draft = await stageImport(tx, actor, book.id, { requestKey: randomUUID(), accountId: bank.id, sourceName: 'Rule preview', rows: [{ date: '2026-10-02', amount: '-2.00', description: 'Original UPI TEA description' }] });
      expect(draft.rows[0].resolution).toMatchObject({ categoryId: food.id, merchant: 'Clean merchant', ruleVersion: 1 });
      await setRule(tx, actor, book.id, { ...ruleInput, expectedVersion: 1, categoryId: other.id, merchantName: 'Changed after preview' });
      const committed = await commitImport(tx, actor, book.id, draft.id, { expectedVersion: 1, acceptUnverified: true });
      const movement = await tx.finance_movement.findUniqueOrThrow({ where: { id: committed.rows[0].committedMovementId! }, include: { transaction: { include: { splits: true } }, sourceRecords: true } });
      expect(movement.transaction.merchant).toBe('Clean merchant');
      expect(movement.transaction.splits[0].categoryId).toBe(food.id);
      expect(movement.sourceRecords[0].sourceDescription).toBe('Original UPI TEA description');
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
}, 70000);
