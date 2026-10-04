import { z } from 'zod';
import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { apiClient, getApiErrorMessage } from '@core/api/api-client';
import { AppError } from '@core/errors/app-error';
import * as F from '../models/finance';
import type { IFinanceRepo } from './finance-repo';

const base = (bookId: string) => `/finance/books/${encodeURIComponent(bookId)}`;
/** One transport boundary; all responses are checked before reaching UI state. */
export class FinanceRepoApi implements IFinanceRepo {
  private async request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, schema: z.ZodType<T>, data?: unknown, params?: unknown): AsyncResult<T, AppError> {
    try { return ok(schema.parse((await apiClient.request({ method, url, data, params })).data)); }
    catch (cause) { return err(new AppError({ message: getApiErrorMessage(cause, 'Couldn’t complete this request. Try again.'), cause })); }
  }
  books() { return this.request('GET', '/finance/books', z.array(F.BookSchema)); }
  catalog(bookId: string) { return this.request('GET', `${base(bookId)}/catalog`, F.CatalogSchema); }
  balances(bookId: string) { return this.request('GET', `${base(bookId)}/balances`, z.array(F.BalanceSchema)); }
  transactions(bookId: string, query: F.TransactionQuery) { return this.request('GET', `${base(bookId)}/transactions`, F.TransactionsSchema, undefined, query); }
  transaction(bookId: string, id: string) { return this.request('GET', `${base(bookId)}/transactions/${id}`, F.TransactionSchema); }
  plans(bookId: string) { return this.request('GET', `${base(bookId)}/plans`, F.PlansSchema); }
  occurrences(bookId: string, from: string, to: string) { return this.request('GET', `${base(bookId)}/occurrences`, z.array(F.OccurrenceSchema), undefined, { from, to }); }
  imports(bookId: string, cursor?: string) { return this.request('GET', `${base(bookId)}/imports`, F.ImportsSchema, undefined, { cursor }); }
  importBatch(bookId: string, id: string) { return this.request('GET', `${base(bookId)}/imports/${id}`, F.ImportSchema); }
  rules(bookId: string) { return this.request('GET', `${base(bookId)}/rules`, z.array(F.RuleSchema)); }
  changes(bookId: string, cursor?: string) { return this.request('GET', `${base(bookId)}/changes`, F.ChangesSchema, undefined, { cursor }); }
  reconciliations(bookId: string) { return this.request('GET', `${base(bookId)}/reconciliations`, z.array(F.ReconciliationSchema)); }
  report(bookId: string, from: string, to: string) { return this.request('POST', `${base(bookId)}/report`, F.ReportSchema, { from, to }); }
  forecast(bookId: string, to: string) { return this.request('GET', `${base(bookId)}/forecast`, F.ForecastSchema, undefined, { to }); }
  suggestions(bookId: string) { return this.request('GET', `${base(bookId)}/suggestions`, F.SuggestionsSchema); }
  export(bookId: string, input: { format: 'JSON' | 'CSV'; from?: string; to?: string; includeDeleted?: boolean }) { return this.request('POST', `${base(bookId)}/export`, F.ExportSchema, input); }
  createBook(input: F.CreateBook) { return this.request('POST', '/finance/books', F.BookSchema, input); }
  updateBook(bookId: string, input: F.UpdateBook) { return this.request('PATCH', base(bookId), F.BookSchema, input); }
  createAccount(bookId: string, input: F.CreateAccount) { return this.request('POST', `${base(bookId)}/accounts`, F.AccountSchema, input); }
  updateAccount(bookId: string, id: string, input: F.UpdateAccount) { return this.request('PATCH', `${base(bookId)}/accounts/${id}`, F.AccountSchema, input); }
  createCategory(bookId: string, input: F.CreateCategory) { return this.request('POST', `${base(bookId)}/categories`, F.CategorySchema, input); }
  updateCategory(bookId: string, id: string, input: F.UpdateCategory) { return this.request('PATCH', `${base(bookId)}/categories/${id}`, F.CategorySchema, input); }
  createTransaction(bookId: string, input: F.CreateTransaction) { return this.request('POST', `${base(bookId)}/transactions`, F.TransactionSchema, input); }
  updateTransaction(bookId: string, id: string, input: F.UpdateTransaction) { return this.request('PUT', `${base(bookId)}/transactions/${id}`, F.TransactionSchema, input); }
  setDeleted(bookId: string, id: string, expectedVersion: number, deleted: boolean) { return this.request('PATCH', `${base(bookId)}/transactions/${id}/deletion`, F.TransactionSchema, { expectedVersion, deleted }); }
  bulkCategorize(bookId: string, categoryId: string, items: { id: string; expectedVersion: number }[]) { return this.request('POST', `${base(bookId)}/transactions/categorize`, z.array(F.TransactionSchema), { categoryId, items }); }
  createSchedule(bookId: string, input: F.CreateSchedule) { return this.request('POST', `${base(bookId)}/schedules`, F.ScheduleSchema, input); }
  updateSchedule(bookId: string, id: string, input: F.UpdateSchedule) { return this.request('PUT', `${base(bookId)}/schedules/${id}`, F.ScheduleSchema, input); }
  updateOccurrence(bookId: string, input: F.UpdateOccurrence) { return this.request('PATCH', `${base(bookId)}/occurrences`, F.OccurrenceSchema, input); }
  matchPayment(bookId: string, input: F.MatchPayment) { return this.request('POST', `${base(bookId)}/occurrences/payments`, F.OccurrenceSchema, input); }
  unmatchPayment(bookId: string, input: F.OccurrenceTarget & { movementId: string }) { return this.request('POST', `${base(bookId)}/occurrences/payments/remove`, F.OccurrenceSchema, input); }
  setBudget(bookId: string, input: F.SetBudget) { return this.request('PUT', `${base(bookId)}/budgets`, F.BudgetSchema, input); }
  setEstimate(bookId: string, input: F.SetEstimate) { return this.request('PUT', `${base(bookId)}/estimates`, z.union([F.EstimateSchema, z.object({ deleted: z.literal(true) })]), input); }
  setRule(bookId: string, input: F.SetRule) { return this.request('PUT', `${base(bookId)}/rules`, F.RuleSchema, input); }
  stageStatement(bookId: string, input: F.StageStatement) { return this.request('POST', `${base(bookId)}/imports`, F.ImportSchema, input); }
  stageCsv(bookId: string, input: F.StageCsv) { return this.request('POST', `${base(bookId)}/imports/csv`, F.ImportSchema, input); }
  resolveImport(bookId: string, id: string, expectedVersion: number, rows: F.RowResolution[]) { return this.request('PATCH', `${base(bookId)}/imports/${id}`, F.ImportSchema, { expectedVersion, rows }); }
  commitImport(bookId: string, id: string, expectedVersion: number, acceptUnverified: boolean) { return this.request('POST', `${base(bookId)}/imports/${id}/commit`, F.ImportSchema, { expectedVersion, acceptUnverified }); }
  cancelImport(bookId: string, id: string, expectedVersion: number) { return this.request('POST', `${base(bookId)}/imports/${id}/cancel`, F.ImportSchema, { expectedVersion }); }
  reconcile(bookId: string, input: { accountId: string; date: string; statementBalance: string; notes?: string }) { return this.request('POST', `${base(bookId)}/reconciliations`, F.ReconciliationSchema, input); }
  reopen(bookId: string, id: string, expectedVersion: number, reason: string) { return this.request('POST', `${base(bookId)}/reconciliations/${id}/reopen`, z.object({ reopenedIds: z.array(z.string().uuid()) }), { expectedVersion, reason }); }
}
