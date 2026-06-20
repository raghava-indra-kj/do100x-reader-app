import { Router } from "express";
import { prisma } from "../prisma";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/auth";
import { parseContent } from "../lib/parse";
import {
  AUTH_REQUIRED,
  AUTH_FORBIDDEN,
  PAGE_NOT_FOUND,
} from "../error-codes";
import commentsRouter from "./comments";

const router = Router();

// Mount comments router nested under /:pageId/comments
router.use("/:pageId/comments", commentsRouter);

// ---------------------------------------------------------------------------
// GET /trash — list soft-deleted pages
// ---------------------------------------------------------------------------
router.get("/trash", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;

    const pages = await prisma.page.findMany({
      where: { userId, deletedAt: { not: null } },
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
        deletedAt: true,
      },
      orderBy: { deletedAt: "desc" },
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
        deletedAt: p.deletedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET / — list pages
// ---------------------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { parentPageId, searchQuery } = req.query as {
      parentPageId?: string;
      searchQuery?: string;
    };

    // If parentPageId is provided, check if parent is public
    if (parentPageId && parentPageId !== "null") {
      const parentPage = await prisma.page.findFirst({
        where: { id: parentPageId, deletedAt: null },
      });

      if (!parentPage) {
        throw new AppError(PAGE_NOT_FOUND, 404, "Parent page not found.");
      }

      if (parentPage.isPublic) {
        // Public parent — return only public children, no auth required
        const pages = await prisma.page.findMany({
          where: {
            parentId: parentPageId,
            deletedAt: null,
            isPublic: true,
          },
          select: {
            id: true,
            userId: true,
            parentId: true,
            title: true,
            category: true,
            isPublic: true,
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
            isPublic: p.isPublic,
            sortOrder: p.sortOrder,
            childrenCount: p.childrenCount,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }))
        );
        return;
      }

      // Private parent — require auth + ownership
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
      }
      const token = authHeader.slice(7);
      const session = await prisma.session.findFirst({
        where: { token, isActive: true },
      });
      if (!session) {
        throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
      }
      if (parentPage.userId !== session.userId) {
        throw new AppError(AUTH_FORBIDDEN, 403, "You do not have access to this page.");
      }
    }

    // Standard authenticated listing
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
    }
    const token = authHeader.slice(7);
    const session = await prisma.session.findFirst({
      where: { token, isActive: true },
    });
    if (!session) {
      throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
    }

    const userId = session.userId;

    const pages = await prisma.page.findMany({
      where: {
        userId,
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
        isPublic: true,
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
        isPublic: p.isPublic,
        sortOrder: p.sortOrder,
        childrenCount: p.childrenCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:pageId — get single page (conditionally public)
// ---------------------------------------------------------------------------
router.get("/:pageId", async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: null },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found.");
    }

    // If page is public, return it to anyone
    if (page.isPublic) {
      res.json({
        id: page.id,
        userId: page.userId,
        parentPageId: page.parentId,
        title: page.title,
        content: page.content ?? null,
        category: page.category ?? null,
        isPublic: page.isPublic,
        sortOrder: page.sortOrder,
        childrenCount: page.childrenCount,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      });
      return;
    }

    // Private page — require auth + ownership
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
    }
    const token = authHeader.slice(7);
    const session = await prisma.session.findFirst({
      where: { token, isActive: true },
    });
    if (!session) {
      throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
    }
    if (page.userId !== session.userId) {
      throw new AppError(AUTH_FORBIDDEN, 403, "You do not have access to this page.");
    }

    res.json({
      id: page.id,
      userId: page.userId,
      parentPageId: page.parentId,
      title: page.title,
      content: page.content ?? null,
      category: page.category ?? null,
      isPublic: page.isPublic,
      sortOrder: page.sortOrder,
      childrenCount: page.childrenCount,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST / — create page
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { parentPageId, title, rawMarkdown, category } = req.body as {
      parentPageId?: string | null;
      title: string;
      rawMarkdown?: string;
      category?: string | null;
    };
    const userId = req.userId!;
    const now = new Date();

    // Parse markdown content
    const { content, parseResult } = rawMarkdown
      ? parseContent(rawMarkdown)
      : { content: null, parseResult: null };

    // Compute next sort order
    const maxSortOrderRow = await prisma.page.aggregate({
      where: { parentId: parentPageId ?? null, deletedAt: null },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrderRow._max.sortOrder ?? 0) + 1;

    // Create page + increment parent childrenCount in a transaction
    const newPage = await prisma.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: {
          userId,
          parentId: parentPageId ?? null,
          title,
          content: content ?? undefined,
          isPublic: false,
          category: category ?? null,
          sortOrder: nextSortOrder,
          childrenCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      });

      if (parentPageId) {
        await tx.page.update({
          where: { id: parentPageId },
          data: { childrenCount: { increment: 1 }, updatedAt: now },
        });
      }

      return created;
    });

    res.status(201).json({ id: newPage.id, parseResult });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /:pageId — update page
// ---------------------------------------------------------------------------
router.put("/:pageId", requireAuth, async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { title, rawMarkdown, category, isPublic } = req.body as {
      title?: string;
      rawMarkdown?: string;
      category?: string | null;
      isPublic?: boolean;
    };
    const userId = req.userId!;

    // Load page, verify ownership
    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: null },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found.");
    }

    if (page.userId !== userId) {
      throw new AppError(AUTH_FORBIDDEN, 403, "You do not have access to this page.");
    }

    // Parse markdown if provided
    const { content, parseResult } = rawMarkdown !== undefined
      ? parseContent(rawMarkdown)
      : { content: undefined, parseResult: null };

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category ?? null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    await prisma.page.update({
      where: { id: pageId },
      data: updateData,
    });

    res.status(200).json({ parseResult });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:pageId — soft delete or permanent delete (?permanent=true)
