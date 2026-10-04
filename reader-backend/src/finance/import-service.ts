import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { formatMoney, sumMoney } from '@reader/finance-core';
import { z } from 'zod';
import { amount, commitImportSchema, FinanceError, importRowSchema, importSchema, parse, resolveImportSchema, uuid } from './contract';
import { activeAccount, audit, calendar, checkVersion, day, hash, ownedBook, retry, transact, wire, writeBook, type Actor, type FinanceDb } from './context';
import { csvToImport } from './import-csv';
import { createLedgerTransaction } from './ledger-service';

export const importInclude = { rows: { orderBy: { position: 'asc' as const } } };
export const cancelImportSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const importListSchema = z.object({ cursor: uuid.optional(), take: z.coerce.number().int().min(1).max(100).default(25) }).strict();
type Resolution = z.output<typeof resolveImportSchema>['rows'][number];
function externalKey(id: string | null | undefined) { return id ? hash({ externalId: id }) : null; }
function fingerprint(date: string, amountMinor: bigint, description: string) { return hash({ date, amountMinor: amountMinor.toString(), description: description.trim().replace(/\s+/g, ' ').toLowerCase() }); }
function checkStatement(value: z.output<typeof importSchema>, scale: number) {
  const values = value.rows.map(row => amount(row.amount, scale));
  if (values.some(value => value === 0n)) throw new FinanceError(422, 'Statement rows can’t have zero amounts.');
  const creditMinor = sumMoney(values.filter(value => value > 0n)), debitMinor = -sumMoney(values.filter(value => value < 0n));
  const openingMinor = value.openingBalance == null ? null : amount(value.openingBalance, scale), closingMinor = value.closingBalance == null ? null : amount(value.closingBalance, scale);
  const totalCreditMinor = value.totalCredits == null ? null : amount(value.totalCredits, scale), totalDebitMinor = value.totalDebits == null ? null : amount(value.totalDebits, scale);
  if (totalCreditMinor !== null && totalCreditMinor < 0n || totalDebitMinor !== null && totalDebitMinor < 0n) throw new FinanceError(422, 'Statement credit and debit totals can’t be negative.');
  const checks = {
    rowCount: value.expectedRowCount == null ? null : value.expectedRowCount === value.rows.length,
    credits: totalCreditMinor == null ? null : totalCreditMinor === creditMinor,
    debits: totalDebitMinor == null ? null : totalDebitMinor === debitMinor,
    balance: openingMinor === null || closingMinor === null ? null : openingMinor + creditMinor - debitMinor === closingMinor,
  };
  const balanceVerified = checks.balance === true && Object.values(checks).every(value => value !== false);
  return { openingMinor, closingMinor, totalCreditMinor, totalDebitMinor, balanceVerified, summary: wire({ checks, calculatedCreditMinor: creditMinor, calculatedDebitMinor: debitMinor, rowCount: value.rows.length, warning: balanceVerified ? 'Matching balances don’t prove every row is included. Check the original statement and row count.' : 'Statement completeness isn’t verified. Review it and confirm before importing.' }) };
}
async function loadBatch(db: FinanceDb, bookId: string, id: string) {
  const batch = await db.finance_import_batch.findFirst({ where: { bookId, id }, include: importInclude });
  if (!batch) throw new FinanceError(404, 'Import batch not found');
  return batch;
}
export async function listImports(db: FinanceDb, userId: string, bookId: string, input: unknown = {}) {
  await ownedBook(db, userId, bookId);
  const q = parse(importListSchema, input);
  const cursor = q.cursor ? await db.finance_import_batch.findFirst({ where: { bookId, id: q.cursor } }) : null;
  if (q.cursor && !cursor) throw new FinanceError(422, 'Couldn’t load more imports. Refresh and try again.');
  const rows = await db.finance_import_batch.findMany({ where: { bookId, ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: q.take + 1 });
  return wire({ items: rows.slice(0, q.take), nextCursor: rows.length > q.take ? rows[q.take - 1].id : null });
}
export async function getImport(db: FinanceDb, userId: string, bookId: string, id: string) {
  return transact(db, tx => readImport(tx, userId, bookId, id));
}
async function readImport(db: FinanceDb, userId: string, bookId: string, id: string) {
  await ownedBook(db, userId, bookId);
  const batch = await loadBatch(db, bookId, id);
  const candidateIds = [...new Set(batch.rows.flatMap(row => row.candidateIds as string[]))];
  const candidates = await db.finance_movement.findMany({ where: { bookId, id: { in: candidateIds } }, include: { transaction: true } });
  return wire({ ...batch, candidates });
}
export async function stageImport(db: FinanceDb, actor: Actor, bookId: string, input: unknown, csv = false) {
  return writeBook(db, actor, bookId, async (tx, book) => {
    const value = csv ? csvToImport(input, book.currencyScale) : parse(importSchema, input);
    const previous = retry(await tx.finance_import_batch.findUnique({ where: { bookId_requestKey: { bookId, requestKey: value.requestKey } }, include: importInclude }), value);
    if (previous) return wire(previous);
    await activeAccount(tx, bookId, value.accountId);
    if (value.fileHash && await tx.finance_import_batch.findFirst({ where: { bookId, accountId: value.accountId, fileHash: value.fileHash, status: { not: 'CANCELLED' } } })) throw new FinanceError(409, 'This statement is already prepared or imported for this account. Open the existing import.');
    if (value.periodStart && value.periodEnd && value.periodStart > value.periodEnd) throw new FinanceError(422, 'The statement’s end date must not be before its start date.');
    if (value.rows.some(row => value.periodStart && row.date < value.periodStart || value.periodEnd && row.date > value.periodEnd)) throw new FinanceError(422, 'A row falls outside the statement dates.');
    const externalIds = value.rows.map(row => row.externalId).filter((id): id is string => !!id);
    if (new Set(externalIds).size !== externalIds.length) throw new FinanceError(422, 'Some statement rows have the same unique bank ID. Correct them before preparing the import.');
    const checks = checkStatement(value, book.currencyScale);
    const dateRange = value.rows.map(row => row.date).sort();
    const candidates = await tx.finance_movement.findMany({ where: { bookId, accountId: value.accountId, effectiveDate: { gte: calendar(dateRange[0]), lte: calendar(dateRange[dateRange.length - 1]) } }, include: { transaction: true } });
    const reliable = await tx.finance_source_record.findMany({ where: { bookId, accountId: value.accountId, externalKey: { in: externalIds.map(id => externalKey(id)!) } }, include: { movement: { include: { transaction: true } } } });
    const rules = await tx.finance_rule.findMany({ where: { bookId, enabled: true, category: { archivedAt: null } }, include: { category: true } });
    const fingerprints = value.rows.map(row => fingerprint(row.date, amount(row.amount, book.currencyScale), row.description));
    const batch = await tx.finance_import_batch.create({ data: { bookId, accountId: value.accountId, sourceName: value.sourceName, fileHash: value.fileHash, periodStart: value.periodStart ? calendar(value.periodStart) : null, periodEnd: value.periodEnd ? calendar(value.periodEnd) : null, expectedRowCount: value.expectedRowCount, ...checks, requestKey: value.requestKey, requestHash: hash(value) } });
    await tx.finance_import_row.createMany({ data: value.rows.map((row, position) => {
      const amountMinor = amount(row.amount, book.currencyScale);
      const known = reliable.find(record => record.externalKey === externalKey(row.externalId));
      const sameAmountDate = candidates.filter(candidate => candidate.amountMinor === amountMinor && day(candidate.effectiveDate) === row.date);
      const ids = [...new Set([...sameAmountDate.map(candidate => candidate.id), ...(known ? [known.movementId] : [])])];
      const exactKnown = known && known.movement.amountMinor === amountMinor && day(known.movement.effectiveDate) === row.date;
      const repeated = fingerprints.filter(item => item === fingerprints[position]).length > 1;
      const decision = exactKnown ? 'MATCH' : ids.length || repeated ? 'UNRESOLVED' : 'NEW';
      const kind = row.kind ?? (amountMinor > 0n ? 'INCOME' : 'EXPENSE');
      const matchingRules = kind === 'TRANSFER' ? [] : rules.filter(rule => rule.category.kind === (kind === 'INCOME' ? 'INCOME' : 'EXPENSE') && row.description.toLowerCase().includes(rule.matchText.toLowerCase()));
      const rule = matchingRules.length === 1 ? matchingRules[0] : null;
      const ruleProposal = rule ? { categoryId: row.categoryId === undefined ? rule.categoryId : row.categoryId, merchant: row.merchant ?? rule.merchantName, ruleId: rule.id, ruleVersion: rule.version } : Prisma.DbNull;
      return { bookId, batchId: batch.id, position, date: calendar(row.date), amountMinor, description: row.description, externalId: row.externalId, payload: row, candidateIds: ids, fingerprint: fingerprints[position], decision, resolution: exactKnown ? { decision: 'MATCH', matchMovementId: known.movementId } : ruleProposal };
    }) });
    const result = await loadBatch(tx, bookId, batch.id);
    await audit(tx, actor, bookId, 'import', batch.id, 'STAGE', null, { ...batch, rowCount: result.rows.length });
    return wire(result);
  });
}
export async function resolveImport(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(resolveImportSchema, input);
  if (new Set(value.rows.map(row => row.rowId)).size !== value.rows.length) throw new FinanceError(422, 'The same statement row was included more than once.');
  return writeBook(db, actor, bookId, async tx => {
    const old = await loadBatch(tx, bookId, id);
    checkVersion(old, value.expectedVersion);
    if (old.status !== 'DRAFT') throw new FinanceError(409, 'Only draft imports can be reviewed.');
    for (const resolution of value.rows) {
      const row = old.rows.find(row => row.id === resolution.rowId);
      if (!row) throw new FinanceError(404, 'This row belongs to a different import.');
      if (resolution.decision === 'MATCH') {
        if (!resolution.matchMovementId) throw new FinanceError(422, 'Choose an existing account entry to match.');
        const match = await tx.finance_movement.findFirst({ where: { bookId, accountId: old.accountId, id: resolution.matchMovementId } });
        if (!match || match.amountMinor !== row.amountMinor || day(match.effectiveDate) !== day(row.date)) throw new FinanceError(422, 'The matched entry must have the same account, signed amount and date.');
      }
      const repeated = old.rows.some(other => other.id !== row.id && other.fingerprint === row.fingerprint && other.decision !== 'SKIP');
      if (resolution.decision === 'NEW' && ((row.candidateIds as string[]).length || repeated) && !resolution.forceNew) throw new FinanceError(409, 'Possible duplicate. Match or skip it, or confirm that it’s a separate payment.');
      const previousResolution = row.resolution && typeof row.resolution === 'object' && !Array.isArray(row.resolution) ? row.resolution : {};
      await tx.finance_import_row.update({ where: { id: row.id }, data: { decision: resolution.decision, resolution: { ...previousResolution, ...resolution } } });
    }
    const batch = await tx.finance_import_batch.update({ where: { id }, data: { version: { increment: 1 } }, include: importInclude });
    await audit(tx, actor, bookId, 'import', id, 'RESOLVE', { version: old.version, rows: value.rows.map(value => old.rows.find(row => row.id === value.rowId)) }, { version: batch.version, resolutions: value.rows });
    return wire(batch);
  });
}
export async function commitImport(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(commitImportSchema, input);
  return writeBook(db, actor, bookId, async (tx, book) => {
    const batch = await loadBatch(tx, bookId, id);
    // A successfully committed batch is an immutable, retry-safe result even
    // when the network lost the response containing its advanced version.
    if (batch.status === 'COMMITTED') return wire(batch);
    checkVersion(batch, value.expectedVersion);
    if (batch.status !== 'DRAFT') throw new FinanceError(409, 'This import is no longer a draft.');
    if (!batch.balanceVerified && !value.acceptUnverified) throw new FinanceError(422, 'Review the unverified statement checks and confirm before importing.');
    if (batch.rows.some(row => row.decision === 'UNRESOLVED')) throw new FinanceError(422, 'Review every unresolved row before importing.');
    await activeAccount(tx, bookId, batch.accountId);
    const matchedIds = new Set<string>();
    for (const row of batch.rows) {
      if (row.decision === 'SKIP') continue;
      const payload = parse(importRowSchema, row.payload);
      const resolution = row.resolution && typeof row.resolution === 'object' ? row.resolution as unknown as Partial<Resolution> : {};
      const key = externalKey(row.externalId);
      const source = key ? await tx.finance_source_record.findUnique({ where: { bookId_accountId_externalKey: { bookId, accountId: batch.accountId, externalKey: key } } }) : null;
      let movementId: string;
      if (row.decision === 'MATCH') {
        if (!resolution.matchMovementId) throw new FinanceError(422, 'The matched account entry is unavailable.');
        const movement = await tx.finance_movement.findFirst({ where: { bookId, id: resolution.matchMovementId, accountId: batch.accountId }, include: { transaction: true } });
        if (!movement || movement.amountMinor !== row.amountMinor || day(movement.effectiveDate) !== day(row.date) || movement.transaction.status !== 'POSTED') throw new FinanceError(409, 'The matched entry has changed. Review this row again.');
        movementId = movement.id;
        if (source && source.movementId !== movementId) throw new FinanceError(409, 'This bank transaction ID is already linked to another entry.');
      } else {
        if (source) throw new FinanceError(409, 'This bank transaction ID was already imported. Match or skip the row instead of adding it again.');
        const latestCandidates = await tx.finance_movement.count({ where: { bookId, accountId: batch.accountId, effectiveDate: row.date, amountMinor: row.amountMinor } });
        if (latestCandidates && !resolution.forceNew) throw new FinanceError(409, 'A possible duplicate was added after this import was prepared. Review the row again.');
        const kind = resolution.kind ?? payload.kind ?? (row.amountMinor > 0n ? 'INCOME' : 'EXPENSE');
        const categoryId = resolution.categoryId !== undefined ? resolution.categoryId : payload.categoryId;
        const movements = [{ accountId: batch.accountId, amount: formatMoney(row.amountMinor, book.currencyScale), cleared: true }];
        if (kind === 'TRANSFER') {
          const otherAccountId = resolution.destinationAccountId ?? payload.destinationAccountId;
          if (!otherAccountId || otherAccountId === batch.accountId) throw new FinanceError(422, 'Choose a different account for the other side of this transfer.');
          movements.push({ accountId: otherAccountId, amount: formatMoney(-row.amountMinor, book.currencyScale), cleared: true });
        }
        const splitAmount = kind === 'INCOME' ? row.amountMinor : -row.amountMinor;
        const transaction = await createLedgerTransaction(tx, { ...actor, source: 'IMPORT' }, book, { requestKey: randomUUID(), kind, date: day(row.date), description: row.description, merchant: resolution.merchant !== undefined ? resolution.merchant : payload.merchant, paymentMethod: payload.paymentMethod, bankReference: payload.bankReference, refundOfId: resolution.refundOfId ?? payload.refundOfId, movements, splits: categoryId && kind !== 'TRANSFER' ? [{ categoryId, amount: formatMoney(splitAmount, book.currencyScale) }] : [] });
        movementId = transaction.movements.find(movement => movement.accountId === batch.accountId)!.id;
      }
      if (matchedIds.has(movementId)) throw new FinanceError(422, 'Two rows match the same account entry. Skip duplicate extracted rows.');
      matchedIds.add(movementId);
      await tx.finance_source_record.create({ data: { bookId, accountId: batch.accountId, movementId, importRowId: row.id, externalKey: source ? null : key, sourceDescription: row.description } });
      await tx.finance_import_row.update({ where: { id: row.id }, data: { committedMovementId: movementId } });
    }
    const result = await tx.finance_import_batch.update({ where: { id }, data: { status: 'COMMITTED', committedAt: new Date(), version: { increment: 1 } }, include: importInclude });
    await audit(tx, actor, bookId, 'import', id, 'COMMIT', { status: batch.status, version: batch.version }, { status: result.status, version: result.version, acceptUnverified: value.acceptUnverified, createdRows: result.rows.filter(row => row.decision === 'NEW').length, matchedRows: result.rows.filter(row => row.decision === 'MATCH').length, skippedRows: result.rows.filter(row => row.decision === 'SKIP').length });
    return wire(result);
  });
}
export async function cancelImport(db: FinanceDb, actor: Actor, bookId: string, id: string, input: unknown) {
  const value = parse(cancelImportSchema, input);
  return writeBook(db, actor, bookId, async tx => {
    const old = await loadBatch(tx, bookId, id);
    checkVersion(old, value.expectedVersion);
    if (old.status !== 'DRAFT') throw new FinanceError(409, 'Only drafts can be cancelled. To undo imported transactions, delete them from Transactions; they can be restored.');
    const item = await tx.finance_import_batch.update({ where: { id }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    await audit(tx, actor, bookId, 'import', id, 'CANCEL', { status: old.status, version: old.version }, item);
    return wire(item);
  });
}
