import type { Prisma, PrismaClient } from '@prisma/client';
import { canReadPage } from '../page-access';

/** Comments have no page foreign key; serialize creation with capture purge. */
export async function createPageComment(db: PrismaClient, data: Prisma.commentUncheckedCreateInput, ownerOnly = false) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM page WHERE id = ${data.pageId} FOR UPDATE`;
    const page = await tx.page.findFirst({ where: { id: data.pageId, deletedAt: null, ...(ownerOnly ? { userId: data.userId } : {}) }, select: { title: true } });
    if (!page || !await canReadPage(tx, data.pageId, data.userId)) return null;
    if (data.linkedPageId && !await tx.page.findFirst({ where: { id: data.linkedPageId, userId: data.userId, deletedAt: null, captureExpiresAt: null } })) return null;
    return tx.comment.create({ data: { ...data, pageTitle: page.title } });
  });
}

export async function withoutExpiredCaptureComments<T extends { pageId: string }>(db: PrismaClient, comments: T[]): Promise<T[]> {
  if (!comments.length) return comments;
  const expired = await db.page.findMany({ where: { id: { in: [...new Set(comments.map(row => row.pageId))] }, captureExpiresAt: { lte: new Date() } }, select: { id: true } });
  const ids = new Set(expired.map(row => row.id));
  return comments.filter(row => !ids.has(row.pageId));
}

export async function isExpiredCapture(db: PrismaClient, pageId: string): Promise<boolean> {
  return Boolean(await db.page.findFirst({ where: { id: pageId, captureExpiresAt: { lte: new Date() } }, select: { id: true } }));
}
