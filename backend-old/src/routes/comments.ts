import { Router } from "express";
import { prisma } from "../prisma";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/auth";
import {
  AUTH_REQUIRED,
  AUTH_FORBIDDEN,
  PAGE_NOT_FOUND,
  COMMENT_NOT_FOUND,
} from "../error-codes";

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// GET / — list comments for a page
// ---------------------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { pageId } = req.params;

    // Load page
    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: null },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found.");
    }

    // If page is not public, require auth + ownership
    if (!page.isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(
          AUTH_REQUIRED,
          401,
          "You must be logged in to do this."
        );
      }
      const token = authHeader.slice(7);
      const session = await prisma.session.findFirst({
        where: { token, isActive: true },
      });
      if (!session) {
        throw new AppError(
          AUTH_REQUIRED,
          401,
          "You must be logged in to do this."
        );
      }
      if (page.userId !== session.userId) {
        throw new AppError(
          AUTH_FORBIDDEN,
          403,
          "You do not have access to this page."
        );
      }
    }

    const comments = await prisma.comment.findMany({
      where: { pageId },
      orderBy: { createdAt: "asc" },
    });

    res.json(
      comments.map((c) => ({
        id: c.id,
        pageId: c.pageId,
        userId: c.userId,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / — add a comment
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { body } = req.body as { body?: string };
    const userId = req.userId!;

    // Load page — must exist and not be deleted
    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: null },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found.");
    }

    const now = new Date();

    const newComment = await prisma.comment.create({
      data: {
        pageId,
        userId,
        body: body ?? "",
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({ id: newComment.id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:commentId — edit comment body
// ---------------------------------------------------------------------------
router.put("/:commentId", requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body as { body?: string };
    const userId = req.userId!;

    const comment = await prisma.comment.findFirst({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError(COMMENT_NOT_FOUND, 404, "Comment not found.");
    }

    if (comment.userId !== userId) {
      throw new AppError(
        AUTH_FORBIDDEN,
        403,
        "You can only edit your own comments."
      );
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { body: body ?? comment.body, updatedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:commentId — hard delete comment
// ---------------------------------------------------------------------------
router.delete("/:commentId", requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const comment = await prisma.comment.findFirst({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError(COMMENT_NOT_FOUND, 404, "Comment not found.");
    }

    if (comment.userId !== userId) {
      throw new AppError(
        AUTH_FORBIDDEN,
        403,
        "You can only delete your own comments."
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
