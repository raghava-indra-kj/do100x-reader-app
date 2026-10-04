import { dateInTimezone, occurrenceDates, sumMoney } from '@reader/finance-core';
import { type finance_book, type finance_schedule } from '@prisma/client';
import { z } from 'zod';
import { amount, budgetSchema, date, estimateSchema, FinanceError, moneyRange, occurrenceTarget, occurrenceUpdateSchema, parse, paymentSchema, scheduleSchema, scheduleUpdateSchema, uuid, type ScheduleValue } from './contract';
import { activeAccount, activeCategory, audit, calendar, checkVersion, day, hash, ownedBook, retry, transact, wire, writeBook, type Actor, type FinanceDb } from './context';

export const rangeSchema = z.object({ from: date, to: date }).strict().refine(value => value.from <= value.to, 'The end date must not be before the start date.').refine(value => calendar(value.to).getTime() - calendar(value.from).getTime() <= 366 * 5 * 86400000, 'Choose a date range of five years or less.');
export const unmatchSchema = occurrenceTarget.extend({ movementId: uuid }).strict();
const occurrenceInclude = { payments: { include: { movement: { include: { transaction: { select: { deletedAt: true, status: true } } } } } } };

async function scheduleData(db: FinanceDb, book: finance_book, value: ScheduleValue) {
  if (value.endDate && value.endDate < value.startDate) throw new FinanceError(422, 'The end date must be on or after the start date.');
  if (value.accountId) await activeAccount(db, book.id, value.accountId);
  if (value.kind === 'TRANSFER') {
    if (!value.accountId || !value.destinationAccountId || value.accountId === value.destinationAccountId) throw new FinanceError(422, 'Choose two different accounts for a transfer plan.');
    await activeAccount(db, book.id, value.destinationAccountId);
    if (value.categoryId) throw new FinanceError(422, 'Transfer plans can’t use income or expense categories.');
  } else if (value.destinationAccountId) throw new FinanceError(422, 'Only transfer plans need a destination account.');
  if (value.categoryId && (await activeCategory(db, book.id, value.categoryId)).kind !== value.kind) throw new FinanceError(422, 'Choose a category that matches the plan type.');
  return { title: value.title, kind: value.kind, accountId: value.accountId ?? null, destinationAccountId: value.destinationAccountId ?? null, categoryId: value.categoryId ?? null, frequency: value.frequency, interval: value.interval, monthEnd: value.monthEnd, startDate: calendar(value.startDate), endDate: value.endDate ? calendar(value.endDate) : null, ...moneyRange(value, book.currencyScale), notesMarkdown: value.notesMarkdown ?? null, paused: value.paused };
}
export async function listPlans(db: FinanceDb, userId: string, bookId: string) {
  await ownedBook(db, userId, bookId);
  const [schedules, budgets, estimates] = await Promise.all([
    db.finance_schedule.findMany({ where: { bookId }, orderBy: [{ startDate: 'asc' }, { id: 'asc' }] }),
    db.finance_budget.findMany({ where: { bookId }, orderBy: [{ month: 'desc' }, { id: 'asc' }] }),
    db.finance_spending_estimate.findMany({ where: { bookId }, orderBy: { id: 'asc' } }),
  ]);
  return wire({ schedules, budgets, estimates });
}
export async function createSchedule(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(scheduleSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = retry(await tx.finance_schedule.findUnique({ where: { bookId_requestKey: { bookId, requestKey: value.requestKey } } }), value);
    if (old) return wire(old);
    const item = await tx.finance_schedule.create({ data: { bookId, ...await scheduleData(tx, book, value), requestKey: value.requestKey, requestHash: hash(value) } });
    await audit(tx, actor, bookId, 'schedule', item.id, 'CREATE', null, item);
    return wire(item);
  });
}
export async function updateSchedule(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(scheduleUpdateSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = await tx.finance_schedule.findFirst({ where: { bookId, id } });
    if (!old) throw new FinanceError(404, 'Plan not found');
    checkVersion(old, value.expectedVersion);
    const item = await tx.finance_schedule.update({ where: { id }, data: { ...await scheduleData(tx, book, value), archivedAt: value.archived === undefined ? undefined : value.archived ? new Date() : null, version: { increment: 1 } } });
    // Never rewrite stored occurrences/payment history when a rule changes.
    await audit(tx, actor, bookId, 'schedule', id, 'UPDATE', old, item);
    return wire(item);
  });
}
function dates(schedule: finance_schedule, from: string, to: string) {
  return occurrenceDates({ startDate: day(schedule.startDate), endDate: schedule.endDate ? day(schedule.endDate) : null, frequency: schedule.frequency, interval: schedule.interval, monthEnd: schedule.monthEnd }, from, to);
}
function snapshot(schedule: finance_schedule, date: string) {
  return { bookId: schedule.bookId, scheduleId: schedule.id, date: calendar(date), title: schedule.title, kind: schedule.kind, accountId: schedule.accountId, destinationAccountId: schedule.destinationAccountId, categoryId: schedule.categoryId, lowMinor: schedule.lowMinor, expectedMinor: schedule.expectedMinor, highMinor: schedule.highMinor, notesMarkdown: schedule.notesMarkdown };
}
function withPaymentTotals<T extends ReturnType<typeof snapshot> & { id: string | null; version: number; state: 'OPEN' | 'SKIPPED'; payments: { appliedMinor: bigint; movement: { transaction: { deletedAt: Date | null; status: string } } }[] }>(occurrence: T) {
  const paidMinor = sumMoney(occurrence.payments.filter(p => !p.movement.transaction.deletedAt && p.movement.transaction.status === 'POSTED').map(p => p.appliedMinor));
  const remaining = (amount: bigint) => amount > paidMinor ? amount - paidMinor : 0n;
  return { ...occurrence, paidMinor, remainingLowMinor: remaining(occurrence.lowMinor), remainingExpectedMinor: remaining(occurrence.expectedMinor), remainingHighMinor: remaining(occurrence.highMinor), overpaidMinor: paidMinor > occurrence.expectedMinor ? paidMinor - occurrence.expectedMinor : 0n };
}
export async function occurrences(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  return transact(db, tx => readOccurrences(tx, userId, bookId, input));
}
async function readOccurrences(db: FinanceDb, userId: string, bookId: string, input: unknown) {
  await ownedBook(db, userId, bookId);
  const value = parse(rangeSchema, input);
  const [schedules, stored] = await Promise.all([
    db.finance_schedule.findMany({ where: { bookId, archivedAt: null, paused: false, startDate: { lte: calendar(value.to) } } }),
    db.finance_occurrence.findMany({ where: { bookId, date: { gte: calendar(value.from), lte: calendar(value.to) } }, include: occurrenceInclude }),
  ]);
  const result = new Map<string, ReturnType<typeof withPaymentTotals>>();
  for (const item of stored) result.set(`${item.scheduleId}:${day(item.date)}`, withPaymentTotals(item));
  for (const schedule of schedules) for (const date of dates(schedule, value.from, value.to)) {
    const key = `${schedule.id}:${date}`;
    if (!result.has(key)) result.set(key, withPaymentTotals({ ...snapshot(schedule, date), id: null, version: 0, state: 'OPEN', payments: [] }));
  }
  return wire([...result.values()].sort((a, b) => a.date.getTime() - b.date.getTime() || a.scheduleId.localeCompare(b.scheduleId)));
}
async function ensureOccurrence(db: FinanceDb, bookId: string, target: { scheduleId: string; date: string; expectedVersion: number }) {
  const old = await db.finance_occurrence.findFirst({ where: { bookId, scheduleId: target.scheduleId, date: calendar(target.date) }, include: occurrenceInclude });
  checkVersion(old, target.expectedVersion);
  if (old) return old;
  const schedule = await db.finance_schedule.findFirst({ where: { bookId, id: target.scheduleId, archivedAt: null, paused: false } });
  if (!schedule || !dates(schedule, target.date, target.date).length) throw new FinanceError(404, 'This bill is unavailable.');
  return db.finance_occurrence.create({ data: snapshot(schedule, target.date), include: occurrenceInclude });
}
export async function updateOccurrence(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(occurrenceUpdateSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = await ensureOccurrence(tx, bookId, value);
    if (value.state === 'SKIPPED' && old.payments.length) throw new FinanceError(409, 'Remove payment links before skipping this bill.');
    const lowMinor = value.low === undefined ? old.lowMinor : amount(value.low, book.currencyScale);
    const expectedMinor = value.expected === undefined ? old.expectedMinor : amount(value.expected, book.currencyScale);
    const highMinor = value.high === undefined ? old.highMinor : amount(value.high, book.currencyScale);
    if (lowMinor < 0n || lowMinor > expectedMinor || expectedMinor > highMinor) throw new FinanceError(422, 'Amounts must be nonnegative, with low ≤ expected ≤ high.');
    const item = await tx.finance_occurrence.update({ where: { id: old.id }, data: { title: value.title, state: value.state, notesMarkdown: value.notesMarkdown, lowMinor, expectedMinor, highMinor, version: { increment: 1 } }, include: occurrenceInclude });
    await audit(tx, actor, bookId, 'occurrence', item.id, 'UPDATE', old, item);
    return wire(withPaymentTotals(item));
  });
}
export async function matchPayment(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(paymentSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const old = await ensureOccurrence(tx, bookId, value);
    if (old.state === 'SKIPPED') throw new FinanceError(409, 'Restore this skipped bill before linking a payment.');
    const movement = await tx.finance_movement.findFirst({ where: { bookId, id: value.movementId }, include: { payments: true, transaction: { include: { movements: true } } } });
    if (!movement || movement.transaction.deletedAt || movement.transaction.status !== 'POSTED') throw new FinanceError(404, 'This posted account entry is unavailable.');
    if (day(movement.effectiveDate) > dateInTimezone(new Date(), book.timezone)) throw new FinanceError(422, 'Future-dated entries can’t be linked as payments yet.');
    if (movement.transaction.kind !== old.kind || (old.accountId && movement.accountId !== old.accountId) || (old.kind === 'INCOME' ? movement.amountMinor <= 0n : movement.amountMinor >= 0n)) throw new FinanceError(422, 'The payment’s direction, type or account doesn’t match the plan.');
    if (old.kind === 'TRANSFER' && !movement.transaction.movements.some(m => m.accountId === old.destinationAccountId && m.amountMinor === -movement.amountMinor)) throw new FinanceError(422, 'The transfer destination doesn’t match the plan.');
    const appliedMinor = amount(value.amount, book.currencyScale);
    const capacity = movement.amountMinor < 0n ? -movement.amountMinor : movement.amountMinor;
    const used = sumMoney(movement.payments.filter(p => p.occurrenceId !== old.id).map(p => p.appliedMinor));
    if (appliedMinor <= 0n || used + appliedMinor > capacity) throw new FinanceError(422, 'The linked amount exceeds the payment amount still available.');
    await tx.finance_occurrence_payment.upsert({ where: { occurrenceId_movementId: { occurrenceId: old.id, movementId: movement.id } }, create: { bookId, occurrenceId: old.id, movementId: movement.id, appliedMinor }, update: { appliedMinor } });
    const item = await tx.finance_occurrence.update({ where: { id: old.id }, data: { version: { increment: 1 } }, include: occurrenceInclude });
    await audit(tx, actor, bookId, 'occurrence', item.id, 'MATCH_PAYMENT', old, item);
    return wire(withPaymentTotals(item));
  });
}
export async function unmatchPayment(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(unmatchSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = await ensureOccurrence(tx, bookId, value);
    if (!old.payments.some(p => p.movementId === value.movementId)) throw new FinanceError(404, 'Payment link not found');
    await tx.finance_occurrence_payment.delete({ where: { occurrenceId_movementId: { occurrenceId: old.id, movementId: value.movementId } } });
    const item = await tx.finance_occurrence.update({ where: { id: old.id }, data: { version: { increment: 1 } }, include: occurrenceInclude });
    await audit(tx, actor, bookId, 'occurrence', item.id, 'UNMATCH_PAYMENT', old, item);
    return wire(withPaymentTotals(item));
  });
}
export async function setBudget(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(budgetSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    if ((await activeCategory(tx, bookId, value.categoryId)).kind !== 'EXPENSE') throw new FinanceError(422, 'Budgets can only be set for expense categories.');
    const amountMinor = amount(value.amount, book.currencyScale);
    if (amountMinor < 0n) throw new FinanceError(422, 'Budget amounts can’t be negative.');
    const key = { bookId, categoryId: value.categoryId, month: calendar(value.month) };
    const old = await tx.finance_budget.findUnique({ where: { bookId_categoryId_month: key } });
    checkVersion(old, value.expectedVersion);
    const item = await tx.finance_budget.upsert({ where: { bookId_categoryId_month: key }, create: { ...key, amountMinor }, update: { amountMinor, version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'budget', item.id, 'SET', old, item);
    return wire(item);
  });
}
export async function setEstimate(db: FinanceDb, actor: Actor, bookId: string, input: unknown) {
  const value = parse(estimateSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    if ((await activeCategory(tx, bookId, value.categoryId)).kind !== 'EXPENSE') throw new FinanceError(422, 'Spending estimates can only use expense categories.');
    const key = { bookId, categoryId: value.categoryId };
    const old = await tx.finance_spending_estimate.findUnique({ where: { bookId_categoryId: key } });
    checkVersion(old, value.expectedVersion);
    if (value.deleted) {
      if (!old) throw new FinanceError(404, 'Estimate not found');
      await tx.finance_spending_estimate.delete({ where: { id: old.id } });
      await audit(tx, actor, bookId, 'estimate', old.id, 'DELETE', old, null);
      return { deleted: true };
    }
    const item = await tx.finance_spending_estimate.upsert({ where: { bookId_categoryId: key }, create: { ...key, ...moneyRange(value, book.currencyScale) }, update: { ...moneyRange(value, book.currencyScale), version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'estimate', item.id, 'SET', old, item);
    return wire(item);
  });
}
