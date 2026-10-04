import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { createAccount, createBook } from './catalog-service';
import { commitImport, stageImport } from './import-service';

// Only this isolated random test identity is persisted, so the real service's
// transaction can be tested (not replaced by the surrounding fixture rollback).
// Cleanup targets its exact owner UUID and respects every restrictive FK.
async function removeFixture(db: PrismaClient, ownerId: string) {
  await db.$transaction(async tx => {
    const books = await tx.finance_book.findMany({ where: { userId: ownerId }, select: { id: true } });
    const scope = { bookId: { in: books.map(book => book.id) } };
    await tx.finance_source_record.deleteMany({ where: scope });
    await tx.finance_import_row.deleteMany({ where: scope });
    await tx.finance_import_batch.deleteMany({ where: scope });
    await tx.finance_occurrence_payment.deleteMany({ where: scope });
    await tx.finance_movement.deleteMany({ where: scope });
    await tx.finance_split.deleteMany({ where: scope });
    await tx.finance_transaction.updateMany({ where: scope, data: { refundOfId: null } });
    await tx.finance_transaction.deleteMany({ where: scope });
    await tx.finance_occurrence.deleteMany({ where: scope });
    await tx.finance_schedule.deleteMany({ where: scope });
    await tx.finance_reconciliation.deleteMany({ where: scope });
    await tx.finance_budget.deleteMany({ where: scope });
    await tx.finance_spending_estimate.deleteMany({ where: scope });
    await tx.finance_rule.deleteMany({ where: scope });
    await tx.finance_category.updateMany({ where: scope, data: { parentId: null } });
    await tx.finance_category.deleteMany({ where: scope });
    await tx.finance_account.deleteMany({ where: scope });
    await tx.finance_change.deleteMany({ where: scope });
    await tx.finance_book.deleteMany({ where: { userId: ownerId } });
    await tx.appuser.delete({ where: { id: ownerId } });
  });
}

it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('an import failing on a later row rolls back earlier ledger writes and is safe to retry', async () => {
  const db = new PrismaClient();
  let ownerId: string | undefined;
  try {
    const user = await db.appuser.create({ data: { email: `atomic-fixture-${randomUUID()}@example.com` } });
    ownerId = user.id;
    const actor = { userId: user.id, source: 'MCP' as const };
    const book = await createBook(db, actor, { requestKey: randomUUID(), name: 'Atomic test fixture only', timezone: 'Asia/Kolkata', starterCategories: false });
    const account = await createAccount(db, actor, book.id, { requestKey: randomUUID(), name: 'Fixture cash', openingDate: '2026-10-01' });
    const draft = await stageImport(db, actor, book.id, { requestKey: randomUUID(), accountId: account.id, sourceName: 'Atomic fixture', rows: [
      { date: '2026-10-02', amount: '-10.00', description: 'First valid row', externalId: 'fixture-first' },
      { date: '2026-10-03', amount: '-20.00', description: 'Later invalid category', categoryId: randomUUID() },
    ] });
    const commit = () => commitImport(db, actor, book.id, draft.id, { expectedVersion: 1, acceptUnverified: true });
    await expect(commit()).rejects.toMatchObject({ status: 404 });
    await expect(commit()).rejects.toMatchObject({ status: 404 });
    expect(await db.finance_transaction.count({ where: { bookId: book.id } })).toBe(0);
    expect(await db.finance_source_record.count({ where: { bookId: book.id } })).toBe(0);
    expect(await db.finance_import_row.count({ where: { batchId: draft.id, committedMovementId: { not: null } } })).toBe(0);
    expect((await db.finance_import_batch.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('DRAFT');
    // Concurrent exact create retries are serialized by the same book lock.
    const input = { requestKey: randomUUID(), name: 'Concurrent fixture', openingDate: '2026-10-01' };
    const [first, second] = await Promise.all([createAccount(db, actor, book.id, input), createAccount(db, actor, book.id, input)]);
    expect(first.id).toBe(second.id);
    expect(await db.finance_account.count({ where: { bookId: book.id, requestKey: input.requestKey } })).toBe(1);
  } finally {
    if (ownerId) await removeFixture(db, ownerId);
    await db.$disconnect();
  }
}, 70000);
