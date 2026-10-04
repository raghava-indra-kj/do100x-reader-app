import { formatMoney, sumMoney } from '@reader/finance-core';
import type { Book, ImportBatch, ImportRow, Occurrence, Transaction } from '@domain/finance/models/finance';

export function moneyLabel(value: string | bigint, book: Pick<Book, 'currency' | 'currencyScale'>): string {
  const decimal = formatMoney(value, book.currencyScale);
  const negative = decimal.startsWith('-');
  const [whole, fraction] = decimal.replace(/^-/, '').split('.');
  const integer = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(BigInt(whole));
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: book.currency }).formatToParts(0).find(part => part.type === 'currency')?.value ?? book.currency;
  return `${negative ? '-' : ''}${currency}${integer}${fraction === undefined ? '' : `.${fraction}`}`;
}
export function transactionNet(transaction: Transaction) { return sumMoney(transaction.movements.map(movement => BigInt(movement.amountMinor))); }
export function shortDate(value: string) { return value.slice(0, 10); }
export function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(); }

// Presentation labels only. Stored values and import mappings remain unchanged.
export const transactionKindLabels: Record<Transaction['kind'], string> = {
  INCOME: 'Income', EXPENSE: 'Expense', TRANSFER: 'Transfer',
  REFUND: 'Expense refund', ADJUSTMENT: 'Balance correction',
};
export const importStatusLabels: Record<ImportBatch['status'], string> = {
  DRAFT: 'Draft', COMMITTED: 'Imported', CANCELLED: 'Cancelled',
};
export const importDecisionLabels: Record<ImportRow['decision'], string> = {
  UNRESOLVED: 'Needs review', NEW: 'Add', MATCH: 'Match', SKIP: 'Skip',
};
export const amountRangeLabels = { low: 'Low estimate', expected: 'Expected estimate', high: 'High estimate' };
export const csvColumnLabels: Record<string, string> = {
  date: 'Date column', description: 'Description column', amount: 'Amount column',
  credit: 'Credit column', debit: 'Debit column', externalId: 'Bank transaction ID column (optional)',
  merchant: 'Merchant column (optional)', paymentMethod: 'Payment method column (optional)',
  bankReference: 'Bank reference column (optional)',
};
export const importCheckLabels: Record<string, string> = { rowCount: 'Row count', credits: 'Credits', debits: 'Debits', balance: 'Balance' };
export const auditActionLabels: Record<string, string> = {
  CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', RESTORE: 'Restored', SET: 'Set',
  OPENING_BALANCE: 'Recorded opening balance', REOPEN: 'Reopened',
  MATCH_PAYMENT: 'Linked payment', UNMATCH_PAYMENT: 'Unlinked payment',
  STAGE: 'Prepared import', RESOLVE: 'Reviewed import', COMMIT: 'Imported', CANCEL: 'Cancelled',
};
export const auditEntityLabels: Record<string, string> = {
  book: 'book', account: 'account', category: 'category', transaction: 'transaction',
  schedule: 'plan', occurrence: 'bill', budget: 'budget', estimate: 'spending estimate',
  rule: 'categorization rule', reconciliation: 'account period', import: 'statement',
};
export const auditSourceLabels: Record<string, string> = { HTTP: 'App', MCP: 'MCP', IMPORT: 'Import', SYSTEM: 'System' };
export function occurrenceLabel(item: Pick<Occurrence, 'state' | 'date' | 'paidMinor' | 'remainingExpectedMinor' | 'remainingHighMinor'>, today: string) {
  if (item.state === 'SKIPPED') return 'Skipped';
  if (BigInt(item.paidMinor) > 0n) {
    if (BigInt(item.remainingHighMinor) === 0n) return 'Paid';
    if (BigInt(item.remainingExpectedMinor) === 0n) return 'Expected amount paid. Confirm the final bill.';
    return 'Partially paid';
  }
  return shortDate(item.date) < today && BigInt(item.remainingHighMinor) > 0n ? 'Overdue' : 'Open';
}
export function downloadExport(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
