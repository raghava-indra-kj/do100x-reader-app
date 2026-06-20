# Phase 8 — Page Module

**Goal:** Pages with full lifecycle — create, read (incl. public), list, update, soft‑delete,
trash listing, restore, permanent delete (cascade), and reorder (swap). Markdown is parsed to
a JSON AST via `@reader/md-ast` and stored in `page.content`.

**What you'll learn:** transactions for multi‑row writes, soft delete vs cascade delete, a
parsing pipeline, and conditional public access — all behind a pure domain service.

**Prerequisites:** Phase 7 complete.

---

## Concept (read once)

- **Ownership** is enforced by `loadOwnedPage(pageId, userId)`, which throws
  `page.not_found` or `page.forbidden`. Every mutating operation goes through it.
- **Parsing:** the client sends `rawMarkdown`; we parse it to an AST and store the AST in the
  `content` JSON column. On **update**, if parsing fails we keep the **last good content**
  (never wipe it) and still report the parse result to the client.
- **Public access:** a page with `isPublic: true` is readable by anyone; private pages require
  the owner. The service receives `requesterUserId: string | null` and decides — it throws
  `auth.unauthenticated` (anonymous) or `page.forbidden` (wrong user).
- **Transactions:** create/soft‑delete/restore adjust the parent's `childrenCount`, and
  permanent delete removes a page **with all descendants and their comments** — each wrapped in
  `prisma.$transaction` so counts never drift and no orphans remain.

---

## Steps

### 8.1 — Add the markdown parser dependency
EDIT `package.json` dependencies to include the workspace package, then install:
```json
"@reader/md-ast": "*"
```
```
npm install
```

### 8.2 — CREATE `src/modules/page/page.constants.ts`
```ts
// Field limits for the page and comment resources (mirror page/comment columns).
export const PAGE_TITLE_MAX_LENGTH = 1000;
export const PAGE_CATEGORY_MAX_LENGTH = 255;
export const COMMENT_BODY_MAX_LENGTH = 5000;
```

### 8.3 — CREATE `src/modules/page/page.errors.ts`
```ts
import { DomainError } from "../../common/errors/domain-error";

// Stable codes (also i18n keys) for page failures.
export const PAGE_NOT_FOUND = "page.not_found";
export const PAGE_FORBIDDEN = "page.forbidden";
export const PAGE_HOME_PROTECTED = "page.home_cannot_be_deleted";
export const PAGE_SWAP_PARENT_MISMATCH = "page.swap_parent_mismatch";

// Domain errors raised by the page feature (code only — no HTTP, no text).
export class PageError extends DomainError {
  // Page does not exist (or is soft-deleted when a live page was expected).
  static notFound() { return new PageError(PAGE_NOT_FOUND); }
  // Authenticated user is not allowed to access this page.
  static forbidden() { return new PageError(PAGE_FORBIDDEN); }
  // Attempt to delete the user's home page.
  static homeProtected() { return new PageError(PAGE_HOME_PROTECTED); }
  // Swap of two pages that don't share a parent.
  static swapParentMismatch() { return new PageError(PAGE_SWAP_PARENT_MISMATCH); }
}
```

### 8.4 — CREATE `src/modules/page/page.schema.ts`
```ts
import { z } from "zod";
import { PAGE_TITLE_MAX_LENGTH, PAGE_CATEGORY_MAX_LENGTH } from "./page.constants";

// Reusable UUID validator for page id fields.
export const idSchema = z.uuid("validation.invalid_id");

// Request body for POST /pages.
export const createPageSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(PAGE_TITLE_MAX_LENGTH, "validation.too_long"),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH, "validation.too_long").nullable().optional(),
  parentPageId: idSchema.nullable().optional(),
});
export type CreatePageRequest = z.infer<typeof createPageSchema>;

// Request body for PUT /pages/:pageId (all fields optional).
export const updatePageSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(PAGE_TITLE_MAX_LENGTH, "validation.too_long").optional(),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH, "validation.too_long").nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdatePageRequest = z.infer<typeof updatePageSchema>;

// Request body for POST /pages/swap.
export const swapPagesSchema = z.object({ pageId1: idSchema, pageId2: idSchema });
export type SwapPagesRequest = z.infer<typeof swapPagesSchema>;
```

