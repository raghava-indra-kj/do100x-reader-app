import type { PrismaClient } from '@prisma/client';

/** Bounded cleanup. Each capture is locked and rechecked immediately before deletion. */
export async function purgeExpiredCaptures(db: PrismaClient, now = new Date(), limit = 100) {
  const candidates = await db.page.findMany({ where: { captureExpiresAt: { lte: now } }, select: { id: true }, orderBy: [{ captureExpiresAt: 'asc' }, { id: 'asc' }], take: Math.min(Math.max(limit, 1), 100) });
  let deleted = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const removed = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM page WHERE id = ${candidate.id} FOR UPDATE`;
      const page = await tx.page.findFirst({ where: { id: candidate.id, captureExpiresAt: { lte: now } }, select: { id: true, captureKey: true } });
      if (!page || !page.captureKey) return false;
      // Never cascade into a permanent page, even if a legacy tool created a bad link.
      if (await tx.page.count({ where: { parentId: page.id, captureExpiresAt: undefined } })) return false;
      if (await tx.reader_preferences.count({ where: { homePageId: page.id } })) return false;
      const revision = { quiz: { pageId: page.id } };
      const answer = { attempt: { revision } };
      await tx.quiz_answer_evaluation.deleteMany({ where: { answer } });
      await tx.quiz_answer_selection.deleteMany({ where: { answer } });
      await tx.quiz_attempt_answer.deleteMany({ where: { attempt: { revision } } });
      await tx.quiz_attempt.deleteMany({ where: { revision } });
      await tx.quiz_option.deleteMany({ where: { question: { revision } } });
      await tx.quiz_question.deleteMany({ where: { revision } });
      await tx.quiz_revision.deleteMany({ where: revision });
      await tx.quiz.deleteMany({ where: { pageId: page.id } });
      await tx.comment.deleteMany({ where: { pageId: page.id } });
      await tx.comment.updateMany({ where: { linkedPageId: page.id }, data: { linkedPageId: null } });
      const result = await tx.page.deleteMany({ where: { id: page.id, captureKey: { not: null }, captureExpiresAt: { lte: now } } });
      if (result.count !== 1) throw new Error('Capture changed during cleanup; transaction rolled back.');
      return true;
    });
    if (removed) deleted++; else skipped++;
  }
  return { scanned: candidates.length, deleted, skipped };
}

/** Database expiry remains authoritative while the worker is stopped. */
export function startCaptureCleanup(db: PrismaClient) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await purgeExpiredCaptures(db);
      if (result.scanned) console.info('Reader capture cleanup', result);
    } catch { console.error('Reader capture cleanup failed; it will retry on the next interval.'); }
    finally { running = false; }
  };
  const startup = setTimeout(() => void run(), 60_000);
  const interval = setInterval(() => void run(), 15 * 60_000);
  startup.unref(); interval.unref();
  return () => { clearTimeout(startup); clearInterval(interval); };
}