// ---------------------------------------------------------------------------
router.delete("/:pageId", requireAuth, async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const permanent = req.query.permanent === "true";
    const userId = req.userId!;
    const now = new Date();

    if (permanent) {
      // Permanent delete — must be in trash first
      const page = await prisma.page.findFirst({
        where: { id: pageId, deletedAt: { not: null } },
      });

      if (!page) {
        throw new AppError(
          PAGE_NOT_FOUND,
          404,
          "Page not found in trash."
        );
      }

      if (page.userId !== userId) {
        throw new AppError(
          AUTH_FORBIDDEN,
          403,
          "You do not have access to this page."
        );
      }

      await prisma.page.delete({ where: { id: pageId } });
      res.status(204).send();
      return;
    }

    // Soft delete
    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: null },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found.");
    }

    if (page.userId !== userId) {
      throw new AppError(
        AUTH_FORBIDDEN,
        403,
        "You do not have access to this page."
      );
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
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /:pageId/restore — restore from trash
// ---------------------------------------------------------------------------
router.post("/:pageId/restore", requireAuth, async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const userId = req.userId!;
    const now = new Date();

    const page = await prisma.page.findFirst({
      where: { id: pageId, deletedAt: { not: null } },
    });

    if (!page) {
      throw new AppError(PAGE_NOT_FOUND, 404, "Page not found in trash.");
    }

    if (page.userId !== userId) {
      throw new AppError(
        AUTH_FORBIDDEN,
        403,
        "You do not have access to this page."
      );
    }

    await prisma.page.update({
      where: { id: pageId },
      data: { deletedAt: null, updatedAt: now },
    });

    // Re-increment parent childrenCount if parent still exists
    if (page.parentId) {
      const parent = await prisma.page.findFirst({
        where: { id: page.parentId, deletedAt: null },
      });

      if (parent) {
        await prisma.page.update({
          where: { id: page.parentId },
          data: { childrenCount: { increment: 1 }, updatedAt: now },
        });
      }
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /swap — reorder pages
// ---------------------------------------------------------------------------
router.post("/swap", requireAuth, async (req, res, next) => {
  try {
    const { pageId1, pageId2 } = req.body as {
      pageId1: string;
      pageId2: string;
    };
    const userId = req.userId!;

    const [page1, page2] = await Promise.all([
      prisma.page.findFirst({ where: { id: pageId1, deletedAt: null } }),
      prisma.page.findFirst({ where: { id: pageId2, deletedAt: null } }),
    ]);

    if (!page1 || !page2) {
      throw new AppError(
        PAGE_NOT_FOUND,
        404,
        "One or both pages not found."
      );
    }

    // Verify ownership
    if (page1.userId !== userId || page2.userId !== userId) {
      throw new AppError(
        AUTH_FORBIDDEN,
        403,
        "You do not have access to these pages."
      );
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
          where: {
            parentId,
            deletedAt: null,
            sortOrder: { gt: s1, lte: s2 },
          },
          data: { sortOrder: { decrement: 1 } },
        });
      } else {
        await tx.page.updateMany({
          where: {
            parentId,
            deletedAt: null,
            sortOrder: { gte: s2, lt: s1 },
          },
          data: { sortOrder: { increment: 1 } },
        });
      }

      await tx.page.update({
        where: { id: pageId1 },
        data: { sortOrder: s2, updatedAt: now },
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