### 8.5 — CREATE `src/modules/page/page.dto.ts`
```ts
import type { page } from "@prisma/client";

// Maps a page row to the list/summary response shape.
export const toPageListDto = (p: page) => ({
  id: p.id, userId: p.userId, parentPageId: p.parentId, title: p.title,
  category: p.category ?? null, isPublic: p.isPublic, sortOrder: p.sortOrder,
  childrenCount: p.childrenCount, createdAt: p.createdAt, updatedAt: p.updatedAt,
});

// Maps a page row to the full response shape (includes parsed content).
export const toPageDto = (p: page) => ({ ...toPageListDto(p), content: p.content ?? null });

// Maps a trashed page row, exposing deletedAt for the trash view.
export const toTrashDto = (p: page) => ({ ...toPageListDto(p), deletedAt: p.deletedAt });
```

### 8.6 — CREATE `src/modules/page/page.parse.ts`
```ts
import { safeParseMarkdown } from "@reader/md-ast";
import type { ParseResult } from "@reader/md-ast";

// Parses raw markdown into a ParseResult; callers decide what to persist.
export const parseContent = (rawMarkdown: string): ParseResult =>
  safeParseMarkdown({ source: rawMarkdown });
```

### 8.7 — CREATE `src/modules/page/page.access.ts`
```ts
import { prisma } from "../../common/prisma";
import { PageError } from "./page.errors";

// Loads a live page owned by userId, else throws page.not_found or page.forbidden.
export async function loadOwnedPage(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.notFound();
  if (page.userId !== userId) throw PageError.forbidden();
  return page;
}
```

### 8.8 — CREATE `src/modules/page/page-tree.ts`
```ts
import { Prisma } from "@prisma/client";

// Returns the page id plus every descendant id at any depth (within a transaction).
export async function collectPageAndDescendants(tx: Prisma.TransactionClient, rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await tx.page.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    if (!children.length) break;
    const childIds = children.map((c) => c.id);
    ids.push(...childIds);
    frontier = childIds;
  }
  return ids;
}
```

### 8.9 — CREATE `src/modules/page/page.service.ts`
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { AuthError } from "../auth/auth.errors";
import { PageError } from "./page.errors";
import { loadOwnedPage } from "./page.access";
import { parseContent } from "./page.parse";
import { collectPageAndDescendants } from "./page-tree";
import type { CreatePageRequest, UpdatePageRequest } from "./page.schema";
import type { ParseResult } from "@reader/md-ast";

// Loads a live page by id or throws page.not_found (no ownership check).
async function loadLivePage(pageId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.notFound();
  return page;
}

// Throws unless the requester owns the resource (unauthenticated vs forbidden).
function assertOwnership(ownerId: string, requesterUserId: string | null): void {
  if (requesterUserId === null) throw AuthError.unauthenticated();
  if (requesterUserId !== ownerId) throw PageError.forbidden();
}

// Returns a single page when it is public or owned by the requester.
export async function getPage(pageId: string, requesterUserId: string | null) {
  const page = await loadLivePage(pageId);
  if (!page.isPublic) assertOwnership(page.userId, requesterUserId);
  return page;
}

// Lists pages: a public parent's public children for anyone, otherwise the requester's own pages.
export async function listPages(requesterUserId: string | null, parentPageId?: string, searchQuery?: string) {
  if (parentPageId !== undefined && parentPageId !== "null") {
    const parent = await loadLivePage(parentPageId);
    if (parent.isPublic) {
      return prisma.page.findMany({ where: { parentId: parentPageId, deletedAt: null, isPublic: true }, orderBy: { sortOrder: "asc" } });
    }
    assertOwnership(parent.userId, requesterUserId);
    return prisma.page.findMany({
      where: { parentId: parentPageId, deletedAt: null, userId: parent.userId, ...(searchQuery ? { title: { contains: searchQuery } } : {}) },
      orderBy: { sortOrder: "asc" },
    });
  }
  if (requesterUserId === null) throw AuthError.unauthenticated();
  return prisma.page.findMany({
    where: { userId: requesterUserId, deletedAt: null, ...(parentPageId === "null" ? { parentId: null } : {}), ...(searchQuery ? { title: { contains: searchQuery } } : {}) },
    orderBy: { sortOrder: "asc" },
  });
}

// Lists the requester's soft-deleted pages (trash).
export async function listTrash(userId: string) {
  return prisma.page.findMany({ where: { userId, deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } });
}

