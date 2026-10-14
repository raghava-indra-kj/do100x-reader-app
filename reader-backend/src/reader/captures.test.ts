import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { captureInput, captureIsExpired, CAPTURE_LIFETIME_MS, createCapture, keepCapture, MAX_CAPTURE_BYTES, sourceAddress } from './captures';
import { captureVisibilityWhere } from './capture-visibility';
import { purgeExpiredCaptures } from './capture-cleanup';

const now = new Date('2026-10-14T12:00:00Z');
const key = '11111111-1111-4111-8111-111111111111';
const input = { captureKey: key, title: 'Article', content: '# Article\n\nA paragraph.', sourceUrl: 'https://example.com/article?token=private#section' };
function database() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    page: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: 4 } }), create: vi.fn(), update: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    reader_preferences: { count: vi.fn().mockResolvedValue(0) },
    comment: { deleteMany: vi.fn(), updateMany: vi.fn() },
    quiz: { deleteMany: vi.fn() }, quiz_revision: { deleteMany: vi.fn() }, quiz_question: { deleteMany: vi.fn() }, quiz_option: { deleteMany: vi.fn() },
    quiz_attempt: { deleteMany: vi.fn() }, quiz_attempt_answer: { deleteMany: vi.fn() }, quiz_answer_selection: { deleteMany: vi.fn() }, quiz_answer_evaluation: { deleteMany: vi.fn() },
  };
  const db = { ...tx, $transaction: vi.fn(async (run: (value: typeof tx) => unknown) => run(tx)) } as unknown as PrismaClient;
  return { db, tx };
}

