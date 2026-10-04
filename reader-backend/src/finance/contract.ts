import { z } from 'zod';
import { parseDate, parseMoney, validateTimezone } from '@reader/finance-core';

export class FinanceError extends Error {
  constructor(public status: 400 | 404 | 409 | 422, message: string, public details?: unknown) { super(message); this.name = 'FinanceError'; }
}

export const uuid = z.string().uuid();
export const name = z.string().trim().min(1).max(255);
export const version = z.number().int().positive();
export const date = z.string().refine(value => { try { parseDate(value); return true; } catch { return false; } }, 'Enter a valid date in YYYY-MM-DD format.');
export const money = z.string().max(32).regex(/^-?\d+(?:\.\d+)?$/, 'Enter the amount as decimal text, such as “250.00”.');
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const transactionKind = z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'ADJUSTMENT']);
export const categoryKind = z.enum(['INCOME', 'EXPENSE']);
export const scheduleKind = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

export const bookSchema = z.object({
  requestKey: uuid, name, currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('INR'),
  timezone: z.string().min(1).max(100).refine(validateTimezone, 'Choose a valid time zone.'), starterCategories: z.boolean().default(true),
}).strict();
export const bookUpdateSchema = z.object({ expectedVersion: version, name: name.optional(), timezone: z.string().min(1).max(100).refine(validateTimezone).optional(), archived: z.boolean().optional() }).strict();
export const accountSchema = z.object({ requestKey: uuid, name, tracksDebt: z.boolean().default(false), isLiquid: z.boolean().optional(), notes: optionalText(5000), openingAmount: money.default('0'), openingDate: date }).strict();
export const accountUpdateSchema = z.object({ expectedVersion: version, name: name.optional(), tracksDebt: z.boolean().optional(), isLiquid: z.boolean().optional(), notes: optionalText(5000), archived: z.boolean().optional() }).strict();
export const categorySchema = z.object({ requestKey: uuid, name, kind: categoryKind, parentId: uuid.nullable().optional() }).strict();
export const categoryUpdateSchema = z.object({ expectedVersion: version, name: name.optional(), parentId: uuid.nullable().optional(), archived: z.boolean().optional() }).strict();