// Creates a page under an optional owned parent; stores parsed content only when parsing succeeds.
export async function createPage(userId: string, input: CreatePageRequest): Promise<{ id: string; parseResult: ParseResult | null }> {
  if (input.parentPageId) await loadOwnedPage(input.parentPageId, userId);

  let parseResult: ParseResult | null = null;
  let content: Prisma.InputJsonValue | undefined;
  if (input.rawMarkdown) {
    parseResult = parseContent(input.rawMarkdown);
    if (parseResult.ok) content = parseResult.data as unknown as Prisma.InputJsonValue;
  }

  const now = new Date();
  const max = await prisma.page.aggregate({ where: { parentId: input.parentPageId ?? null, deletedAt: null }, _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? 0) + 1;

  const page = await prisma.$transaction(async (tx) => {
    const created = await tx.page.create({
      data: {
        userId, parentId: input.parentPageId ?? null, title: input.title,
        ...(content !== undefined ? { content } : {}),
        isPublic: false, category: input.category ?? null, sortOrder, childrenCount: 0, createdAt: now, updatedAt: now,
      },
    });
    if (input.parentPageId) {
      await tx.page.update({ where: { id: input.parentPageId }, data: { childrenCount: { increment: 1 }, updatedAt: now } });
    }
    return created;
  });

  return { id: page.id, parseResult };
}

// Updates an owned page; content is overwritten only when re-parsing succeeds (failed parse keeps last good content).
export async function updatePage(userId: string, pageId: string, input: UpdatePageRequest): Promise<{ parseResult: ParseResult | null }> {
  await loadOwnedPage(pageId, userId);
  const data: Prisma.pageUpdateInput = { updatedAt: new Date() };
  if (input.title !== undefined) data.title = input.title;
  if (input.category !== undefined) data.category = input.category ?? null;
  if (input.isPublic !== undefined) data.isPublic = input.isPublic;

  let parseResult: ParseResult | null = null;
  if (input.rawMarkdown !== undefined) {
    parseResult = parseContent(input.rawMarkdown);
    if (parseResult.ok) data.content = parseResult.data as unknown as Prisma.InputJsonValue;
  }

  await prisma.page.update({ where: { id: pageId }, data });
  return { parseResult };
}

// Soft-deletes an owned page and decrements its parent's child count; the home page cannot be deleted.
export async function softDeletePage(userId: string, pageId: string): Promise<void> {
  const page = await loadOwnedPage(pageId, userId);
  const user = await prisma.appuser.findUnique({ where: { id: userId }, select: { homepageId: true } });
  if (user?.homepageId === pageId) throw PageError.homeProtected();

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.page.update({ where: { id: pageId }, data: { deletedAt: now, updatedAt: now } });
    if (page.parentId) await tx.page.update({ where: { id: page.parentId }, data: { childrenCount: { decrement: 1 }, updatedAt: now } });
  });
}

// Permanently deletes a trashed page with all descendants and their comments (no orphans).
export async function permanentDeletePage(userId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: { not: null } } });
  if (!page) throw PageError.notFound();
  if (page.userId !== userId) throw PageError.forbidden();

  await prisma.$transaction(async (tx) => {
    const ids = await collectPageAndDescendants(tx, pageId);
    await tx.comment.deleteMany({ where: { pageId: { in: ids } } });
    await tx.page.deleteMany({ where: { id: { in: ids } } });
  });
}

// Restores a trashed page and re-increments its parent's child count when the parent is live.
export async function restorePage(userId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: { not: null } } });
  if (!page) throw PageError.notFound();
  if (page.userId !== userId) throw PageError.forbidden();

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.page.update({ where: { id: pageId }, data: { deletedAt: null, updatedAt: now } });
    if (page.parentId) {
      const parent = await tx.page.findFirst({ where: { id: page.parentId, deletedAt: null } });
      if (parent) await tx.page.update({ where: { id: page.parentId }, data: { childrenCount: { increment: 1 }, updatedAt: now } });
    }
  });
}

