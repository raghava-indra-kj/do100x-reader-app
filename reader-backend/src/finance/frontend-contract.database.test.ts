import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { it, expect } from 'vitest';
import * as F from '../../../reader-frontend/src/domain/finance/models/finance';
import { getCatalog, createAccount, createBook } from './catalog-service';
import { accountBalances, createTransaction, listChanges, listTransactions } from './ledger-service';
import { createSchedule, listPlans, occurrences, matchPayment } from './plan-service';
import { getImport, listImports, stageImport } from './import-service';
import { report, suggestions, exportFinance } from './report-service';
import { forecast } from './forecast-service';

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('actual Finance wire responses satisfy the frontend contracts, including saved payment snapshots', async () => {
  const db = new PrismaClient(), rollback = new Error('Rollback UI contract fixture');
  try { await db.$transaction(async tx => {
    const user = await tx.appuser.create({ data: { email: `wire-${randomUUID()}@example.com` } }), actor = { userId: user.id, source: 'HTTP' as const };
    const book = await createBook(tx, actor, { requestKey: randomUUID(), name: 'Wire fixture', timezone: 'Asia/Kolkata' });
    F.BookSchema.parse(book);
    const account = await createAccount(tx, actor, book.id, { requestKey: randomUUID(), name: 'Wire wallet', openingDate: '2026-10-01', openingAmount: '1000.00' });
    F.AccountSchema.parse(account); F.CatalogSchema.parse(await getCatalog(tx, user.id, book.id));
    F.BalanceSchema.array().parse(await accountBalances(tx, user.id, book.id));
    const transaction = await createTransaction(tx, actor, book.id, { requestKey: randomUUID(), kind: 'EXPENSE', date: '2026-10-02', description: 'Wire expense', movements: [{ accountId: account.id, amount: '-10.00' }] });
    F.TransactionSchema.parse(transaction); F.TransactionsSchema.parse(await listTransactions(tx, user.id, book.id, {}));
    const schedule = await createSchedule(tx, actor, book.id, { requestKey: randomUUID(), title: 'Wire plan', kind: 'EXPENSE', accountId: account.id, frequency: 'ONCE', startDate: '2026-10-02', low: '10', expected: '10', high: '10' });
    F.ScheduleSchema.parse(schedule); F.PlansSchema.parse(await listPlans(tx, user.id, book.id));
    F.OccurrenceSchema.parse(await matchPayment(tx, actor, book.id, { scheduleId: schedule.id, date: '2026-10-02', expectedVersion: 0, movementId: transaction.movements[0].id, amount: '5' }));
    F.OccurrenceSchema.array().parse(await occurrences(tx, user.id, book.id, { from: '2026-10-01', to: '2026-12-31' }));
    const batch = await stageImport(tx, actor, book.id, { requestKey: randomUUID(), accountId: account.id, sourceName: 'Wire statement', rows: [{ date: '2026-10-02', amount: '-10', description: 'Wire expense' }] });
    F.ImportSchema.parse(batch); F.ImportSchema.parse(await getImport(tx, user.id, book.id, batch.id)); F.ImportsSchema.parse(await listImports(tx, user.id, book.id));
    F.ReportSchema.parse(await report(tx, user.id, book.id, { from: '2026-10-01', to: '2026-10-04' }));
    F.ForecastSchema.parse(await forecast(tx, user.id, book.id, { to: '2026-12-31' }, new Date('2026-10-04T12:00:00Z')));
    F.SuggestionsSchema.parse(await suggestions(tx, user.id, book.id, new Date('2026-10-04T12:00:00Z')));
    F.ChangesSchema.parse(await listChanges(tx, user.id, book.id));
    expect(F.ExportSchema.parse(await exportFinance(tx, user.id, book.id, { format: 'JSON' })).content).toContain('Wire wallet');
    throw rollback;
  }, { timeout: 60000 }); } catch (cause) { if (cause !== rollback) throw cause; } finally { await db.$disconnect(); }
}, 70000);