const movementSchema = z.object({ accountId: uuid, amount: money, effectiveDate: date.optional(), cleared: z.boolean().default(false) }).strict();
const splitSchema = z.object({ categoryId: uuid, amount: money }).strict();
export const transactionFields = z.object({
  kind: transactionKind, status: z.enum(['PENDING', 'POSTED']).default('POSTED'), date, description: z.string().trim().min(1).max(1000),
  merchant: optionalText(255), paymentMethod: optionalText(100), bankReference: optionalText(255), notesMarkdown: z.string().max(100000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(30).default([]), refundOfId: uuid.nullable().optional(),
  movements: z.array(movementSchema).min(1).max(20), splits: z.array(splitSchema).max(100).default([]),
}).strict();
export const transactionSchema = transactionFields.extend({ requestKey: uuid }).strict();
export const transactionUpdateSchema = transactionFields.extend({ expectedVersion: version }).strict();
export const archiveSchema = z.object({ expectedVersion: version, deleted: z.boolean() }).strict();
export const bulkCategorySchema = z.object({ categoryId: uuid, items: z.array(z.object({ id: uuid, expectedVersion: version }).strict()).min(1).max(100) }).strict();

const rangeFields = { low: money, expected: money, high: money };
export const scheduleFields = z.object({
  title: name, kind: scheduleKind, accountId: uuid.nullable().optional(), destinationAccountId: uuid.nullable().optional(), categoryId: uuid.nullable().optional(),
  frequency: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']), interval: z.number().int().min(1).max(10000).default(1), monthEnd: z.boolean().default(false),
  startDate: date, endDate: date.nullable().optional(), ...rangeFields, notesMarkdown: z.string().max(100000).nullable().optional(), paused: z.boolean().default(false),
}).strict();
export const scheduleSchema = scheduleFields.extend({ requestKey: uuid }).strict();
export const scheduleUpdateSchema = scheduleFields.extend({ expectedVersion: version, archived: z.boolean().optional() }).strict();
// Version zero identifies an unchanged virtual occurrence that has not yet been persisted.
export const occurrenceTarget = z.object({ scheduleId: uuid, date, expectedVersion: z.number().int().nonnegative() });
export const occurrenceUpdateSchema = occurrenceTarget.extend({ state: z.enum(['OPEN', 'SKIPPED']).optional(), title: name.optional(), low: money.optional(), expected: money.optional(), high: money.optional(), notesMarkdown: z.string().max(100000).nullable().optional() }).strict();
export const paymentSchema = occurrenceTarget.extend({ movementId: uuid, amount: money }).strict();
export const budgetSchema = z.object({ categoryId: uuid, month: date.refine(value => value.endsWith('-01'), 'Choose the first day of the budget month.'), amount: money, expectedVersion: z.number().int().nonnegative() }).strict();
export const estimateSchema = z.object({ categoryId: uuid, ...rangeFields, expectedVersion: z.number().int().nonnegative(), deleted: z.boolean().default(false) }).strict();
export const ruleSchema = z.object({ categoryId: uuid, matchText: name, merchantName: optionalText(255), enabled: z.boolean().default(true), expectedVersion: z.number().int().nonnegative(), id: uuid }).strict();
export const reconcileSchema = z.object({ accountId: uuid, date, statementBalance: money, notes: optionalText(5000) }).strict();
export const reopenSchema = z.object({ expectedVersion: version, reason: z.string().trim().min(1).max(5000) }).strict();

export const importRowSchema = z.object({
  date, amount: money, description: z.string().trim().min(1).max(1000), externalId: optionalText(255),
  merchant: optionalText(255), paymentMethod: optionalText(100), bankReference: optionalText(255), categoryId: uuid.nullable().optional(),
  kind: z.enum(['INCOME', 'EXPENSE', 'REFUND', 'TRANSFER']).optional(), destinationAccountId: uuid.nullable().optional(), refundOfId: uuid.nullable().optional(),
  sourceLocator: optionalText(500),
  sourceFields: z.record(z.string().min(1).max(100), z.string().max(5000)).refine(value => Object.keys(value).length <= 100, 'The statement has too many columns.').optional(),
}).strict();
export const importSchema = z.object({
  requestKey: uuid, accountId: uuid, sourceName: name, fileHash: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  periodStart: date.nullable().optional(), periodEnd: date.nullable().optional(), openingBalance: money.nullable().optional(), closingBalance: money.nullable().optional(),
  totalCredits: money.nullable().optional(), totalDebits: money.nullable().optional(), expectedRowCount: z.number().int().nonnegative().optional(),
  rows: z.array(importRowSchema).min(1).max(1000),
}).strict();
export const resolveImportSchema = z.object({
  expectedVersion: version, rows: z.array(z.object({
    rowId: uuid, decision: z.enum(['NEW', 'MATCH', 'SKIP']), matchMovementId: uuid.optional(), categoryId: uuid.nullable().optional(),
    kind: z.enum(['INCOME', 'EXPENSE', 'REFUND', 'TRANSFER']).optional(), destinationAccountId: uuid.nullable().optional(), refundOfId: uuid.nullable().optional(),
    merchant: optionalText(255), forceNew: z.boolean().default(false),
  }).strict()).min(1).max(1000),
}).strict();
export const commitImportSchema = z.object({ expectedVersion: version, acceptUnverified: z.boolean().default(false) }).strict();
export const querySchema = z.object({
  from: date.optional(), to: date.optional(), accountId: uuid.optional(), categoryId: uuid.optional(), kind: transactionKind.optional(),
  paymentMethod: z.string().max(100).optional(), search: z.string().max(255).optional(), status: z.enum(['PENDING', 'POSTED']).optional(),
  deleted: z.union([z.boolean(), z.enum(['true', 'false'])]).transform(value => value === true || value === 'true').optional(), cursor: uuid.optional(), take: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.map(part => typeof part === 'number' ? `item ${part + 1}` : String(part).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()).join(' → ');
    const heading = field ? `Check ${field}.` : 'Check the finance fields and try again.';
    throw new FinanceError(422, issue ? `${heading} ${issue.message}` : heading, result.error.flatten());
  }
  return result.data;
}

export function amount(value: string, scale: number): bigint {
  try { return parseMoney(value, scale); }
  catch (error) { throw new FinanceError(422, (error as Error).message); }
}

export function moneyRange(input: { low: string; expected: string; high: string }, scale: number) {
  const lowMinor = amount(input.low, scale), expectedMinor = amount(input.expected, scale), highMinor = amount(input.high, scale);
  if (lowMinor < 0n || lowMinor > expectedMinor || expectedMinor > highMinor) throw new FinanceError(422, 'Amounts must be nonnegative, with low ≤ expected ≤ high.');
  return { lowMinor, expectedMinor, highMinor };
}

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionValue = z.output<typeof transactionFields>;
export type ScheduleValue = z.output<typeof scheduleFields>;
