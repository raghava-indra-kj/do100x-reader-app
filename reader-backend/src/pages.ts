import { Router } from "express";
import { requireAuth } from "./auth";
import { prisma } from "./prisma";
import { getPagePropertiesMap, validatePropertyKey } from "./mcp/utils/properties";

const router = Router();

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
  const reqUserId = req.auth?.user.id;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      parentId: true,
      title: true,
      content: true,
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
    category: page.category ?? null,
    sortOrder: page.sortOrder,
    childrenCount: page.childrenCount,
    isPublic: page.isPublic,
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
  const reqUserId = req.auth?.user.id;

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
router.post("/", requireAuth, async (req, res) => {
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

  const userId = req.auth!.user.id;

  if (parentPageId) {
    const parent = await prisma.page.findFirst({
      where: { id: parentPageId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) {
      res.status(404).json({ message: "Parent page not found" });
      return;
    }
  }

  const now = new Date();

  const maxSortOrderRow = await prisma.page.aggregate({
    where: { userId, parentId: parentPageId ?? null, deletedAt: null },
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
router.patch("/:pageId/share", requireAuth, async (req, res) => {
  const { pageId } = req.params;
  const { isPublic } = req.body as { isPublic: boolean };
  const reqUserId = req.auth!.user.id;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can change sharing settings" });
    return;
  }

  await prisma.page.update({
    where: { id: pageId },
    data: {
      isPublic: Boolean(isPublic),
      updatedAt: new Date(),
    },
  });

  res.json({ success: true, isPublic: Boolean(isPublic) });
});

// PUT /pages/:pageId
router.put("/:pageId", requireAuth, async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = req.auth!.user.id;
  const {
    title,
    content,
    category,
    meaningSystemPrompt,
    explanationSystemPrompt,
    doubtSystemPrompt,
  } = req.body as {
    title: string;
    content: string;
    category: string | null;
    meaningSystemPrompt?: string;
    explanationSystemPrompt?: string;
    doubtSystemPrompt?: string;
  };

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can edit this page" });
    return;
  }

  await prisma.page.update({
    where: { id: pageId },
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

  res.status(204).send();
});

// DELETE /pages/:pageId  (soft delete)
router.delete("/:pageId", requireAuth, async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = req.auth!.user.id;
  const now = new Date();

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can delete this page" });
    return;
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { deletedAt: now, updatedAt: now },
  });

  await prisma.page_property.deleteMany({
    where: { userId: page.userId, pageId },
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
router.post("/swap", requireAuth, async (req, res) => {
  const { pageId1, pageId2 } = req.body as {
    pageId1: string;
    pageId2: string;
  };

  const [page1, page2] = await Promise.all([
    prisma.page.findFirst({ where: { id: pageId1, deletedAt: null } }),
    prisma.page.findFirst({ where: { id: pageId2, deletedAt: null } }),
  ]);

  if (!page1 || !page2) {
    res.status(404).json({ message: "One or both pages not found" });
    return;
  }

  const userId = req.auth!.user.id;
  if (page1.userId !== userId || page2.userId !== userId || page1.parentId !== page2.parentId) {
    res.status(403).json({ message: "Pages must belong to you and share the same parent" });
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
        where: { userId, parentId, deletedAt: null, sortOrder: { gt: s1, lte: s2 } },
        data: { sortOrder: { decrement: 1 } },
      });
    } else {
      await tx.page.updateMany({
        where: { userId, parentId, deletedAt: null, sortOrder: { gte: s2, lt: s1 } },
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

// GET /pages/:pageId/properties
router.get("/:pageId/properties", async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = req.auth?.user.id;

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, userId: true, isPublic: true, parentId: true },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  const isOwner = Boolean(reqUserId && page.userId === reqUserId);
  const isPublic = await isPagePubliclyAccessible(page);

  if (!isOwner && !isPublic) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  const map = await getPagePropertiesMap(page.userId, [page.id]);
  res.json({ pageId: page.id, properties: map.get(page.id) ?? {} });
});

// PUT /pages/:pageId/properties
router.put("/:pageId/properties", requireAuth, async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = req.auth!.user.id;
  const { properties, mode } = req.body as {
    properties?: Record<string, string>;
    mode?: "merge" | "replace";
  };

  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    res.status(400).json({ message: "properties object is required" });
    return;
  }

  const entries = Object.entries(properties);
  if (entries.length === 0) {
    res.status(400).json({ message: "properties must contain at least one key/value pair" });
    return;
  }

  const errors = entries
    .map(([key]) => validatePropertyKey(key))
    .filter((e): e is { key: string; reason: string } => e !== null);

  if (errors.length > 0) {
    res.status(400).json({
      message: `Invalid property key(s): ${errors.map((e) => `"${e.key}" (${e.reason})`).join(", ")}`,
    });
    return;
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, userId: true },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can edit page properties" });
    return;
  }

  const now = new Date();

  if (mode === "replace") {
    await prisma.page_property.deleteMany({
      where: {
        userId: page.userId,
        pageId,
        key: { notIn: entries.map(([key]) => key.trim()) },
      },
    });
  }

  for (const [key, value] of entries) {
    await prisma.page_property.upsert({
      where: { pageId_key: { pageId, key: key.trim() } },
      update: { value, updatedAt: now },
      create: {
        pageId,
        userId: page.userId,
        key: key.trim(),
        value,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  const map = await getPagePropertiesMap(page.userId, [page.id]);
  res.json({ success: true, pageId: page.id, properties: map.get(page.id) ?? {} });
});

// DELETE /pages/:pageId/properties
router.delete("/:pageId/properties", requireAuth, async (req, res) => {
  const { pageId } = req.params;
  const reqUserId = req.auth!.user.id;
  const { keys } = req.body as { keys?: string[] };

  if (!Array.isArray(keys) || keys.length === 0) {
    res.status(400).json({ message: "keys array is required" });
    return;
  }

  const cleanKeys = keys.map((k) => k.trim()).filter(Boolean);

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, userId: true },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
    return;
  }

  if (page.userId !== reqUserId) {
    res.status(403).json({ message: "Only the page owner can edit page properties" });
    return;
  }

  const result = await prisma.page_property.deleteMany({
    where: {
      userId: page.userId,
      pageId,
      key: { in: cleanKeys },
    },
  });

  const map = await getPagePropertiesMap(page.userId, [page.id]);
  res.json({
    success: true,
    pageId: page.id,
    deletedCount: result.count,
    properties: map.get(page.id) ?? {},
  });
});

export default router;
