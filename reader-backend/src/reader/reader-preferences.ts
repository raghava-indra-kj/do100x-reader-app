import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { requireSession } from "../session";

// Serialize initialization across instances with an account-row lock. Signing in
// itself never creates Reader content or application-specific preferences.
export async function ensureReaderHome(db: PrismaClient, userId: string): Promise<string> {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
    const preferences = await tx.reader_preferences.findUnique({ where: { userId } });
    if (preferences?.homePageId) {
      const home = await tx.page.findFirst({ where: { id: preferences.homePageId, userId, deletedAt: null }, select: { id: true } });
      if (home) return home.id;
    }
    let home = await tx.page.findFirst({ where: { userId, parentId: null, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true } });
    if (!home) {
      const now = new Date();
      home = await tx.page.create({ data: { userId, title: "Home", parentId: null, content: "", sortOrder: 0, childrenCount: 0, createdAt: now, updatedAt: now }, select: { id: true } });
    }
    await tx.reader_preferences.upsert({ where: { userId }, create: { userId, homePageId: home.id }, update: { homePageId: home.id } });
    return home.id;
  });
}

export function createReaderPreferencesRouter(db: PrismaClient = prisma) {
  const router = Router();
  router.use(requireSession);
  router.get("/preferences", async (_req, res) => {
    const value = await db.reader_preferences.findUnique({ where: { userId: res.locals.userId } });
    const home = value?.homePageId ? await db.page.findFirst({ where: { id: value.homePageId, userId: res.locals.userId, deletedAt: null }, select: { id: true } }) : null;
    res.json({ homePageId: home?.id ?? null });
  });
  router.post("/home", async (_req, res) => res.json({ homePageId: await ensureReaderHome(db, res.locals.userId) }));
  router.patch("/preferences", async (req, res) => {
    const input = z.object({ homePageId: z.string().uuid().nullable() }).strict().safeParse(req.body);
    if (!input.success) { res.status(400).json({ message: "Invalid Reader preference" }); return; }
    const userId: string = res.locals.userId;
    const homePageId = input.data.homePageId;
    const updated = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
      if (homePageId && !await tx.page.findFirst({ where: { id: homePageId, userId, deletedAt: null }, select: { id: true } })) return false;
      await tx.reader_preferences.upsert({ where: { userId }, create: { userId, homePageId }, update: { homePageId } });
      return true;
    });
    if (!updated) { res.status(404).json({ message: "Home page not found" }); return; }
    res.json({ homePageId });
  });
  return router;
}
