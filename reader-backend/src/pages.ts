import { Router } from "express";
import { prisma } from "./prisma";
import { z } from "zod";
import { locateSections, sectionBodyTarget } from "@reader/md-ast";
import { contentHash, editSectionBody, PageContentError } from "./page-content";
import { readSession, requireSession } from "./session";

const router = Router();
router.use((req, res, next) => req.method === "GET" ? next() : requireSession(req, res, next));

const sectionEditSchema = z.object({
  contentVersion: z.number().int().nonnegative(),
  target: z.object({
    kind: z.enum(["heading", "preamble"]),
    headingStart: z.number().int().nonnegative().nullable(),
    bodyStart: z.number().int().nonnegative(),
    expectedHeading: z.string().nullable(),
    expectedBody: z.string(),
  }),
  expectedBodyHash: z.string().regex(/^[a-f0-9]{64}$/),
  newBody: z.string(),
});

const fullPageEditSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string(),
  contentVersion: z.number().int().nonnegative(),
  category: z.string().nullable().optional(),
  meaningSystemPrompt: z.string().nullable().optional(),
  explanationSystemPrompt: z.string().nullable().optional(),
  doubtSystemPrompt: z.string().nullable().optional(),
});

// Owner-only snapshots bind each edit to exact source positions and a version.
router.get("/:pageId/edit-targets", requireSession, async (req, res) => {
  const pageId = req.params.pageId as string;
  const page = await prisma.page.findFirst({ where: { id: pageId, userId: res.locals.userId, deletedAt: null } });
  if (!page) { res.status(404).json({ message: "Page not found" }); return; }
  const source = page.content ?? "";
  res.json({
    contentVersion: page.contentVersion,
    sections: locateSections(source).map((range) => ({
      range, target: sectionBodyTarget(source, range), expectedBodyHash: contentHash(source.slice(range.bodyStart, range.bodyEnd)),
    })),
  });
});

router.patch("/:pageId/section-body", async (req, res) => {
  const parsed = sectionEditSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Invalid section edit request" }); return; }
  try {
    res.json(await editSectionBody(prisma, res.locals.userId, req.params.pageId, parsed.data));
  } catch (error) {
    if (error instanceof PageContentError) { res.status(error.status).json({ message: error.message }); return; }
    throw error;
  }
});

/**
 * Recursively checks if a page or any of its ancestors is marked as public.
 */
async function isPagePubliclyAccessible(page: { id: string; isPublic: boolean; parentId: string | null }): Promise<boolean> {
  if (page.isPublic) return true;
  if (!page.parentId) return false;

  let currentParentId: string | null = page.parentId;
  while (currentParentId) {
    const parent: { id: string; isPublic: boolean; parentId: string | null } | null = await prisma.page.findFirst({
      where: { id: currentParentId, deletedAt: null },
      select: { id: true, isPublic: true, parentId: true },
    });
    if (!parent) return false;
    if (parent.isPublic) return true;
    currentParentId = parent.parentId;
  }
  return false;
}

// GET /pages/:pageId
router.get("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = readSession(req);

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      parentId: true,
      title: true,
      content: true,
      contentVersion: true,
      category: true,
      sortOrder: true,
      childrenCount: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      meaningSystemPrompt: true,
      explanationSystemPrompt: true,
      doubtSystemPrompt: true,
    },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  const isOwner = Boolean(reqUserId && page.userId === reqUserId);
  const isPublic = await isPagePubliclyAccessible(page);

  // If not owner and not public, deny access
  if (!isOwner && !isPublic) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  res.json({
    id: page.id,
    userId: page.userId,
    parentPageId: page.parentId,
    title: page.title,
    content: page.content ?? "",
    contentVersion: page.contentVersion,
    category: page.category ?? null,
    sortOrder: page.sortOrder,
    childrenCount: page.childrenCount,
    isPublic: page.isPublic,
    isPubliclyAccessible: isPublic,
    isOwner,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    meaningSystemPrompt: page.meaningSystemPrompt ?? null,
    explanationSystemPrompt: page.explanationSystemPrompt ?? null,
    doubtSystemPrompt: page.doubtSystemPrompt ?? null,
  });
});

