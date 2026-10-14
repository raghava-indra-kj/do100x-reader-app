import { describe, expect, it } from 'vitest';
import type { Occurrence, Schedule } from '@domain/finance/models/finance';
import { billStatus, billSummary, compareBills, matchesBillStatus, scheduleFrequency, scheduleStatus } from './plan-view';

const today = '2026-10-14';
const bill = (patch: Partial<Occurrence> = {}): Occurrence => ({ id: null, scheduleId: 'plan', date: '2026-10-04', title: 'Bill', kind: 'EXPENSE', state: 'OPEN', accountId: null, destinationAccountId: null, categoryId: null, lowMinor: '10000', expectedMinor: '10000', highMinor: '10000', remainingLowMinor: '10000', remainingExpectedMinor: '10000', remainingHighMinor: '10000', paidMinor: '0', overpaidMinor: '0', notesMarkdown: null, payments: [], version: 0, ...patch });
describe('Bill presentation and filters', () => {
  it('keeps partially paid overdue items in both relevant filters', () => {
    const item = bill({ paidMinor: '1000', remainingExpectedMinor: '9000', remainingHighMinor: '9000' });
    expect(billStatus(item, today)).toBe('overdue');
    expect(matchesBillStatus(item, 'partial', today)).toBe(true);
    expect(matchesBillStatus(item, 'overdue', today)).toBe(true);
  });
  it('never marks expected-only coverage as settled while an estimate remains', () => {
    const item = bill({ paidMinor: '10000', remainingExpectedMinor: '0', remainingHighMinor: '2000' });
    expect(billStatus(item, today)).toBe('review');
    expect(matchesBillStatus(item, 'unpaid', today)).toBe(true);
    expect(matchesBillStatus(item, 'paid', today)).toBe(false);
  });
  it('excludes skipped and settled items from unpaid, including zero-value items', () => {
    expect(matchesBillStatus(bill({ state: 'SKIPPED' }), 'unpaid', today)).toBe(false);
    expect(matchesBillStatus(bill({ remainingExpectedMinor: '0', remainingHighMinor: '0' }), 'unpaid', today)).toBe(false);
    expect(billStatus(bill({ date: `${today}T00:00:00Z` }), today)).toBe('upcoming');
  });
  it('separates income and expenses without adding transfers or skipped bills', () => {
    expect(billSummary([bill(), bill({ kind: 'INCOME', remainingExpectedMinor: '900719925474099312' }), bill({ kind: 'TRANSFER' }), bill({ state: 'SKIPPED' }), bill({ remainingExpectedMinor: '0', remainingHighMinor: '0', paidMinor: '10000' })], today)).toEqual({ expense: 10000n, income: 900719925474099312n, overdue: 3, settled: 1 });
  });
  it('sorts by attention before date and compares large amounts exactly', () => {
    const paid = bill({ remainingExpectedMinor: '0', remainingHighMinor: '0' });
    const overdue = bill({ date: '2026-10-10' });
    expect([paid, overdue].sort((a, b) => compareBills(a, b, today, 'attention'))[0]).toBe(overdue);
    expect(compareBills(bill({ remainingExpectedMinor: '900719925474099312' }), bill({ remainingExpectedMinor: '900719925474099313' }), today, 'amount')).toBe(1);
  });
});
describe('Plan presentation', () => {
  const plan = { frequency: 'MONTHLY', interval: 2, startDate: '2026-10-01', endDate: null, paused: false, archivedAt: null } as Schedule;
  it('labels cadence and lifecycle without implying historical bills are paid', () => {
    expect(scheduleFrequency(plan)).toBe('Every 2 months');
    expect(scheduleFrequency({ ...plan, frequency: 'ONCE' })).toBe('One-off');
    expect(scheduleStatus(plan, today)).toBe('active');
    expect(scheduleStatus({ ...plan, endDate: '2026-10-10' }, today)).toBe('ended');
    expect(scheduleStatus({ ...plan, paused: true }, today)).toBe('paused');
    expect(scheduleStatus({ ...plan, paused: true, archivedAt: today }, today)).toBe('archived');
  });
});
