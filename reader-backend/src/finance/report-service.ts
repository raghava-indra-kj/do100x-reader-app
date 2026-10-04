import { z } from 'zod';
import { addDays, addMonths, dateInTimezone, formatMoney, medianMoney, monthBounds, sumMoney, writeCsv } from '@reader/finance-core';
import { date, FinanceError, parse, ruleSchema } from './contract';
import { activeCategory, audit, calendar, checkVersion, day, hash, ownedBook, transact, wire, writeBook, type Actor, type FinanceDb } from './context';
import { accountBalances } from './ledger-service';

export const reportSchema = z.object({ from: date, to: date, compare: z.boolean().default(true) }).strict().refine(value => value.from <= value.to, 'The end date must not be before the start date.').refine(value => calendar(value.to).getTime() - calendar(value.from).getTime() <= 366 * 5 * 86400000, 'Choose a date range of five years or less.');
export const exportSchema = z.object({ format: z.enum(['JSON', 'CSV']), from: date.optional(), to: date.optional(), includeDeleted: z.boolean().default(false) }).strict();
const reportInclude = { movements: { include: { payments: true } }, splits: true };
async function reportRows(db: FinanceDb, bookId: string, from: string, to: string) {
  return db.finance_transaction.findMany({ where: { bookId, deletedAt: null, status: 'POSTED', date: { gte: calendar(from), lte: calendar(to) } }, include: reportInclude, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
}
type ReportRows = Awaited<ReturnType<typeof reportRows>>;
function totals(rows: ReportRows) {
  let incomeMinor = 0n, expenseMinor = 0n, refundMinor = 0n, adjustmentMinor = 0n;
  const transactionCounts = { INCOME: 0, EXPENSE: 0, REFUND: 0, TRANSFER: 0, ADJUSTMENT: 0 };
  for (const row of rows) {
    transactionCounts[row.kind]++;
    const net = sumMoney(row.movements.map(m => m.amountMinor));
    if (row.kind === 'INCOME') incomeMinor += net;
    if (row.kind === 'EXPENSE') expenseMinor -= net;
    if (row.kind === 'REFUND') refundMinor += net;
    if (row.kind === 'ADJUSTMENT') adjustmentMinor += net;
  }
  return { incomeMinor, expenseMinor, refundMinor, netSpendingMinor: expenseMinor - refundMinor, netIncomeMinor: incomeMinor - expenseMinor + refundMinor, adjustmentMinor, transactionCounts };
}
export async function report(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  return transact(db, tx => readReport(tx, userId, bookId, input));
}
async function readReport(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  const book = await ownedBook(db, userId, bookId), value = parse(reportSchema, input);
  const [rows, categories, balances, movements, budgets] = await Promise.all([
    reportRows(db, bookId, value.from, value.to), db.finance_category.findMany({ where: { bookId } }),
    accountBalances(db, userId, bookId, value.to),
    db.finance_movement.findMany({ where: { bookId, effectiveDate: { gte: calendar(value.from), lte: calendar(value.to) }, transaction: { deletedAt: null, status: 'POSTED' } }, include: { account: true, transaction: { select: { kind: true } } } }),
    db.finance_budget.findMany({ where: { bookId, month: { gte: calendar(monthBounds(value.from).from), lte: calendar(value.to) } } }),
  ]);
  const categoryMap = new Map(categories.map(category => [category.id, category]));
  const categoryTotals = new Map<string, bigint>();
  const categoryRollups = new Map<string, bigint>();
  const merchants = new Map<string, bigint>(), methods = new Map<string, bigint>();
  let unclassifiedIncomeMinor = 0n, unclassifiedExpenseMinor = 0n;
  for (const row of rows) {
    if (!['INCOME', 'EXPENSE', 'REFUND'].includes(row.kind)) continue;
    const net = sumMoney(row.movements.map(m => m.amountMinor));
    const classified = sumMoney(row.splits.map(s => s.amountMinor));
    const classifiable = row.kind === 'INCOME' ? net : -net;
    if (row.kind === 'INCOME') unclassifiedIncomeMinor += classifiable - classified;
    else unclassifiedExpenseMinor += classifiable - classified;
    for (const split of row.splits) {
      categoryTotals.set(split.categoryId, (categoryTotals.get(split.categoryId) ?? 0n) + split.amountMinor);
      let id: string | null | undefined = split.categoryId;
      const visited = new Set<string>();
      while (id && !visited.has(id)) { visited.add(id); categoryRollups.set(id, (categoryRollups.get(id) ?? 0n) + split.amountMinor); id = categoryMap.get(id)?.parentId; }
    }
    if (row.kind !== 'INCOME') {
      const merchant = row.merchant || 'No merchant', method = row.paymentMethod || 'No payment method';
      merchants.set(merchant, (merchants.get(merchant) ?? 0n) + classifiable);
      methods.set(method, (methods.get(method) ?? 0n) + classifiable);
    }
  }
  const grouped = (map: Map<string, bigint>) => [...map].map(([name, amountMinor]) => ({ name, amountMinor })).sort((a, b) => a.amountMinor === b.amountMinor ? a.name.localeCompare(b.name) : a.amountMinor > b.amountMinor ? -1 : 1);
  const budgetStatus = budgets.map(budget => {
    const bounds = monthBounds(day(budget.month));
    const monthRows = rows.filter(row => day(row.date) >= bounds.from && day(row.date) <= bounds.to && row.kind !== 'INCOME');
    const childIds = new Set([budget.categoryId]);
    let previousSize = 0;
    while (previousSize !== childIds.size) { previousSize = childIds.size; for (const category of categories) if (category.parentId && childIds.has(category.parentId)) childIds.add(category.id); }
    const spentMinor = sumMoney(monthRows.flatMap(row => row.splits.filter(split => childIds.has(split.categoryId)).map(split => split.amountMinor)));
    return { ...budget, categoryName: categoryMap.get(budget.categoryId)?.name ?? 'Archived category', spentMinor, remainingMinor: budget.amountMinor - spentMinor, partialMonth: value.from > bounds.from || value.to < bounds.to };
  });
  const pendingCount = await db.finance_transaction.count({ where: { bookId, deletedAt: null, status: 'PENDING', date: { gte: calendar(value.from), lte: calendar(value.to) } } });
  const cashFlow = { incomingMinor: 0n, outgoingMinor: 0n, adjustmentMinor: 0n, netMinor: 0n };
  const accountFlows = balances.map(account => {
    const values = movements.filter(m => m.accountId === account.id);
    return { accountId: account.id, name: account.name, incomingMinor: sumMoney(values.filter(m => m.amountMinor > 0n).map(m => m.amountMinor)), outgoingMinor: -sumMoney(values.filter(m => m.amountMinor < 0n).map(m => m.amountMinor)), netMinor: sumMoney(values.map(m => m.amountMinor)) };
  });
  const liquidByTransaction = new Map<string, { kind: string; net: bigint }>();
  for (const movement of movements.filter(m => m.account.isLiquid)) {
    const old = liquidByTransaction.get(movement.transactionId);
    liquidByTransaction.set(movement.transactionId, { kind: movement.transaction.kind, net: (old?.net ?? 0n) + movement.amountMinor });
  }
  for (const movement of liquidByTransaction.values()) {
    cashFlow.netMinor += movement.net;
    if (movement.kind === 'ADJUSTMENT') cashFlow.adjustmentMinor += movement.net;
    else if (movement.net > 0n) cashFlow.incomingMinor += movement.net;
    else cashFlow.outgoingMinor -= movement.net;
  }
  let comparison = null;
  if (value.compare) {
    const days = Math.round((calendar(value.to).getTime() - calendar(value.from).getTime()) / 86400000) + 1;
    if (calendar(value.from).getTime() - days * 86400000 >= calendar('1900-01-01').getTime()) {
      const to = addDays(value.from, -1), from = addDays(value.from, -days);
      const previous = totals(await reportRows(db, bookId, from, to)), current = totals(rows);
      comparison = { from, to, totals: previous, incomeChangeMinor: current.incomeMinor - previous.incomeMinor, spendingChangeMinor: current.netSpendingMinor - previous.netSpendingMinor };
    }
  }
  const coverage = await db.finance_import_batch.findMany({ where: { bookId, status: 'COMMITTED', OR: [{ periodStart: { lte: calendar(value.to) }, periodEnd: { gte: calendar(value.from) } }, { periodStart: null }] }, select: { id: true, accountId: true, sourceName: true, periodStart: true, periodEnd: true, balanceVerified: true } });
  const quality = {
    uncategorizedTransactionCount: rows.filter(row => ['INCOME', 'EXPENSE', 'REFUND'].includes(row.kind) && (row.kind === 'INCOME' ? sumMoney(row.movements.map(m => m.amountMinor)) : -sumMoney(row.movements.map(m => m.amountMinor))) !== sumMoney(row.splits.map(s => s.amountMinor))).length,
    pendingCount, unclearedMovementCount: movements.filter(m => !m.cleared).length,
    archivedAccountsWithBalance: balances.filter(account => account.archivedAt && BigInt(account.postedMinor) !== 0n).map(account => account.id),
    unverifiedImportCount: coverage.filter(batch => !batch.balanceVerified).length,
  };
  return wire({ book, from: value.from, to: value.to, totals: totals(rows), cashFlow, accountFlows, balances, categories: categories.map(category => ({ ...category, directMinor: categoryTotals.get(category.id) ?? 0n, rollupMinor: categoryRollups.get(category.id) ?? 0n })), merchants: grouped(merchants), paymentMethods: grouped(methods), unclassifiedIncomeMinor, unclassifiedExpenseMinor, budgetStatus, pendingCount, quality, comparison, coverage, warnings: ['Reports include recorded, posted transactions only. Missing records can affect totals.', 'Income and spending use transaction dates. Account cash flow uses each entry’s effective date. Transfers and balance corrections don’t count as income or spending.', ...(pendingCount ? ['Pending transactions aren’t included in actual totals.'] : []), ...(quality.uncategorizedTransactionCount ? ['Some transactions aren’t fully categorized.'] : []), ...(coverage.some(batch => !batch.balanceVerified) ? ['Some imported statements haven’t been verified as complete.'] : [])] });
}

export async function listRules(db: FinanceDb, userId: string, bookId: string) {
  await ownedBook(db, userId, bookId);
  return wire(await db.finance_rule.findMany({ where: { bookId }, orderBy: [{ matchText: 'asc' }, { id: 'asc' }] }));
}
export async function setRule(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(ruleSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    await activeCategory(tx, bookId, value.categoryId);
    const old = await tx.finance_rule.findFirst({ where: { bookId, id: value.id } });
    const data = { categoryId: value.categoryId, matchText: value.matchText, merchantName: value.merchantName ?? null, enabled: value.enabled };
    // Client-assigned UUID addresses rule creation; exact first-save retries
    // return the same rule. Subsequent edits always require its current version.
    if (old && value.expectedVersion === 0 && old.version === 1 && hash(data) === hash({ categoryId: old.categoryId, matchText: old.matchText, merchantName: old.merchantName, enabled: old.enabled })) return wire(old);
    checkVersion(old, value.expectedVersion);
    const item = old ? await tx.finance_rule.update({ where: { id: old.id }, data: { ...data, version: { increment: 1 } } }) : await tx.finance_rule.create({ data: { id: value.id, bookId, ...data } });
    await audit(tx, actor, bookId, 'rule', item.id, old ? 'UPDATE' : 'CREATE', old, item);
    return wire(item);
  });
}

export async function suggestions(db: FinanceDb, userId: string, bookId: string, now = new Date()) {
  return transact(db, tx => readSuggestions(tx, userId, bookId, now));
}
async function readSuggestions(db: FinanceDb, userId: string, bookId: string, now: Date) {
  const book = await ownedBook(db, userId, bookId);
  const today = dateInTimezone(now, book.timezone), currentMonth = monthBounds(today).from;
  const from = addMonths(currentMonth, -6), to = addDays(currentMonth, -1);
  const [rows, categories] = await Promise.all([reportRows(db, bookId, from, to), db.finance_category.findMany({ where: { bookId, kind: 'EXPENSE', archivedAt: null } })]);
  const discretionary = rows.filter(row => !row.movements.some(m => m.payments.length));
  const estimates = categories.flatMap(category => {
    const monthlyMinor = Array.from({ length: 6 }, (_, index) => {
      const month = addMonths(from, index).slice(0, 7);
      const total = sumMoney(discretionary.filter(row => day(row.date).startsWith(month) && ['EXPENSE', 'REFUND'].includes(row.kind)).flatMap(row => row.splits.filter(split => split.categoryId === category.id).map(split => split.amountMinor)));
      return total > 0n ? total : 0n;
    });
    if (!monthlyMinor.some(amount => amount > 0n)) return [];
    const sorted = [...monthlyMinor].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    return [{ categoryId: category.id, categoryName: category.name, lowMinor: sorted[0], expectedMinor: medianMoney(monthlyMinor), highMinor: sorted[5], monthlyMinor, monthsWithRecordedSpend: monthlyMinor.filter(amount => amount > 0n).length }];
  });
  const groups = new Map<string, ReportRows>();
  for (const row of discretionary.filter(row => row.kind === 'EXPENSE')) {
    const outgoing = row.movements.filter(m => m.amountMinor < 0n);
    if (outgoing.length !== 1) continue;
    const name = (row.merchant || row.description).trim().toLowerCase();
    const key = `${outgoing[0].accountId}:${name}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const recurring = [...groups.values()].flatMap(items => {
    if (items.length < 3) return [];
    const gaps = items.slice(1).map((item, index) => Math.round((item.date.getTime() - items[index].date.getTime()) / 86400000));
    let frequency: 'DAILY' | 'MONTHLY', interval: number;
    if (gaps.every(gap => gap === gaps[0]) && [7, 14, 28].includes(gaps[0])) { frequency = 'DAILY'; interval = gaps[0]; }
    else if (gaps.every(gap => gap >= 26 && gap <= 35)) { frequency = 'MONTHLY'; interval = 1; }
    else return [];
    const amounts = items.map(item => -sumMoney(item.movements.map(m => m.amountMinor))).filter(amount => amount > 0n).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    if (amounts.length !== items.length) return [];
    const first = items[0], last = items[items.length - 1];
    return [{ title: last.merchant || last.description, accountId: last.movements.find(m => m.amountMinor < 0n)!.accountId, categoryId: last.splits.length === 1 ? last.splits[0].categoryId : null, frequency, interval, anchorDate: day(first.date), lastRecordedDate: day(last.date), lowMinor: amounts[0], expectedMinor: medianMoney(amounts), highMinor: amounts[amounts.length - 1], transactionIds: items.map(item => item.id), reason: `Found ${items.length} payments spaced ${frequency === 'MONTHLY' ? 'roughly monthly' : `exact ${interval}-day`} apart. Check them before adding a plan.` }];
  });
  return wire({ from, to, estimates, recurring, warnings: ['Suggestions won’t change anything until you review and save them.', 'Based on six complete months, including months with no recorded spending. Missing history can make these estimates unreliable.', 'Payments already linked to plans are excluded. Review or split transactions that combine planned and unplanned spending.'] });
}

export async function exportFinance(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  return transact(db, tx => readExport(tx, userId, bookId, input));
}
async function readExport(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  const value = parse(exportSchema, input), book = await ownedBook(db, userId, bookId);
  if (value.format === 'JSON' && (value.from || value.to)) throw new FinanceError(422, 'JSON exports the full book. Use CSV for filtered transactions.');
  if (value.from && value.to && value.from > value.to) throw new FinanceError(422, 'The export end date must not be before its start date.');
  const transactions = await db.finance_transaction.findMany({ where: { bookId, ...(value.includeDeleted || value.format === 'JSON' ? {} : { deletedAt: null }), date: { ...(value.from ? { gte: calendar(value.from) } : {}), ...(value.to ? { lte: calendar(value.to) } : {}) } }, include: { movements: true, splits: true }, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
  const [accounts, categories, schedules, budgets, estimates, rules, imports, changes] = await Promise.all([
    db.finance_account.findMany({ where: { bookId } }), db.finance_category.findMany({ where: { bookId } }), db.finance_schedule.findMany({ where: { bookId } }), db.finance_budget.findMany({ where: { bookId } }), db.finance_spending_estimate.findMany({ where: { bookId } }), db.finance_rule.findMany({ where: { bookId } }), db.finance_import_batch.findMany({ where: { bookId }, include: importIncludeForExport }), db.finance_change.findMany({ where: { bookId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
  ]);
  if (value.format === 'JSON') {
    const [occurrences, payments, reconciliations, sources] = await Promise.all([db.finance_occurrence.findMany({ where: { bookId } }), db.finance_occurrence_payment.findMany({ where: { bookId } }), db.finance_reconciliation.findMany({ where: { bookId } }), db.finance_source_record.findMany({ where: { bookId } })]);
    return { filename: `finance-${bookId}.json`, mime: 'application/json', content: JSON.stringify(wire({ schemaVersion: 1, exportedAt: new Date(), filters: { ...value, includeDeleted: true }, book, accounts, categories, transactions, schedules, budgets, estimates, rules, imports, occurrences, payments, reconciliations, sources, changes }), null, 2) };
  }
  const accountNames = new Map(accounts.map(account => [account.id, account.name]));
  const csvRows = transactions.flatMap(transaction => transaction.movements.map(movement => [transaction.id, day(transaction.date), day(movement.effectiveDate), transaction.kind, transaction.status, transaction.description, transaction.merchant, transaction.paymentMethod, transaction.bankReference, accountNames.get(movement.accountId) ?? movement.accountId, formatMoney(movement.amountMinor, book.currencyScale), book.currency, movement.cleared ? 'true' : 'false', transaction.deletedAt ? 'true' : 'false', JSON.stringify(transaction.splits.map(split => ({ categoryId: split.categoryId, amount: formatMoney(split.amountMinor, book.currencyScale) }))) ]));
  return { filename: `finance-${bookId}.csv`, mime: 'text/csv;charset=utf-8', content: writeCsv(['Transaction ID', 'Date', 'Effective Date', 'Kind', 'Status', 'Description', 'Merchant', 'Payment Method', 'Bank Reference', 'Account', 'Signed Amount', 'Currency', 'Cleared', 'Deleted', 'Category Splits'], csvRows) };
}
const importIncludeForExport = { rows: true };
