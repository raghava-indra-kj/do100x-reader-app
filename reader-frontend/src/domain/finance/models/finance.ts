import { z } from 'zod';

const id = z.string().uuid();
const minor = z.string().regex(/^-?\d+$/);
const timestamp = z.string();
const version = z.number().int().positive();
export const KindSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'ADJUSTMENT']);
export type TransactionKind = z.infer<typeof KindSchema>;
export type Frequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export const BookSchema = z.object({ id, name: z.string(), currency: z.string(), currencyScale: z.number().int().min(0).max(4), timezone: z.string(), version, archivedAt: timestamp.nullable(), createdAt: timestamp });
export type Book = z.infer<typeof BookSchema>;
export const AccountSchema = z.object({ id, name: z.string(), tracksDebt: z.boolean(), isLiquid: z.boolean(), notes: z.string().nullable(), version, archivedAt: timestamp.nullable() });
export type Account = z.infer<typeof AccountSchema>;
export const BalanceSchema = AccountSchema.extend({ postedMinor: minor, pendingMinor: minor, projectedMinor: minor, clearedMinor: minor });
export type Balance = z.infer<typeof BalanceSchema>;
export const CategorySchema = z.object({ id, name: z.string(), kind: z.enum(['INCOME', 'EXPENSE']), parentId: id.nullable(), version, archivedAt: timestamp.nullable() });
export type Category = z.infer<typeof CategorySchema>;
export const CatalogSchema = z.object({ book: BookSchema, accounts: z.array(AccountSchema), categories: z.array(CategorySchema) });
export type Catalog = z.infer<typeof CatalogSchema>;
export const MovementSchema = z.object({ id, accountId: id, amountMinor: minor, effectiveDate: timestamp, cleared: z.boolean(), reconciliationId: id.nullable(), payments: z.array(z.object({ occurrenceId: id, movementId: id, appliedMinor: minor })).default([]), sourceRecords: z.array(z.object({ id, sourceDescription: z.string() })).default([]) });
export type Movement = z.infer<typeof MovementSchema>;
export const TransactionSchema = z.object({ id, kind: KindSchema, status: z.enum(['PENDING', 'POSTED']), date: timestamp, description: z.string(), merchant: z.string().nullable(), paymentMethod: z.string().nullable(), bankReference: z.string().nullable(), notesMarkdown: z.string().nullable(), tags: z.array(z.string()), refundOfId: id.nullable(), version, source: z.string(), deletedAt: timestamp.nullable(), movements: z.array(MovementSchema), splits: z.array(z.object({ categoryId: id, amountMinor: minor })) });
export type Transaction = z.infer<typeof TransactionSchema>;
export const TransactionsSchema = z.object({ items: z.array(TransactionSchema), nextCursor: id.nullable() });
export type Transactions = z.infer<typeof TransactionsSchema>;
const range = { lowMinor: minor, expectedMinor: minor, highMinor: minor };
export const ScheduleSchema = z.object({ id, title: z.string(), kind: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']), accountId: id.nullable(), destinationAccountId: id.nullable(), categoryId: id.nullable(), frequency: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']), interval: z.number().int(), monthEnd: z.boolean(), startDate: timestamp, endDate: timestamp.nullable(), ...range, notesMarkdown: z.string().nullable(), paused: z.boolean(), archivedAt: timestamp.nullable(), version });
export type Schedule = z.infer<typeof ScheduleSchema>;
export const OccurrenceSchema = z.object({ id: id.nullable(), scheduleId: id, date: timestamp, title: z.string(), kind: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']), accountId: id.nullable(), destinationAccountId: id.nullable(), categoryId: id.nullable(), ...range, state: z.enum(['OPEN', 'SKIPPED']), version: z.number().int().nonnegative(), paidMinor: minor, remainingLowMinor: minor, remainingExpectedMinor: minor, remainingHighMinor: minor, overpaidMinor: minor, notesMarkdown: z.string().nullable(), payments: z.array(z.object({ movementId: id, appliedMinor: minor })).default([]) });
export type Occurrence = z.infer<typeof OccurrenceSchema>;
export const BudgetSchema = z.object({ id, categoryId: id, month: timestamp, amountMinor: minor, version });
export type Budget = z.infer<typeof BudgetSchema>;
export const EstimateSchema = z.object({ id, categoryId: id, ...range, version });
export type Estimate = z.infer<typeof EstimateSchema>;
export const PlansSchema = z.object({ schedules: z.array(ScheduleSchema), budgets: z.array(BudgetSchema), estimates: z.array(EstimateSchema) });
export type Plans = z.infer<typeof PlansSchema>;
export const ImportRowSchema = z.object({ id, position: z.number().int(), date: timestamp, amountMinor: minor, description: z.string(), externalId: z.string().nullable(), payload: z.record(z.string(), z.unknown()), decision: z.enum(['UNRESOLVED', 'NEW', 'MATCH', 'SKIP']), resolution: z.record(z.string(), z.unknown()).nullable(), candidateIds: z.array(id), committedMovementId: id.nullable() });
export type ImportRow = z.infer<typeof ImportRowSchema>;
export const ImportSchema = z.object({ id, accountId: id, sourceName: z.string(), status: z.enum(['DRAFT', 'COMMITTED', 'CANCELLED']), version, balanceVerified: z.boolean(), createdAt: timestamp, summary: z.object({ checks: z.record(z.string(), z.boolean().nullable()), calculatedCreditMinor: minor, calculatedDebitMinor: minor, rowCount: z.number(), warning: z.string() }).nullable(), rows: z.array(ImportRowSchema).default([]), candidates: z.array(z.object({ id, accountId: id, amountMinor: minor, effectiveDate: timestamp, transaction: z.object({ id, description: z.string(), status: z.string(), deletedAt: timestamp.nullable() }) })).default([]) });
export type ImportBatch = z.infer<typeof ImportSchema>;
export const ImportsSchema = z.object({ items: z.array(ImportSchema), nextCursor: id.nullable() });
export type Imports = z.infer<typeof ImportsSchema>;
export const RuleSchema = z.object({ id, categoryId: id, matchText: z.string(), merchantName: z.string().nullable(), enabled: z.boolean(), version });
export type Rule = z.infer<typeof RuleSchema>;
export const ChangeSchema = z.object({ id, createdAt: timestamp, source: z.string(), entityType: z.string(), entityId: id, action: z.string(), before: z.unknown(), after: z.unknown() });
export type Change = z.infer<typeof ChangeSchema>;
export const ChangesSchema = z.object({ items: z.array(ChangeSchema), nextCursor: id.nullable() });
export type Changes = z.infer<typeof ChangesSchema>;
export const ReconciliationSchema = z.object({ id, accountId: id, date: timestamp, statementMinor: minor, ledgerMinor: minor, notes: z.string().nullable(), version, reopenedAt: timestamp.nullable() });
export type Reconciliation = z.infer<typeof ReconciliationSchema>;
const totals = z.object({ incomeMinor: minor, expenseMinor: minor, refundMinor: minor, netSpendingMinor: minor, netIncomeMinor: minor, adjustmentMinor: minor });
const breakdown = z.array(z.object({ name: z.string(), amountMinor: minor }));
export const ReportSchema = z.object({ from: z.string(), to: z.string(), totals, cashFlow: z.object({ incomingMinor: minor, outgoingMinor: minor, adjustmentMinor: minor, netMinor: minor }), balances: z.array(BalanceSchema), categories: z.array(CategorySchema.extend({ directMinor: minor, rollupMinor: minor })), merchants: breakdown, paymentMethods: breakdown, unclassifiedIncomeMinor: minor, unclassifiedExpenseMinor: minor, budgetStatus: z.array(BudgetSchema.extend({ categoryName: z.string(), spentMinor: minor, remainingMinor: minor, partialMonth: z.boolean() })), pendingCount: z.number(), quality: z.object({ uncategorizedTransactionCount: z.number(), pendingCount: z.number(), unclearedMovementCount: z.number(), archivedAccountsWithBalance: z.array(id), unverifiedImportCount: z.number() }), comparison: z.object({ from: z.string(), to: z.string(), totals, incomeChangeMinor: minor, spendingChangeMinor: minor }).nullable(), warnings: z.array(z.string()) });
export type Report = z.infer<typeof ReportSchema>;
export const ForecastSchema = z.object({ asOf: z.string(), timeline: z.array(z.object({ date: z.string(), ...range, events: z.array(z.object({ title: z.string(), source: z.string(), overdue: z.boolean().optional() })), accounts: z.array(z.object({ accountId: z.string(), ...range })) })), firstNegativeExpectedDate: z.string().nullable(), firstNegativeLowDate: z.string().nullable(), scenarios: z.string(), warnings: z.array(z.string()), overdue: z.array(OccurrenceSchema) });
export type Forecast = z.infer<typeof ForecastSchema>;
export const SuggestionsSchema = z.object({ from: z.string(), to: z.string(), estimates: z.array(z.object({ categoryId: id, categoryName: z.string(), ...range, monthlyMinor: z.array(minor), monthsWithRecordedSpend: z.number() })), recurring: z.array(z.object({ title: z.string(), accountId: id, categoryId: id.nullable(), frequency: z.enum(['DAILY', 'MONTHLY']), interval: z.number(), anchorDate: z.string(), lastRecordedDate: z.string(), ...range, transactionIds: z.array(id), reason: z.string() })), warnings: z.array(z.string()) });
export type Suggestions = z.infer<typeof SuggestionsSchema>;
export const ExportSchema = z.object({ filename: z.string(), mime: z.string(), content: z.string() });
export type FinanceExport = z.infer<typeof ExportSchema>;

export interface CreateBook { requestKey: string; name: string; currency: string; timezone: string; starterCategories: boolean }
export interface UpdateBook { expectedVersion: number; name?: string; timezone?: string; archived?: boolean }
export interface CreateAccount { requestKey: string; name: string; tracksDebt: boolean; isLiquid: boolean; notes?: string | null; openingAmount: string; openingDate: string }
export interface UpdateAccount { expectedVersion: number; name?: string; tracksDebt?: boolean; isLiquid?: boolean; notes?: string | null; archived?: boolean }
export interface CreateCategory { requestKey: string; name: string; kind: 'INCOME' | 'EXPENSE'; parentId?: string | null }
export interface UpdateCategory { expectedVersion: number; name?: string; parentId?: string | null; archived?: boolean }
export interface TransactionFields { kind: TransactionKind; status: 'PENDING' | 'POSTED'; date: string; description: string; merchant?: string | null; paymentMethod?: string | null; bankReference?: string | null; notesMarkdown?: string | null; tags?: string[]; refundOfId?: string | null; movements: { accountId: string; amount: string; effectiveDate?: string; cleared: boolean }[]; splits: { categoryId: string; amount: string }[] }
export type CreateTransaction = TransactionFields & { requestKey: string };
export type UpdateTransaction = TransactionFields & { expectedVersion: number };
export interface TransactionQuery { from?: string; to?: string; accountId?: string; categoryId?: string; kind?: TransactionKind; paymentMethod?: string; search?: string; status?: 'PENDING' | 'POSTED'; deleted?: boolean; cursor?: string; take?: number }
export interface ScheduleFields { title: string; kind: 'INCOME' | 'EXPENSE' | 'TRANSFER'; accountId?: string | null; destinationAccountId?: string | null; categoryId?: string | null; frequency: Frequency; interval: number; monthEnd: boolean; startDate: string; endDate?: string | null; low: string; expected: string; high: string; notesMarkdown?: string | null; paused: boolean }
export type CreateSchedule = ScheduleFields & { requestKey: string };
export type UpdateSchedule = ScheduleFields & { expectedVersion: number; archived?: boolean };
export interface OccurrenceTarget { scheduleId: string; date: string; expectedVersion: number }
export type UpdateOccurrence = OccurrenceTarget & { state?: 'OPEN' | 'SKIPPED'; title?: string; low?: string; expected?: string; high?: string; notesMarkdown?: string | null };
export type MatchPayment = OccurrenceTarget & { movementId: string; amount: string };
export interface SetBudget { categoryId: string; month: string; amount: string; expectedVersion: number }
export interface SetEstimate { categoryId: string; low: string; expected: string; high: string; expectedVersion: number; deleted?: boolean }
export interface SetRule { id: string; categoryId: string; matchText: string; merchantName?: string | null; enabled: boolean; expectedVersion: number }
export interface StatementRow { date: string; amount: string; description: string; externalId?: string | null; merchant?: string | null; paymentMethod?: string | null; bankReference?: string | null; categoryId?: string | null; kind?: 'INCOME' | 'EXPENSE' | 'REFUND' | 'TRANSFER'; destinationAccountId?: string | null; refundOfId?: string | null; sourceLocator?: string | null; sourceFields?: Record<string, string> }
export interface StatementMetadata { requestKey: string; accountId: string; sourceName: string; periodStart?: string | null; periodEnd?: string | null; openingBalance?: string | null; closingBalance?: string | null; totalCredits?: string | null; totalDebits?: string | null; expectedRowCount?: number }
export type StageStatement = StatementMetadata & { rows: StatementRow[]; fileHash?: string | null };
export type StageCsv = StatementMetadata & { csv: string; separator: ',' | ';' | '\t'; mapping: { date: string; description: string; amount?: string; credit?: string; debit?: string; externalId?: string; merchant?: string; paymentMethod?: string; bankReference?: string; dateFormat: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD/MM/YYYY'; stripGrouping: boolean } };
export interface RowResolution { rowId: string; decision: 'NEW' | 'MATCH' | 'SKIP'; matchMovementId?: string; categoryId?: string | null; kind?: 'INCOME' | 'EXPENSE' | 'REFUND' | 'TRANSFER'; destinationAccountId?: string | null; refundOfId?: string | null; merchant?: string | null; forceNew?: boolean }
