import { describe, expect, it, vi } from 'vitest';
import { ok, err } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import type { IFinanceRepo } from '@domain/finance/repos/finance-repo';
import type { Book, Catalog } from '@domain/finance/models/finance';
import { amountRangeLabels, auditActionLabels, csvColumnLabels, importDecisionLabels, importStatusLabels, moneyLabel, occurrenceLabel, transactionKindLabels } from './format';
import { simpleMovements } from './transaction-draft';
vi.mock('@di/container', () => ({ container: { get: vi.fn() }, TYPES: {} }));
import { FinanceStore } from './store';

const book = (id: string): Book => ({ id, name: id, currency: 'INR', currencyScale: 2, timezone: 'Asia/Kolkata', version: 1, archivedAt: null, createdAt: '2026-10-04T00:00:00Z' });
const catalog = (id: string): Catalog => ({ book: book(id), accounts: [], categories: [] });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const repo = { books: vi.fn(async () => ok([book('A'), book('B')])), catalog: vi.fn(async (id: string) => ok(catalog(id))), balances: vi.fn(async () => ok([])) };
  const store = new FinanceStore(repo as unknown as IFinanceRepo); store.tab = 'accounts'; return { repo, store };
}
describe('Finance exact display and drafts', () => {
  it('groups large amounts without precision loss', () => expect(moneyLabel('900719925474099312', book('A'))).toBe('₹9,00,71,99,25,47,40,993.12'));
  it('creates opposite transfer movements, not spending', () => expect(simpleMovements('TRANSFER', '125.50', 'bank', 'cash', '2026-10-04', true, 2).map(m => m.amount)).toEqual(['-125.50', '125.50']));
  it('keeps correction signs and rejects excess currency precision', () => { expect(simpleMovements('ADJUSTMENT', '-0.01', 'cash', '', '2026-10-04', false, 2)[0].amount).toBe('-0.01'); expect(() => simpleMovements('EXPENSE', '1.001', 'cash', '', '2026-10-04', false, 2)).toThrow(); });
  it('does not accept negative expense or zero transfer drafts', () => { expect(() => simpleMovements('EXPENSE', '-5', 'cash', '', '2026-10-04', false, 2)).toThrow(); expect(() => simpleMovements('TRANSFER', '0', 'bank', 'cash', '2026-10-04', false, 2)).toThrow(); });
  it('presents a fully paid bill as paid without changing its stored OPEN state', () => expect(occurrenceLabel({ state: 'OPEN', date: '2026-10-01', paidMinor: '12550', remainingExpectedMinor: '0', remainingHighMinor: '0' }, '2026-10-04')).toBe('Paid'));
  it('asks to confirm an uncertain final bill after expected payment', () => expect(occurrenceLabel({ state: 'OPEN', date: '2026-10-01', paidMinor: '30000', remainingExpectedMinor: '0', remainingHighMinor: '10000' }, '2026-10-04')).toBe('Expected amount paid. Confirm the final bill.'));
  it('uses readable labels without renaming finance data values', () => {
    expect(transactionKindLabels.ADJUSTMENT).toBe('Balance correction');
    expect(transactionKindLabels.REFUND).toBe('Expense refund');
    expect(importStatusLabels.COMMITTED).toBe('Imported');
    expect(importDecisionLabels.UNRESOLVED).toBe('Needs review');
    expect(importDecisionLabels.NEW).toBe('Add');
    expect(amountRangeLabels.expected).toBe('Expected estimate');
    expect(csvColumnLabels.externalId).toBe('Bank transaction ID column (optional)');
    expect(csvColumnLabels.paymentMethod).toBe('Payment method column (optional)');
    expect(auditActionLabels.STAGE).toBe('Prepared import');
  });
});
describe('Finance page state lifecycle', () => {
  it('ignores a stale book response after a switch', async () => {
    const { repo, store } = fixture(); store.start(); await vi.waitFor(() => expect(store.catalog?.book.id).toBe('A'));
    const old = deferred<ReturnType<typeof ok<Catalog>>>(); repo.catalog.mockImplementationOnce(() => old.promise);
    const request = store.selectBook('A'); await store.selectBook('B'); old.resolve(ok(catalog('A'))); await request;
    expect(store.bookId).toBe('B'); expect(store.catalog?.book.id).toBe('B'); store.destroy();
  });
  it('clears import drafts and financial state on a book switch', async () => {
    const { store } = fixture(); store.start(); await vi.waitFor(() => expect(store.catalog).not.toBeNull());
    store.notice = 'Saved'; store.reportFrom = '2020-01-01'; store.rules = [{ id: 'old-rule', categoryId: 'old-category', matchText: 'old', merchantName: null, enabled: true, version: 1 }];
    await store.selectBook('B'); expect(store.rules).toEqual([]); expect(store.selectedImport).toBeNull(); expect(store.reportFrom).not.toBe('2020-01-01'); store.destroy();
  });
  it('never publishes a late response after disposal', async () => {
    const { repo, store } = fixture(), old = deferred<ReturnType<typeof ok<Book[]>>>(); repo.books.mockImplementationOnce(() => old.promise);
    store.start(); store.destroy(); old.resolve(ok([book('private')])); await old.promise; await Promise.resolve(); expect(store.books).toEqual([]);
  });
  it('survives Strict Mode start/destroy/start', async () => {
    const { repo, store } = fixture(), old = deferred<ReturnType<typeof ok<Book[]>>>(); repo.books.mockImplementationOnce(() => old.promise);
    store.start(); store.destroy(); store.start(); await vi.waitFor(() => expect(store.catalog?.book.id).toBe('A')); old.resolve(ok([book('stale')])); await old.promise; await Promise.resolve(); expect(store.books[0].id).toBe('A'); store.destroy();
  });
  it('preserves the API error and prevents overlapping writes', async () => {
    const { store } = fixture(); store.start(); await vi.waitFor(() => expect(store.catalog).not.toBeNull());
    const pending = deferred<ReturnType<typeof err<AppError>>>(); const op = vi.fn(() => pending.promise);
    const first = store.mutate(op); expect(await store.mutate(op)).toBeNull(); expect(op).toHaveBeenCalledTimes(1);
    pending.resolve(err(new AppError({ message: 'Record changed; refresh' }))); expect(await first).toBeNull(); expect(store.error).toBe('Record changed; refresh'); expect(store.busy).toBe(false); store.destroy();
  });
});
