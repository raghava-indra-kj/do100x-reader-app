import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { createAccount, createBook, createCategory } from './catalog-service';
import { createTransaction, deleteTransaction } from './ledger-service';
import { createSchedule, matchPayment, occurrences, setBudget, setEstimate, unmatchPayment, updateOccurrence, updateSchedule } from './plan-service';
import { forecast } from './forecast-service';

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('Finance plans preserve snapshots and partial payments; forecasts exclude budgets and paid amounts', async () => {
  const db = new PrismaClient(), rollback = new Error('Finance plans rollback');
  try {
    await db.$transaction(async tx => {
      const user = await tx.appuser.create({ data: { email: `plans-${randomUUID()}@example.com` } });
      const actor = { userId: user.id, source: 'HTTP' as const };
      const book = await createBook(tx, actor, { requestKey: randomUUID(), name: 'Plans', timezone: 'Asia/Kolkata', starterCategories: false });
      const bank = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Bank', openingDate: '2026-01-01', openingAmount: '1000.00' });
      const food = await createCategory(tx, actor, book.id, { requestKey: randomUUID(), name: 'Food', kind: 'EXPENSE' });
      const planInput = { requestKey: randomUUID(), title: 'Electricity', kind: 'EXPENSE', accountId: bank.id, frequency: 'MONTHLY', startDate: '2026-01-31', low: '200.00', expected: '300.00', high: '400.00' };
      const schedule = await createSchedule(tx, actor, book.id, planInput);
      const initial = await occurrences(tx, user.id, book.id, { from: '2026-01-01', to: '2026-03-31' });
      expect(initial.map(item => item.date.slice(0, 10))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
      expect(initial.every(item => item.version === 0)).toBe(true);
      expect(await tx.finance_occurrence.count({ where: { bookId: book.id } })).toBe(0);
      const payment = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'EXPENSE', date: '2026-02-28', description: 'Partial bill', movements: [{ accountId: bank.id, amount: '-100.00' }] });
      const target = { scheduleId: schedule.id, date: '2026-02-28', expectedVersion: 0 };
      const matched = await matchPayment(tx, actor, book.id, { ...target, movementId: payment.movements[0].id, amount: '100.00' });
      expect(matched.remainingExpectedMinor).toBe('20000');
      await expect(matchPayment(tx, actor, book.id, { ...target, movementId: payment.movements[0].id, amount: '100.00' })).rejects.toMatchObject({ status: 409 });
      await expect(deleteTransaction(tx, actor, book.id, payment.id, { expectedVersion: 1, deleted: true })).rejects.toMatchObject({ status: 409 });
      const { requestKey, ...fields } = planInput;
      await updateSchedule(tx, actor, book.id, schedule.id, { ...fields, expectedVersion: 1, expected: '350.00', high: '450.00' });
      const revised = await occurrences(tx, user.id, book.id, { from: '2026-02-01', to: '2026-03-31' });
      expect(revised[0].expectedMinor).toBe('30000');
      expect(revised[1].expectedMinor).toBe('35000');
      const unmatched = await unmatchPayment(tx, actor, book.id, { ...target, expectedVersion: matched.version, movementId: payment.movements[0].id });
      const skipped = await updateOccurrence(tx, actor, book.id, { ...target, expectedVersion: unmatched.version, state: 'SKIPPED' });
      expect(skipped.state).toBe('SKIPPED');
      // Skip the old January bill explicitly; do not silently discard arrears.
      await updateOccurrence(tx, actor, book.id, { scheduleId: schedule.id, date: '2026-01-31', expectedVersion: 0, state: 'SKIPPED' });
      await setEstimate(tx, actor, book.id, { categoryId: food.id, expectedVersion: 0, low: '100.00', expected: '200.00', high: '300.00' });
      const before = await forecast(tx, user.id, book.id, { to: '2026-03-31' }, new Date('2026-03-01T00:00:00Z'));
      expect(before.timeline.at(-1)).toMatchObject({ lowMinor: '15000', expectedMinor: '35000', highMinor: '60000' });
      await setBudget(tx, actor, book.id, { categoryId: food.id, month: '2026-03-01', amount: '9999.00', expectedVersion: 0 });
      const after = await forecast(tx, user.id, book.id, { to: '2026-03-31' }, new Date('2026-03-01T00:00:00Z'));
      expect(after.timeline).toEqual(before.timeline);
      const actual = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'EXPENSE', date: '2026-03-02', description: 'Food', movements: [{ accountId: bank.id, amount: '-50.00' }], splits: [{ categoryId: food.id, amount: '50.00' }] });
      const midMonth = await forecast(tx, user.id, book.id, { to: '2026-03-31' }, new Date('2026-03-02T10:00:00Z'));
      expect(midMonth.timeline.at(-1)?.expectedMinor).toBe('35000');
      const noAccountPlan = await createSchedule(tx, actor, book.id, { requestKey: randomUUID(), title: 'Overdue phone', kind: 'EXPENSE', frequency: 'ONCE', startDate: '2026-02-15', low: '10.00', expected: '10.00', high: '10.00' });
      const overdue = await forecast(tx, user.id, book.id, { to: '2026-03-31' }, new Date('2026-03-02T10:00:00Z'));
      expect(overdue.overdue.some(item => item.scheduleId === noAccountPlan.id)).toBe(true);
      expect(overdue.timeline[0].events.some(item => item.overdue)).toBe(true);
      expect(overdue.warnings.some(item => item.includes('no account'))).toBe(true);
      expect(actual.id).toBeTruthy();
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
}, 70000);
