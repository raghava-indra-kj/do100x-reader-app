import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { requireSession } from '../session';

export const CAPTURE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CAPTURE_BYTES = 512 * 1024;
export const MAX_ACTIVE_CAPTURES = 100;
export const captureInput = z.object({
  captureKey: z.string().uuid(), title: z.string().trim().min(1).max(1000),
  content: z.string().refine(value => value.trim().length > 0, 'Capture some text first.').refine(value => Buffer.byteLength(value, 'utf8') <= MAX_CAPTURE_BYTES, 'Capture is too large. Select a smaller section.'),
  sourceUrl: z.string().max(2048).url().refine(value => /^https?:\/\//i.test(value), 'Only web page addresses are supported.').nullable(),
}).strict();

export class CaptureError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const metadata = { id: true, title: true, captureExpiresAt: true, captureSourceUrl: true, createdAt: true } as const;
export function captureIsExpired(expiresAt: Date | null, now = new Date()): boolean {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}
export function sourceAddress(value: string | null): string | null {
  if (!value) return null;
  const url = new URL(value);
  url.username = ''; url.password = ''; url.search = ''; url.hash = '';
  return url.href;
}

export async function createCapture(db: PrismaClient, userId: string, raw: unknown, now = new Date()) {
  const input = captureInput.parse(raw);
  const sourceUrl = sourceAddress(input.sourceUrl);
  return db.$transaction(async tx => {
    // Account lock serializes duplicate requests and quota checks across tabs/instances.
    await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
    const existing = await tx.page.findFirst({ where: { userId, captureKey: input.captureKey, captureExpiresAt: undefined } });
    if (existing) {
      if (existing.deletedAt || captureIsExpired(existing.captureExpiresAt, now)) throw new CaptureError(410, 'This capture has expired or was deleted. Capture it again to start a new preview.');
      // Retrying a consumed key never overwrites edits or creates another page.
      return { id: existing.id, expiresAt: existing.captureExpiresAt };
    }
    const count = await tx.page.count({ where: { userId, deletedAt: null, captureExpiresAt: { gt: now } } });
    if (count >= MAX_ACTIVE_CAPTURES) throw new CaptureError(409, 'Your temporary inbox is full. Keep or discard some captures first.');
    const saved = await tx.page.create({ data: {
      userId, parentId: null, title: input.title, content: input.content, sortOrder: 0, childrenCount: 0,
      isPublic: false, createdAt: now, updatedAt: now, captureKey: input.captureKey,
      captureSourceUrl: sourceUrl, captureExpiresAt: new Date(now.getTime() + CAPTURE_LIFETIME_MS),
    } });
    return { id: saved.id, expiresAt: saved.captureExpiresAt };
  });
}

export async function keepCapture(db: PrismaClient, userId: string, pageId: string, parentPageId: string, clock?: Date) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
    // Promotion and cleanup take the same page lock; cleanup cannot remove a kept page.
    await tx.$queryRaw`SELECT id FROM page WHERE id = ${pageId} AND userId = ${userId} FOR UPDATE`;
    const now = clock ?? new Date();
    const page = await tx.page.findFirst({ where: { id: pageId, userId, deletedAt: null, captureExpiresAt: undefined } });
    if (!page || !page.captureKey) throw new CaptureError(404, 'Capture not found.');
    if (captureIsExpired(page.captureExpiresAt, now)) throw new CaptureError(410, 'This capture has expired.');
    if (!page.captureExpiresAt) return { id: page.id }; // Retry after a successful Keep.
    const parent = await tx.page.findFirst({ where: { id: parentPageId, userId, deletedAt: null, captureExpiresAt: null } });
    if (!parent || parent.id === page.id) throw new CaptureError(404, 'Choose one of your saved pages as the destination.');
    const last = await tx.page.aggregate({ where: { userId, parentId: parent.id, deletedAt: null, captureExpiresAt: null }, _max: { sortOrder: true } });
    await tx.page.update({ where: { id: page.id, userId, captureExpiresAt: { gt: now } }, data: {
      parentId: parent.id, captureExpiresAt: null, sortOrder: (last._max.sortOrder ?? -1) + 1, updatedAt: now,
    } });
    await tx.page.update({ where: { id: parent.id, userId }, data: { childrenCount: { increment: 1 }, updatedAt: now } });
    return { id: page.id };
  });
}

export function createCapturesRouter(db: PrismaClient) {
  const router = Router();
  router.use(requireSession);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/', async (_req, res) => {
    const rows = await db.page.findMany({ where: { userId: res.locals.userId, deletedAt: null, captureExpiresAt: { gt: new Date() } }, select: metadata, orderBy: [{ captureExpiresAt: 'asc' }, { id: 'asc' }], take: MAX_ACTIVE_CAPTURES });
    res.json({ items: rows, lifetimeDays: 7, limit: MAX_ACTIVE_CAPTURES });
  });
  router.post('/', async (req, res, next) => {
    try { res.status(201).json(await createCapture(db, res.locals.userId, req.body)); }
    catch (error) { handleError(error, res, next); }
  });
  router.post('/:id/keep', async (req, res, next) => {
    try {
      const input = z.object({ parentPageId: z.string().uuid() }).strict().parse(req.body);
      res.json(await keepCapture(db, res.locals.userId, z.string().uuid().parse(req.params.id), input.parentPageId));
    } catch (error) { handleError(error, res, next); }
  });
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const result = await db.page.updateMany({ where: { id, userId: res.locals.userId, captureExpiresAt: { not: null } }, data: { captureExpiresAt: new Date(), deletedAt: new Date() } });
      if (!result.count) { res.status(404).json({ message: 'Capture not found.' }); return; }
      res.status(204).send();
    } catch (error) { handleError(error, res, next); }
  });
  return router;
}

function handleError(error: unknown, res: import('express').Response, next: import('express').NextFunction) {
  if (error instanceof CaptureError) { res.status(error.status).json({ message: error.message }); return; }
  if (error instanceof z.ZodError) { res.status(400).json({ message: error.issues[0]?.message ?? 'Check the capture and try again.' }); return; }
  next(error);
}