// GET /pages?parentPageId=&searchQuery=
router.get("/", async (req, res) => {
  const { parentPageId, searchQuery } = req.query as {
    parentPageId?: string;
    searchQuery?: string;
  };
  const reqUserId = readSession(req);

  // If parentPageId is specified, ensure it is accessible
  if (parentPageId && parentPageId !== "null") {
    const parentPage = await prisma.page.findFirst({
      where: { id: parentPageId, deletedAt: null },
      select: { id: true, userId: true, isPublic: true, parentId: true },
    });
    if (!parentPage) {
      res.status(404).json({ message: "Parent page not found" });
      return;
    }
    const isOwner = Boolean(reqUserId && parentPage.userId === reqUserId);
    const isPublic = await isPagePubliclyAccessible(parentPage);
    if (!isOwner && !isPublic) {
      res.status(404).json({ message: "Parent page not found" });
      return;
    }
  }

  const pages = await prisma.page.findMany({
    where: {
      deletedAt: null,
      ...(parentPageId !== undefined
        ? { parentId: parentPageId === "null" ? null : parentPageId }
        : {}),
      ...(parentPageId === "null" || parentPageId === undefined
        ? (reqUserId ? { userId: reqUserId } : { isPublic: true })
        : {}),
      ...(searchQuery ? { title: { contains: searchQuery } } : {}),
    },
    select: {
      id: true,
      userId: true,
      parentId: true,
      title: true,
      category: true,
      sortOrder: true,
      childrenCount: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  res.json(
    pages.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      parentPageId: p.parentId,
      title: p.title,
      category: p.category ?? null,
      sortOrder: p.sortOrder,
      childrenCount: p.childrenCount,
      isPublic: p.isPublic,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  );
});

// POST /pages
router.post("/", async (req, res) => {
  const {
    parentPageId,
    title,
    content,
    category,
    meaningSystemPrompt,
    explanationSystemPrompt,
    doubtSystemPrompt,
  } = req.body as {
    parentPageId: string | null;
    title: string;
    content: string;
    category: string | null;
    meaningSystemPrompt?: string;
    explanationSystemPrompt?: string;
    doubtSystemPrompt?: string;
  };

  const now = new Date();
  const userId = res.locals.userId as string;
  if (parentPageId) {
    const parent = await prisma.page.findFirst({ where: { id: parentPageId, userId, deletedAt: null } });
    if (!parent) { res.status(404).json({ message: "Parent page not found" }); return; }
  }

  const maxSortOrderRow = await prisma.page.aggregate({
    where: { parentId: parentPageId ?? null, deletedAt: null },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSortOrderRow._max.sortOrder ?? 0) + 1;

  const newPage = await prisma.page.create({
    data: {
      userId,
      parentId: parentPageId ?? null,
      title,
      content,
      category: category ?? null,
      sortOrder: nextSortOrder,
      childrenCount: 0,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
      meaningSystemPrompt: meaningSystemPrompt || null,
      explanationSystemPrompt: explanationSystemPrompt || null,
      doubtSystemPrompt: doubtSystemPrompt || null,
    },
  });

  if (parentPageId) {
    await prisma.page.update({
      where: { id: parentPageId },
      data: { childrenCount: { increment: 1 }, updatedAt: now },
    });
  }

  res.status(201).json(newPage.id);
});

// PATCH /pages/:pageId/share
router.patch("/:pageId/share", async (req, res) => {
  const { pageId } = req.params;
  const { isPublic } = req.body as { isPublic: boolean };
  const reqUserId = res.locals.userId as string;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (reqUserId && page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can change sharing settings" });
    return;
  }

  const updatedPage = await prisma.page.update({
    where: { id: pageId },
    data: {
      isPublic: Boolean(isPublic),
      updatedAt: new Date(),
    },
  });

  const isPubliclyAccessible = await isPagePubliclyAccessible(updatedPage);
  res.json({ success: true, isPublic: updatedPage.isPublic, isPubliclyAccessible });
});

// PUT /pages/:pageId
router.put("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = res.locals.userId as string;
  const parsed = fullPageEditSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Title, Markdown content, and a valid contentVersion are required" }); return; }
  const {
    title,
    content,
    contentVersion,
    category,
    meaningSystemPrompt,
    explanationSystemPrompt,
    doubtSystemPrompt,
  } = parsed.data;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (reqUserId && page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can edit this page" });
    return;
  }

  const saved = await prisma.page.updateMany({
    where: { id: pageId, userId: reqUserId, deletedAt: null, contentVersion },
    data: {
      title,
      content,
      category: category ?? null,
      meaningSystemPrompt: meaningSystemPrompt || null,
      explanationSystemPrompt: explanationSystemPrompt || null,
      doubtSystemPrompt: doubtSystemPrompt || null,
      updatedAt: new Date(),
    },
  });

  if (saved.count !== 1) { res.status(409).json({ message: "This page changed while you were editing. Reload before saving; your draft is preserved." }); return; }

  res.status(204).send();
});

// DELETE /pages/:pageId  (soft delete)
router.delete("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = res.locals.userId as string;
  const now = new Date();

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (reqUserId && page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can delete this page" });
    return;
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { deletedAt: now, updatedAt: now },
  });

  if (page.parentId) {
    await prisma.page.update({
      where: { id: page.parentId },
      data: { childrenCount: { decrement: 1 }, updatedAt: now },
    });
  }

  res.status(204).send();
});

// POST /pages/swap
router.post("/swap", async (req, res) => {
  const { pageId1, pageId2 } = req.body as {
    pageId1: string;
    pageId2: string;
  };

  const [page1, page2] = await Promise.all([
    prisma.page.findFirst({ where: { id: pageId1, userId: res.locals.userId, deletedAt: null } }),
    prisma.page.findFirst({ where: { id: pageId2, userId: res.locals.userId, deletedAt: null } }),
  ]);

  if (!page1 || !page2) {
    res.status(404).json({ message: "One or both pages not found" });
    return;
  }

  const s1 = page1.sortOrder;
  const s2 = page2.sortOrder;
  const parentId = page1.parentId;
  const now = new Date();

  if (s1 === s2) {
    res.status(204).send();
    return;
  }

  await prisma.$transaction(async (tx: any) => {
    if (s1 < s2) {
      await tx.page.updateMany({
        where: { parentId, deletedAt: null, sortOrder: { gt: s1, lte: s2 } },
        data: { sortOrder: { decrement: 1 } },
      });
    } else {
      await tx.page.updateMany({
        where: { parentId, deletedAt: null, sortOrder: { gte: s2, lt: s1 } },
        data: { sortOrder: { increment: 1 } },
      });
    }

    await tx.page.update({
      where: { id: pageId1 },
      data: { sortOrder: s2, updatedAt: now },
    });
  });

  res.status(204).send();
});

export default router;
