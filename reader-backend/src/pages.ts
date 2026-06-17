import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /pages/:pageId
router.get("/:pageId", async (req, res) => {
  const { pageId } = req.params;

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
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!page) {
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
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  });
});

// GET /pages?parentPageId=&searchQuery=
router.get("/", async (req, res) => {
  const { parentPageId, searchQuery } = req.query as {
    parentPageId?: string;
    searchQuery?: string;
  };

  const pages = await prisma.page.findMany({
    where: {
      deletedAt: null,
      ...(parentPageId !== undefined
        ? { parentId: parentPageId === "null" ? null : parentPageId }
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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  res.json(
    pages.map((p) => ({
      id: p.id,
      userId: p.userId,
      parentPageId: p.parentId,
      title: p.title,
      category: p.category ?? null,
      sortOrder: p.sortOrder,
      childrenCount: p.childrenCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  );
});

// POST /pages
router.post("/", async (req, res) => {
  const { parentPageId, title, content, category, userId } = req.body as {
    parentPageId: string | null;
    title: string;
    content: string;
    category: string | null;
    userId: string;
  };

  const now = new Date();

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
      createdAt: now,
      updatedAt: now,
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

// PUT /pages/:pageId
router.put("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const { title, content, category } = req.body as { title: string; content: string; category: string | null };

  await prisma.page.update({
    where: { id: pageId },
    data: { title, content, category: category ?? null, updatedAt: new Date() },
  });

  res.status(204).send();
});

// DELETE /pages/:pageId  (soft delete)
router.delete("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const now = new Date();

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) {
    res.status(404).json({ message: "Page not found" });
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
    prisma.page.findFirst({ where: { id: pageId1, deletedAt: null } }),
    prisma.page.findFirst({ where: { id: pageId2, deletedAt: null } }),
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

  await prisma.$transaction(async (tx) => {
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