describe('Reader capture lifecycle', () => {
  it('uses a fixed seven-day lifetime and an exclusive expiry boundary', () => {
    expect(CAPTURE_LIFETIME_MS).toBe(604800000);
    expect(captureIsExpired(now, now)).toBe(true);
    expect(captureIsExpired(new Date(now.getTime() + 1), now)).toBe(false);
    expect(captureIsExpired(null, now)).toBe(false);
  });
  it('validates bytes, text and source schemes and removes URL credentials/query/fragment', () => {
    expect(captureInput.safeParse({ ...input, content: ' ' }).success).toBe(false);
    expect(captureInput.safeParse({ ...input, content: '₹'.repeat(MAX_CAPTURE_BYTES / 2) }).success).toBe(false);
    expect(captureInput.safeParse({ ...input, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(sourceAddress('https://user:secret@example.com/article?token=x#part')).toBe('https://example.com/article');
  });
  it('creates a private capture outside the saved page tree', async () => {
    const { db, tx } = database(); tx.page.findFirst.mockResolvedValue(null);
    tx.page.create.mockImplementation(async ({ data }) => ({ id: 'capture', ...data }));
    const result = await createCapture(db, 'owner', input, now);
    expect(result).toEqual({ id: 'capture', expiresAt: new Date('2026-10-21T12:00:00Z') });
    expect(tx.page.create.mock.calls[0][0].data).toMatchObject({ userId: 'owner', isPublic: false, parentId: null, captureKey: key, captureSourceUrl: 'https://example.com/article' });
    expect(tx.$queryRaw).toHaveBeenCalledBefore(tx.page.create);
  });
  it('retries the same request without overwriting content, even after Keep', async () => {
    const { db, tx } = database();
    tx.page.findFirst.mockResolvedValue({ id: 'kept', captureExpiresAt: null, deletedAt: null });
    expect(await createCapture(db, 'owner', input, now)).toEqual({ id: 'kept', expiresAt: null });
    expect(tx.page.create).not.toHaveBeenCalled();
  });
  it('rejects expired retries and enforces the inbox quota', async () => {
    const { db, tx } = database();
    tx.page.findFirst.mockResolvedValue({ id: 'expired', captureExpiresAt: now, deletedAt: null });
    await expect(createCapture(db, 'owner', input, now)).rejects.toMatchObject({ status: 410 });
    tx.page.findFirst.mockResolvedValue(null); tx.page.count.mockResolvedValue(100);
    await expect(createCapture(db, 'owner', input, now)).rejects.toMatchObject({ status: 409 });
    expect(tx.page.create).not.toHaveBeenCalled();
  });
  it('keeps the same page, clears expiry and increments the destination once', async () => {
    const { db, tx } = database();
    tx.page.findFirst.mockResolvedValueOnce({ id: 'capture', captureKey: key, captureExpiresAt: new Date(now.getTime() + 10) }).mockResolvedValueOnce({ id: 'folder' });
    expect(await keepCapture(db, 'owner', 'capture', 'folder', now)).toEqual({ id: 'capture' });
    expect(tx.page.update.mock.calls[0][0]).toMatchObject({ where: { id: 'capture', userId: 'owner' }, data: { parentId: 'folder', captureExpiresAt: null, sortOrder: 5 } });
    expect(tx.page.update.mock.calls[1][0]).toMatchObject({ data: { childrenCount: { increment: 1 } } });
    expect(tx.comment.deleteMany).not.toHaveBeenCalled(); expect(tx.quiz.deleteMany).not.toHaveBeenCalled();
    tx.page.findFirst.mockResolvedValue({ id: 'capture', captureKey: key, captureExpiresAt: null });
    await keepCapture(db, 'owner', 'capture', 'folder', now);
    expect(tx.page.update).toHaveBeenCalledTimes(2);
  });
  it('rejects an expired capture or another owner’s destination without changing pages', async () => {
    const { db, tx } = database();
    tx.page.findFirst.mockResolvedValue({ id: 'capture', captureKey: key, captureExpiresAt: now });
    await expect(keepCapture(db, 'owner', 'capture', 'folder', now)).rejects.toMatchObject({ status: 410 });
    tx.page.findFirst.mockResolvedValueOnce({ id: 'capture', captureKey: key, captureExpiresAt: new Date(now.getTime() + 1) }).mockResolvedValueOnce(null);
    await expect(keepCapture(db, 'owner', 'capture', 'folder', now)).rejects.toMatchObject({ status: 404 });
    expect(tx.page.findFirst.mock.calls.at(-1)?.[0].where).toMatchObject({ userId: 'owner', captureExpiresAt: null });
    expect(tx.page.update).not.toHaveBeenCalled();
  });
  it('rechecks expiry under a lock so a capture kept during candidate selection is safe', async () => {
    const { db, tx } = database();
    tx.page.findMany.mockResolvedValue([{ id: 'kept-while-waiting' }]); tx.page.findFirst.mockResolvedValue(null);
    expect(await purgeExpiredCaptures(db, now)).toEqual({ scanned: 1, deleted: 0, skipped: 1 });
    expect(tx.page.deleteMany).not.toHaveBeenCalled(); expect(tx.comment.deleteMany).not.toHaveBeenCalled();
  });
  it('removes only the expired capture and its dependencies in foreign-key order', async () => {
    const { db, tx } = database();
    tx.page.findMany.mockResolvedValue([{ id: 'expired' }]); tx.page.findFirst.mockResolvedValue({ id: 'expired', captureKey: key });
    expect(await purgeExpiredCaptures(db, now)).toEqual({ scanned: 1, deleted: 1, skipped: 0 });
    expect(tx.comment.deleteMany).toHaveBeenCalledWith({ where: { pageId: 'expired' } });
    expect(tx.page.deleteMany).toHaveBeenCalledWith({ where: { id: 'expired', captureKey: { not: null }, captureExpiresAt: { lte: now } } });
    expect(tx.quiz_answer_evaluation.deleteMany).toHaveBeenCalledBefore(tx.quiz_attempt_answer.deleteMany);
    expect(tx.quiz_option.deleteMany).toHaveBeenCalledBefore(tx.quiz_question.deleteMany);
    expect(tx.quiz.deleteMany).toHaveBeenCalledBefore(tx.page.deleteMany);
  });
  it('never cascades into child pages or a configured Reader home', async () => {
    const { db, tx } = database();
    tx.page.findMany.mockResolvedValue([{ id: 'unsafe' }]); tx.page.findFirst.mockResolvedValue({ id: 'unsafe', captureKey: key }); tx.page.count.mockResolvedValue(1);
    expect((await purgeExpiredCaptures(db, now)).skipped).toBe(1);
    expect(tx.comment.deleteMany).not.toHaveBeenCalled();
    tx.page.count.mockResolvedValue(0); tx.reader_preferences.count.mockResolvedValue(1);
    expect((await purgeExpiredCaptures(db, now)).skipped).toBe(1);
    expect(tx.page.deleteMany).not.toHaveBeenCalled();
  });
});

describe('capture visibility across existing page callers', () => {
  it('keeps captures out of collection queries while preserving permission predicates', () => {
    const where = { userId: 'owner', OR: [{ isPublic: true }], AND: { deletedAt: null } };
    expect(captureVisibilityWhere(where, now)).toEqual({ ...where, AND: [{ deletedAt: null }, { captureExpiresAt: null }] });
    expect(where.AND).toEqual({ deletedAt: null });
  });
  it('allows direct IDs only while permanent or unexpired', () => {
    expect(captureVisibilityWhere({ id: 'capture', userId: 'owner' }, now)).toMatchObject({ id: 'capture', userId: 'owner', AND: [{ OR: [{ captureExpiresAt: null }, { captureExpiresAt: { gt: now } }] }] });
  });
  it('keeps explicit lifecycle queries intact for inbox and bounded cleanup', () => {
    const where = { captureExpiresAt: { lte: now } };
    expect(captureVisibilityWhere(where, now)).toBe(where);
  });
});
