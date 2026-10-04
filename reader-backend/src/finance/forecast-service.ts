import { z } from 'zod';
import { addDays, cashForecast, dateInTimezone, monthBounds, spreadMinor, sumMoney, type ForecastEvent } from '@reader/finance-core';
import { date, FinanceError, parse } from './contract';
import { calendar, day, ownedBook, transact, wire, type FinanceDb } from './context';
import { occurrences } from './plan-service';

export const forecastSchema = z.object({ to: date }).strict();
const UNASSIGNED = 'unassigned-cash';
export async function forecast(db: FinanceDb, userId: string, bookId: string, input: unknown, now = new Date()) {
  return transact(db, tx => readForecast(tx, userId, bookId, input, now));
}
async function readForecast(db: FinanceDb, userId: string, bookId: string, input: unknown, now: Date) {
  const value = parse(forecastSchema, input);
  const book = await ownedBook(db, userId, bookId);
  const from = dateInTimezone(now, book.timezone);
  if (value.to < from || calendar(value.to).getTime() - calendar(from).getTime() > 732 * 86400000) throw new FinanceError(422, 'Choose a forecast end date within two years of today.');
  const [accounts, movements, estimates, schedules] = await Promise.all([
    db.finance_account.findMany({ where: { bookId } }),
    db.finance_movement.findMany({ where: { bookId, effectiveDate: { lte: calendar(value.to) }, transaction: { deletedAt: null } }, include: { transaction: true } }),
    db.finance_spending_estimate.findMany({ where: { bookId, category: { archivedAt: null } }, include: { category: true } }),
    db.finance_schedule.findMany({ where: { bookId, archivedAt: null, paused: false }, select: { startDate: true } }),
  ]);
  // Include overdue obligations rather than silently dropping unpaid old bills.
  const firstStored = await db.finance_occurrence.findFirst({ where: { bookId, state: 'OPEN' }, orderBy: { date: 'asc' }, select: { date: true } });
  const earliest = [...schedules.map(item => day(item.startDate)), ...(firstStored ? [day(firstStored.date)] : []), from].sort()[0];
  if (calendar(value.to).getTime() - calendar(earliest).getTime() > 366 * 5 * 86400000) throw new FinanceError(422, 'Review or skip unpaid bills older than five years before forecasting.');
  const bills = await occurrences(db, userId, bookId, { from: earliest, to: value.to });
  const forecastAccounts = accounts.map(account => ({ id: account.id, isLiquid: account.isLiquid, balanceMinor: sumMoney(movements.filter(m => m.accountId === account.id && m.transaction.status === 'POSTED' && day(m.effectiveDate) <= from).map(m => m.amountMinor)) }));
  forecastAccounts.push({ id: UNASSIGNED, isLiquid: true, balanceMinor: 0n });
  const events: ForecastEvent[] = [];
  for (const movement of movements.filter(m => m.transaction.status === 'PENDING' || day(m.effectiveDate) > from)) events.push({ date: day(movement.effectiveDate), source: movement.transaction.status === 'PENDING' ? 'PENDING' : 'KNOWN', title: movement.transaction.description, movements: [{ accountId: movement.accountId, lowMinor: movement.amountMinor, expectedMinor: movement.amountMinor, highMinor: movement.amountMinor }] });
  const warnings = ['Forecasts are estimates, not guarantees. Budgets aren’t included.'];
  if (movements.some(item => item.transaction.status === 'PENDING')) warnings.push('Pending entries may overlap unpaid plans until they’re posted and linked.');
  if (!schedules.length) warnings.push('No active plans. Future bills and income may be missing.');
  if (!estimates.length) warnings.push('No spending estimates. Unplanned spending isn’t included.');
  if (bills.some(item => !item.accountId && item.state === 'OPEN')) warnings.push('Plans without an account are included in total cash, but not in individual account forecasts.');
  if (estimates.length) warnings.push('Spending estimates are spread across the remaining days, with no account assigned.');
  for (const bill of bills.filter(item => item.state === 'OPEN' && BigInt(item.remainingHighMinor) > 0n)) {
    const low = BigInt(bill.remainingLowMinor), expected = BigInt(bill.remainingExpectedMinor), high = BigInt(bill.remainingHighMinor);
    const sourceId = bill.accountId ?? UNASSIGNED;
    const incoming = { lowMinor: low, expectedMinor: expected, highMinor: high };
    const outgoing = { lowMinor: -high, expectedMinor: -expected, highMinor: -low };
    const event: ForecastEvent = { date: bill.date.slice(0, 10), source: 'PLAN', title: bill.title, overdue: bill.date.slice(0, 10) < from, movements: [{ accountId: sourceId, ...(bill.kind === 'INCOME' ? incoming : outgoing) }] };
    if (bill.kind === 'TRANSFER' && bill.destinationAccountId) {
      event.movements.push({ accountId: bill.destinationAccountId, ...incoming });
      const sourceLiquid = forecastAccounts.find(a => a.id === sourceId)!.isLiquid;
      const destLiquid = forecastAccounts.find(a => a.id === bill.destinationAccountId)!.isLiquid;
      event.cash = sourceLiquid === destLiquid ? { lowMinor: 0n, expectedMinor: 0n, highMinor: 0n } : sourceLiquid ? outgoing : incoming;
    }
    events.push(event);
  }
  const currentMonth = monthBounds(from);
  const actualDiscretionary = await db.finance_split.findMany({ where: { bookId, categoryId: { in: estimates.map(item => item.categoryId) }, transaction: { deletedAt: null, status: 'POSTED', date: { gte: calendar(currentMonth.from), lte: calendar(from) }, movements: { none: { payments: { some: {} } } } } } });
  for (let month = currentMonth.from; month <= value.to;) {
    const bounds = monthBounds(month), start = month < from ? from : month;
    const allDays: string[] = [];
    for (let date = start; date <= bounds.to; date = addDays(date, 1)) { allDays.push(date); if (date === bounds.to) break; }
    for (const estimate of estimates) {
      const spent = month === currentMonth.from ? sumMoney(actualDiscretionary.filter(s => s.categoryId === estimate.categoryId).map(s => s.amountMinor)) : 0n;
      const remaining = (value: bigint) => value > spent ? value - spent : 0n;
      const low = spreadMinor(remaining(estimate.lowMinor), allDays.length), expected = spreadMinor(remaining(estimate.expectedMinor), allDays.length), high = spreadMinor(remaining(estimate.highMinor), allDays.length);
      allDays.forEach((date, index) => { if (date <= value.to) events.push({ date, source: 'ESTIMATE', title: `${estimate.category.name}: estimated spending`, movements: [{ accountId: UNASSIGNED, lowMinor: -high[index], expectedMinor: -expected[index], highMinor: -low[index] }] }); });
    }
    if (bounds.to >= value.to) break;
    month = addDays(bounds.to, 1);
  }
  const result = cashForecast(forecastAccounts, events, from, value.to);
  return wire({ ...result, asOf: from, currency: book.currency, currencyScale: book.currencyScale, warnings, overdue: bills.filter(item => item.state === 'OPEN' && item.date.slice(0, 10) < from && BigInt(item.remainingHighMinor) > 0n), accountNames: [...accounts.map(account => ({ id: account.id, name: account.name, isLiquid: account.isLiquid })), { id: UNASSIGNED, name: 'Estimates with no account', isLiquid: true }] });
}
