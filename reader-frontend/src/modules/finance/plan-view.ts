import type { Occurrence, Schedule } from '@domain/finance/models/finance';
import { shortDate } from './format';

export type BillStatus = 'overdue' | 'partial' | 'review' | 'paid' | 'upcoming' | 'skipped';
export type BillFilter = 'all' | 'unpaid' | BillStatus;
export const billStatusLabels: Record<BillStatus, string> = {
  overdue: 'Overdue', partial: 'Partially paid', review: 'Confirm amount',
  paid: 'Paid', upcoming: 'Upcoming', skipped: 'Skipped',
};
export function billStatus(item: Occurrence, today: string): BillStatus {
  if (item.state === 'SKIPPED') return 'skipped';
  if (BigInt(item.remainingHighMinor) === 0n) return 'paid';
  if (BigInt(item.paidMinor) > 0n && BigInt(item.remainingExpectedMinor) === 0n) return 'review';
  if (shortDate(item.date) < today) return 'overdue';
  if (BigInt(item.paidMinor) > 0n) return 'partial';
  return 'upcoming';
}
export function matchesBillStatus(item: Occurrence, filter: BillFilter, today: string) {
  const status = billStatus(item, today);
  if (filter === 'all') return true;
  if (filter === 'unpaid') return !['paid', 'skipped'].includes(status);
  if (filter === 'partial') return BigInt(item.paidMinor) > 0n && BigInt(item.remainingExpectedMinor) > 0n && item.state !== 'SKIPPED';
  return status === filter;
}
export function billSummary(items: Occurrence[], today: string) {
  const open = items.filter(item => matchesBillStatus(item, 'unpaid', today));
  const sum = (list: Occurrence[]) => list.reduce((total, item) => total + BigInt(item.remainingExpectedMinor), 0n);
  return {
    expense: sum(open.filter(item => item.kind === 'EXPENSE')),
    income: sum(open.filter(item => item.kind === 'INCOME')),
    overdue: open.filter(item => billStatus(item, today) === 'overdue').length,
    settled: items.filter(item => billStatus(item, today) === 'paid').length,
  };
}
export function compareBills(a: Occurrence, b: Occurrence, today: string, sort: string) {
  const dateOrder = shortDate(a.date).localeCompare(shortDate(b.date)) || a.title.localeCompare(b.title);
  if (sort === 'amount') {
    const difference = BigInt(b.remainingExpectedMinor) - BigInt(a.remainingExpectedMinor);
    return difference > 0n ? 1 : difference < 0n ? -1 : dateOrder;
  }
  if (sort === 'attention') {
    const rank: Record<BillStatus, number> = { overdue: 0, review: 1, partial: 2, upcoming: 3, paid: 4, skipped: 5 };
    return rank[billStatus(a, today)] - rank[billStatus(b, today)] || dateOrder;
  }
  return dateOrder;
}
export function scheduleStatus(item: Schedule, today: string) {
  if (item.archivedAt) return 'archived';
  if (item.paused) return 'paused';
  if (item.endDate && shortDate(item.endDate) < today || item.frequency === 'ONCE' && shortDate(item.startDate) < today) return 'ended';
  return 'active';
}
export function scheduleFrequency(item: Schedule) {
  if (item.frequency === 'ONCE') return 'One-off';
  const unit = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[item.frequency];
  return item.interval === 1 ? `Every ${unit}` : `Every ${item.interval} ${unit}s`;
}
