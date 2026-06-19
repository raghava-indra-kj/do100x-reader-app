import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /comments?pageId=:pageId
router.get("/", async (req, res) => {
  const { pageId } = req.query as { pageId?: string };

  if (!pageId) {
    res.status(400).json({ message: "pageId query parameter is required" });
    return;
  }

  const comments = await prisma.comment.findMany({
    where: { pageId },
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
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );
});

// POST /comments
router.post("/", async (req, res) => {
  const { pageId, pageTitle, sectionTitle, selectedText, body, linkedPageId } =
    req.body as {
      pageId: string;
      pageTitle: string;
      sectionTitle: string | null;
      selectedText: string;
      body: string;
      linkedPageId: string | null;
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
