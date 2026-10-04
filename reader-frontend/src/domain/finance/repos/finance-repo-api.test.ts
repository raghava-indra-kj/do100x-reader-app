import { expect, it, vi } from 'vitest';
import { FinanceRepoApi } from './finance-repo-api';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@core/api/api-client', () => ({ apiClient: { request }, getApiErrorMessage: (_cause: unknown, fallback: string) => fallback }));
it('rejects malformed server money instead of silently rendering a rounded amount', async () => { request.mockResolvedValueOnce({ data: [{ id: 'not-a-uuid', postedMinor: 12.5 }] }); const result = await new FinanceRepoApi().balances('book'); expect(result.ok).toBe(false); });
it('passes decimal strings, versions and request keys without submitting a user identity', async () => {
  request.mockResolvedValueOnce({ data: {} });
  const payload = { requestKey: 'retry', kind: 'EXPENSE' as const, status: 'POSTED' as const, date: '2026-10-04', description: 'Expense', movements: [{ accountId: 'account', amount: '-900719925474099.12', cleared: false }], splits: [] };
  await new FinanceRepoApi().createTransaction('book', payload);
  expect(request).toHaveBeenLastCalledWith({ method: 'POST', url: '/finance/books/book/transactions', data: payload, params: undefined });
  expect(JSON.stringify(request.mock.lastCall)).not.toContain('userId');
});