// Swaps the sort order of two owned sibling pages (same parent required).
export async function swapPages(userId: string, pageId1: string, pageId2: string): Promise<void> {
  const page1 = await loadOwnedPage(pageId1, userId);
  const page2 = await loadOwnedPage(pageId2, userId);
  if (page1.parentId !== page2.parentId) throw PageError.swapParentMismatch();
  if (page1.sortOrder === page2.sortOrder) return;

  const s1 = page1.sortOrder, s2 = page2.sortOrder, parentId = page1.parentId, now = new Date();
  await prisma.$transaction(async (tx) => {
    if (s1 < s2) {
      await tx.page.updateMany({ where: { parentId, deletedAt: null, sortOrder: { gt: s1, lte: s2 } }, data: { sortOrder: { decrement: 1 } } });
    } else {
      await tx.page.updateMany({ where: { parentId, deletedAt: null, sortOrder: { gte: s2, lt: s1 } }, data: { sortOrder: { increment: 1 } } });
    }
    await tx.page.update({ where: { id: pageId1 }, data: { sortOrder: s2, updatedAt: now } });
  });
}
```

### 8.10 — CREATE `src/modules/page/page.routes.ts`
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http/async-handler";
import { validate } from "../../common/validation/validate";
import { requireAuth, resolveUser } from "../auth/auth.access";
import { createPageSchema, updatePageSchema, swapPagesSchema } from "./page.schema";
import { toPageDto, toPageListDto, toTrashDto } from "./page.dto";
import * as pageService from "./page.service";

const router = Router();

// GET /trash — list the requester's soft-deleted pages. (Must be before /:pageId.)
router.get("/trash", requireAuth, asyncHandler(async (req, res) => {
  const pages = await pageService.listTrash(req.userId!);
  res.json(pages.map(toTrashDto));
}));

// POST /swap — reorder two sibling pages. (Must be before /:pageId routes.)
router.post("/swap", requireAuth, validate(swapPagesSchema), asyncHandler(async (req, res) => {
  await pageService.swapPages(req.userId!, req.body.pageId1, req.body.pageId2);
  res.status(204).send();
}));

// GET / — list pages (a public parent's children are readable by anyone).
router.get("/", asyncHandler(async (req, res) => {
  const requester = await resolveUser(req);
  const { parentPageId, searchQuery } = req.query as { parentPageId?: string; searchQuery?: string };
  const pages = await pageService.listPages(requester, parentPageId, searchQuery);
  res.json(pages.map(toPageListDto));
}));

// GET /:pageId — fetch a single page (public or owned).
router.get("/:pageId", asyncHandler(async (req, res) => {
  const requester = await resolveUser(req);
  const page = await pageService.getPage(req.params.pageId, requester);
  res.json(toPageDto(page));
}));

// POST / — create a page under an optional owned parent.
router.post("/", requireAuth, validate(createPageSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await pageService.createPage(req.userId!, req.body));
}));

// PUT /:pageId — update an owned page.
router.put("/:pageId", requireAuth, validate(updatePageSchema), asyncHandler(async (req, res) => {
  res.status(200).json(await pageService.updatePage(req.userId!, req.params.pageId, req.body));
}));

// DELETE /:pageId — soft delete, or permanently delete with ?permanent=true.
router.delete("/:pageId", requireAuth, asyncHandler(async (req, res) => {
  if (req.query.permanent === "true") await pageService.permanentDeletePage(req.userId!, req.params.pageId);
  else await pageService.softDeletePage(req.userId!, req.params.pageId);
  res.status(204).send();
}));

// POST /:pageId/restore — restore a page from trash.
router.post("/:pageId/restore", requireAuth, asyncHandler(async (req, res) => {
  await pageService.restorePage(req.userId!, req.params.pageId);
  res.status(204).send();
}));

export default router;
```

### 8.11 — EDIT `src/app.ts` — mount the page router
```ts
import pagesRouter from "./modules/page/page.routes";

// ...after the auth router:
app.use("/backend-api/pages", pagesRouter);
```

---

## Verify

(Get a token from `POST /auth/login` first; use `-H "Authorization: Bearer <token>"`.)

```
# create
curl -s -X POST http://localhost:3000/backend-api/pages \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Notes","rawMarkdown":"# Hello"}'
# -> 201 { id, parseResult: { ok:true, data:{...} } }

# get it -> 200 with content (the parsed AST)
# update with broken markdown -> 200 parseResult.ok=false, GET still shows OLD content
# create child with someone else's parentPageId -> 403 page.forbidden
# delete home page -> 400 page.home_cannot_be_deleted
# swap two pages under different parents -> 400 page.swap_parent_mismatch
# permanent delete (?permanent=true) a trashed parent -> children + comments gone
```

---

## Review checklist

- [ ] Create stores the parsed AST in `content`; the response includes `parseResult`.
- [ ] A failed parse on update **keeps** the previous content.
- [ ] Creating under another user's parent → 403; non‑existent parent → 404 (not 500).
- [ ] Deleting the home page → 400; cross‑parent swap → 400.
- [ ] Permanent delete leaves no orphan child pages or comments.
- [ ] `page.service.ts` imports no Express; throws only `PageError`/`AuthError` (DomainErrors).

---

## What's next

Phase 9 adds **comments** as a nested sub‑resource of pages. → [phase-9.md](phase-9.md)
