import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from 'zod';
import { prisma } from "./prisma";
import { readSession, requireSession } from "./session";
import { canReadPage } from "./page-access";
import { withoutExpiredCaptureComments, createPageComment, updatePageComment } from './reader/capture-comment-access';
import { commentAnchorSchema } from './reader/comment-attachment';
import { PageContentError } from './page-content';

const router = Router();
const commentCreateSchema = z.object({
  pageId: z.string().min(1), pageTitle: z.string().default(''), sectionTitle: z.string().nullable().optional(),
  selectedText: z.string().max(100_000), body: z.string().max(100_000), linkedPageId: z.string().nullable().optional(), isExplanation: z.boolean().optional(),
  anchor: commentAnchorSchema.optional(), contentVersion: z.number().int().nonnegative().optional(),
});
const commentUpdateSchema = z.object({
  body: z.string().max(100_000).optional(), linkedPageId: z.string().nullable().optional(), isExplanation: z.boolean().optional(), resolved: z.boolean().optional(),
  anchor: commentAnchorSchema.optional(), contentVersion: z.number().int().nonnegative().optional(),
});
router.use((req, res, next) => req.method === "GET" ? next() : requireSession(req, res, next));

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
  const reqUserId = readSession(req);

  // Unauthenticated guests have no personal comments
  if (!reqUserId) {
    res.json([]);
    return;
  }

  if (!pageId && !date) {
    res
      .status(400)
      .json({ message: "Choose a page or date." });
    return;
  }

  const where: Record<string, unknown> = {
    userId: reqUserId,
  };
  if (pageId) where.pageId = pageId;

  if (isExplanation !== undefined) {
    const isExpl = isExplanation === "true";
    where.isExplanation = isExpl;
  }

  if (date) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ message: "Enter a valid date in YYYY-MM-DD format." });
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
    (await withoutExpiredCaptureComments(prisma, comments)).map((c: any) => ({
      id: c.id,
      pageId: c.pageId,
      pageTitle: c.pageTitle,
      sectionTitle: c.sectionTitle ?? null,
      selectedText: c.selectedText,
      body: c.body,
      anchor: c.anchor ?? null,
      anchorRevision: c.anchorRevision ?? null,
      resolvedAt: c.resolvedAt ?? null,
      linkedPageId: c.linkedPageId ?? null,
      isExplanation: c.isExplanation,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );
});

// POST /comments
router.post("/", async (req, res) => {
  const reqUserId = readSession(req);
  const parsed = commentCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Check the comment and its selection.' }); return; }
  const {
    pageId,
    pageTitle,
    sectionTitle,
    selectedText,
    body,
    linkedPageId,
    isExplanation,
    anchor, contentVersion,
  } = parsed.data;

  const finalUserId = reqUserId;
  if (!finalUserId) {
    res.status(401).json({ message: "Sign in to add a comment." });
    return;
  }

  const now = new Date();
  if (!pageId || !await canReadPage(prisma, pageId, finalUserId)) { res.status(404).json({ message: "Page not found" }); return; }
  if (linkedPageId && !await prisma.page.findFirst({ where: { id: linkedPageId, userId: finalUserId, deletedAt: null, captureExpiresAt: null } })) { res.status(404).json({ message: "Linked page not found" }); return; }

  const newComment = await createPageComment(prisma, {
      userId: finalUserId,
      pageId,
      pageTitle,
      sectionTitle: sectionTitle ?? null,
      selectedText,
      body,
      linkedPageId: linkedPageId ?? null,
      isExplanation: isExplanation ?? false,
      createdAt: now,
      updatedAt: now,
  }, false, { anchor, contentVersion });
  if (!newComment) { res.status(404).json({ message: 'Page or linked page is no longer available.' }); return; }
  res.status(201).json(newComment.id);
});

// PUT /comments/:commentId
router.put("/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const reqUserId = readSession(req);
  const parsed = commentUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Check the comment and its selection.' }); return; }
  const { anchor, contentVersion, ...changes } = parsed.data;
  const updated = await updatePageComment(prisma, reqUserId!, commentId, changes, { anchor, contentVersion });
  if (!updated) { res.status(404).json({ message: 'Comment or linked page is no longer available.' }); return; }

  res.status(204).send();
});

// DELETE /comments?pageId=
router.delete("/", async (req, res) => {
  const { pageId } = req.query as { pageId?: string };
  const reqUserId = readSession(req);

  if (!pageId) {
    res.status(400).json({ message: "Choose a page." });
    return;
  }

  await prisma.comment.deleteMany({
    where: {
      pageId,
      userId: reqUserId,
    },
  });

  res.status(204).send();
});

// DELETE /comments/:commentId
router.delete("/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const reqUserId = readSession(req);

  const existing = await prisma.comment.findFirst({
    where: { id: commentId, userId: reqUserId },
  });

  if (!existing) {
    res.status(404).json({ message: "Comment not found" });
    return;
  }


  await prisma.comment.delete({
    where: { id: commentId, userId: reqUserId },
  });

  res.status(204).send();
});

router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof PageContentError) { res.status(error.status).json({ message: error.message }); return; }
  next(error);
});
export default router;
