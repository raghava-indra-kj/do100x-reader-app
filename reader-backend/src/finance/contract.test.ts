import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { accountSchema, bookSchema, FinanceError, moneyRange, parse, querySchema, transactionFields } from './contract';
import { validateLedger } from './ledger-validation';

const cash = { id: randomUUID(), archivedAt: null };
const bank = { id: randomUUID(), archivedAt: null };
const debt = { id: randomUUID(), archivedAt: null };
const expense = { id: randomUUID(), kind: 'EXPENSE' as const, archivedAt: null };
const income = { id: randomUUID(), kind: 'INCOME' as const, archivedAt: null };
const accounts = [cash, bank, debt], categories = [expense, income];
const base = { kind: 'EXPENSE', date: '2026-10-04', description: 'Purchase', movements: [{ accountId: cash.id, amount: '-20.00' }], splits: [{ categoryId: expense.id, amount: '20.00' }] };
const ledger = (patch: object = {}) => validateLedger(parse(transactionFields, { ...base, ...patch }), 2, accounts, categories);

describe('Finance contracts', () => {
  it('permits free-form account names, not only listed banks', () => {
    expect(parse(accountSchema, { requestKey: randomUUID(), name: 'Money in the blue envelope', openingDate: '2026-10-04' }).name).toBe('Money in the blue envelope');
  });
  it('rejects malformed money, invalid book timezone and submitted ownership', () => {
    expect(() => parse(transactionFields, { ...base, movements: [{ accountId: cash.id, amount: 20 }] })).toThrow();
    expect(() => parse(bookSchema, { requestKey: randomUUID(), name: 'Personal', timezone: 'Unknown/Nowhere' })).toThrow();
    expect(() => parse(bookSchema, { requestKey: randomUUID(), name: 'Personal', timezone: 'UTC', userId: randomUUID() })).toThrow();
  });
  it('parses false query parameters correctly', () => {
    expect(parse(querySchema, { deleted: 'false' }).deleted).toBe(false);
    expect(parse(querySchema, { deleted: 'true' }).deleted).toBe(true);
  });
  it('names the invalid field and retains validation details', () => {
    try {
      parse(transactionFields, { ...base, movements: [{ accountId: cash.id, amount: 20 }] });
      expect.fail('Expected invalid money to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(FinanceError);
      const failure = error as FinanceError;
      expect(failure.status).toBe(422);
      expect(failure.message).toContain('Check movements → item 1 → amount.');
      expect(failure.details).toBeDefined();
    }
  });
  it('requires ordered nonnegative forecast ranges', () => {
    expect(moneyRange({ low: '200', expected: '300', high: '400' }, 2)).toEqual({ lowMinor: 20000n, expectedMinor: 30000n, highMinor: 40000n });
    expect(() => moneyRange({ low: '400', expected: '300', high: '200' }, 2)).toThrow();
  });
});

describe('ledger conservation and classifications', () => {
  it('counts expenses exactly and leaves uncategorized remainder visible', () => {
    expect(ledger().netMinor).toBe(-2000n);
    expect(ledger({ splits: [] }).uncategorizedMinor).toBe(2000n);
    expect(ledger({ splits: [{ categoryId: expense.id, amount: '5.00' }] }).uncategorizedMinor).toBe(1500n);
  });
  it('balances bank/cash and credit card payment transfers without spending', () => {
    expect(ledger({ kind: 'TRANSFER', movements: [{ accountId: bank.id, amount: '-20' }, { accountId: cash.id, amount: '20' }], splits: [] }).netMinor).toBe(0n);
    expect(ledger({ kind: 'TRANSFER', movements: [{ accountId: bank.id, amount: '-20' }, { accountId: debt.id, amount: '20' }], splits: [] }).netMinor).toBe(0n);
  });
  it('supports loan principal transfer and interest expense in one payment', () => {
    expect(ledger({ movements: [{ accountId: bank.id, amount: '-5500' }, { accountId: debt.id, amount: '5000' }], splits: [{ categoryId: expense.id, amount: '500' }] }).netMinor).toBe(-50000n);
  });
  it('records refunds as negative expenses and opening corrections without income', () => {
    expect(ledger({ kind: 'REFUND', movements: [{ accountId: cash.id, amount: '20' }], splits: [{ categoryId: expense.id, amount: '-20' }] }).uncategorizedMinor).toBe(0n);
    expect(ledger({ kind: 'ADJUSTMENT', movements: [{ accountId: debt.id, amount: '-1000' }], splits: [] }).netMinor).toBe(-100000n);
  });
  it.each([
    { movements: [{ accountId: randomUUID(), amount: '-20' }] },
    { movements: [{ accountId: cash.id, amount: '-10' }, { accountId: cash.id, amount: '-10' }] },
    { movements: [{ accountId: cash.id, amount: '0' }] },
    { splits: [{ categoryId: expense.id, amount: '21' }] },
    { splits: [{ categoryId: income.id, amount: '20' }] },
    { kind: 'TRANSFER', movements: [{ accountId: bank.id, amount: '-20' }, { accountId: cash.id, amount: '19' }], splits: [] },
    { kind: 'INCOME' },
    { refundOfId: randomUUID() },
  ])('rejects unsafe ledger input: %j', patch => expect(() => ledger(patch)).toThrow());
});
