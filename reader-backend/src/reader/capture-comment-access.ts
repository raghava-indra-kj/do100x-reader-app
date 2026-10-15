import type { Prisma, PrismaClient } from '@prisma/client';
import { canReadPage } from '../page-access';
import { validatedCommentAttachment, type CommentAttachmentInput } from './comment-attachment';
import { jsonValue, pageDocumentMetadata } from '../page-content';

/** Comments have no page foreign key; serialize creation with capture purge. */
export async function createPageComment(db: PrismaClient, data: Omit<Prisma.commentUncheckedCreateInput, 'anchor' | 'anchorRevision' | 'resolvedAt'>, ownerOnly = false, target: CommentAttachmentInput = {}) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM page WHERE id = ${data.pageId} FOR UPDATE`;
    const page = await tx.page.findFirst({ where: { id: data.pageId, deletedAt: null, ...(ownerOnly ? { userId: data.userId } : {}) } });
    if (!page || !await canReadPage(tx, data.pageId, data.userId)) return null;
    if (data.linkedPageId && !await tx.page.findFirst({ where: { id: data.linkedPageId, userId: data.userId, deletedAt: null, captureExpiresAt: null } })) return null;
    const attachment = validatedCommentAttachment(page, target);
    if (attachment.anchor && page.documentMetadata == null) await tx.page.update({ where: { id: page.id, contentVersion: page.contentVersion }, data: { documentMetadata: jsonValue(pageDocumentMetadata(page)) } });
    return tx.comment.create({ data: { ...data, ...attachment, pageTitle: page.title } });
  });
}

/** Reattachment and edits share the same page lock as content saves and expiry. */
export async function updatePageComment(db: PrismaClient, userId: string, commentId: string, changes: { body?: string; linkedPageId?: string | null; resolved?: boolean; isExplanation?: boolean }, target: CommentAttachmentInput = {}) {
  const existing = await db.comment.findFirst({ where: { id: commentId, userId }, select: { pageId: true } });
  if (!existing) return null;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM page WHERE id = ${existing.pageId} FOR UPDATE`;
    const page = await tx.page.findFirst({ where: { id: existing.pageId, deletedAt: null } });
    if (!page || !await canReadPage(tx, page.id, userId)) return null;
    const comment = await tx.comment.findFirst({ where: { id: commentId, userId, pageId: page.id } });
    if (!comment) return null;
    if (changes.linkedPageId && !await tx.page.findFirst({ where: { id: changes.linkedPageId, userId, deletedAt: null, captureExpiresAt: null } })) return null;
    const attachment = validatedCommentAttachment(page, target);
    if (attachment.anchor && page.documentMetadata == null) await tx.page.update({ where: { id: page.id, contentVersion: page.contentVersion }, data: { documentMetadata: jsonValue(pageDocumentMetadata(page)) } });
    const { resolved, ...fields } = changes;
    return tx.comment.update({ where: { id: comment.id, userId }, data: {
      ...fields, ...attachment, ...(resolved !== undefined ? { resolvedAt: resolved ? comment.resolvedAt ?? new Date() : null } : {}), updatedAt: new Date(),
    } });
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
