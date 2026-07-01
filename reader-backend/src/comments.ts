import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /comments?pageId=&isExplanation=&date=
// - pageId (optional): scope to one page; when omitted returns across all pages (daily recap mode)
// - isExplanation (optional): "true"/"false" to filter explanations only / non-explanations
// - date (optional, YYYY-MM-DD): restrict createdAt to that calendar day
router.get("/", async (req, res) => {
  const { pageId, isExplanation, date } = req.query as {
    pageId?: string;
    isExplanation?: string;
    date?: string;
  };

  if (!pageId && !date) {
    res
      .status(400)
      .json({ message: "pageId or date query parameter is required" });
    return;
  }

  const where: Record<string, unknown> = {};
  if (pageId) where.pageId = pageId;

  if (isExplanation !== undefined) {
    const isExpl = isExplanation === "true";
    where.isExplanation = isExpl;
  }

  if (date) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ message: "Invalid date (expected YYYY-MM-DD)" });
      return;
    }
    const next = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
    where.createdAt = { gte: parsed, lt: next };
  }

  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json(
    comments.map((c) => ({
      id: c.id,
      pageId: c.pageId,
      pageTitle: c.pageTitle,
      sectionTitle: c.sectionTitle ?? null,
      selectedText: c.selectedText,
      body: c.body,
      linkedPageId: c.linkedPageId ?? null,
      isExplanation: c.isExplanation,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );
});

// POST /comments
router.post("/", async (req, res) => {
  const {
    pageId,
    pageTitle,
    sectionTitle,
    selectedText,
    body,
    linkedPageId,
    isExplanation,
  } = req.body as {
    pageId: string;
    pageTitle: string;
    sectionTitle: string | null;
    selectedText: string;
    body: string;
    linkedPageId: string | null;
    isExplanation?: boolean;
  };

  const now = new Date();

  const newComment = await prisma.comment.create({
    data: {
      pageId,
      pageTitle,
      sectionTitle: sectionTitle ?? null,
      selectedText,
      body,
      linkedPageId: linkedPageId ?? null,
      isExplanation: isExplanation ?? false,
      createdAt: now,
      updatedAt: now,
    },
  });

  res.status(201).json(newComment.id);
});

// PUT /comments/:commentId
router.put("/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { body, linkedPageId } = req.body as {
    body: string;
    linkedPageId?: string | null;
  };

  const existing = await prisma.comment.findFirst({
    where: { id: commentId },
  });

  if (!existing) {
    res.status(404).json({ message: "Comment not found" });
    return;
  }

  const updateData: Record<string, unknown> = {
    body,
    updatedAt: new Date(),
  };
  if (linkedPageId !== undefined) {
    updateData.linkedPageId = linkedPageId ?? null;
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: updateData,
  });

  res.status(204).send();
});

// DELETE /comments/:commentId
router.delete("/:commentId", async (req, res) => {
  const { commentId } = req.params;

  const existing = await prisma.comment.findFirst({
    where: { id: commentId },
  });

  if (!existing) {
    res.status(404).json({ message: "Comment not found" });
    return;
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  res.status(204).send();
});

export default router;
