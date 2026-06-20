# Phase 9 — Comment Module (nested sub‑resource)

**Goal:** Comments live **under** a page: `/backend-api/pages/:pageId/comments`. Only the page
owner can comment (even on public pages); only the comment's author can edit/delete it.

**What you'll learn:** nested routers with `mergeParams`, modelling a sub‑resource so it can't
be orphaned, and reusing the page module's ownership guard from a sibling service.

**Prerequisites:** Phase 8 complete.

---

## Concept (read once)

- Comments belong to the **page** feature (same module folder). They are not a separate domain.
- **Nesting under the page URL** means a comment is never addressable without its page, so it
  can't be orphaned in the API. We mount a child router with `Router({ mergeParams: true })`
  so it can read `:pageId` from the parent path.
- **Authorization:** creating a comment requires owning the page (`loadOwnedPage`). Reading
  comments follows the page's visibility (public → anyone; private → owner). Editing/deleting a
  comment requires being its author (`comment.forbidden`).

---

## Steps

### 9.1 — CREATE `src/modules/page/comment.errors.ts`
```ts
import { DomainError } from "../../common/errors/domain-error";

// Stable codes (also i18n keys) for comment failures.
export const COMMENT_NOT_FOUND = "comment.not_found";
export const COMMENT_FORBIDDEN = "comment.forbidden";

// Domain errors raised by the comment sub-resource (code only — no HTTP, no text).
export class CommentError extends DomainError {
  // Comment does not exist.
  static notFound() { return new CommentError(COMMENT_NOT_FOUND); }
  // Acting on a comment the requester did not write.
  static forbidden() { return new CommentError(COMMENT_FORBIDDEN); }
}
```

### 9.2 — CREATE `src/modules/page/comment.schema.ts`
```ts
import { z } from "zod";
import { COMMENT_BODY_MAX_LENGTH } from "./page.constants";

// Request body for creating or editing a comment.
export const commentBodySchema = z.object({
  body: z.string().trim().min(1, "validation.comment_empty").max(COMMENT_BODY_MAX_LENGTH, "validation.too_long"),
});
export type CommentBodyRequest = z.infer<typeof commentBodySchema>;
```

### 9.3 — CREATE `src/modules/page/comment.dto.ts`
```ts
import type { comment } from "@prisma/client";

// Maps a comment row to the API response shape.
export const toCommentDto = (c: comment) => ({
  id: c.id, pageId: c.pageId, userId: c.userId, body: c.body, createdAt: c.createdAt, updatedAt: c.updatedAt,
});
```

### 9.4 — CREATE `src/modules/page/comment.service.ts`
```ts
import { prisma } from "../../common/prisma";
import { AuthError } from "../auth/auth.errors";
import { PageError } from "./page.errors";
import { CommentError } from "./comment.errors";
import { loadOwnedPage } from "./page.access";
import type { CommentBodyRequest } from "./comment.schema";

// Loads a comment by id or throws comment.not_found.
async function loadComment(commentId: string) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId } });
  if (!comment) throw CommentError.notFound();
  return comment;
}

// Lists comments for a page that is public or owned by the requester.
export async function listComments(pageId: string, requesterUserId: string | null) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.notFound();
  if (!page.isPublic) {
    if (requesterUserId === null) throw AuthError.unauthenticated();
    if (requesterUserId !== page.userId) throw PageError.forbidden();
  }
  return prisma.comment.findMany({ where: { pageId }, orderBy: { createdAt: "asc" } });
}

// Adds a comment to a page the requester owns (owner-only, even on public pages).
export async function createComment(userId: string, pageId: string, input: CommentBodyRequest): Promise<{ id: string }> {
  await loadOwnedPage(pageId, userId);
  const now = new Date();
  const comment = await prisma.comment.create({ data: { pageId, userId, body: input.body, createdAt: now, updatedAt: now } });
  return { id: comment.id };
}

// Updates the body of a comment written by the requester.
export async function updateComment(userId: string, commentId: string, input: CommentBodyRequest): Promise<void> {
  const comment = await loadComment(commentId);
  if (comment.userId !== userId) throw CommentError.forbidden();
  await prisma.comment.update({ where: { id: commentId }, data: { body: input.body, updatedAt: new Date() } });
}

// Deletes a comment written by the requester.
export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const comment = await loadComment(commentId);
  if (comment.userId !== userId) throw CommentError.forbidden();
  await prisma.comment.delete({ where: { id: commentId } });
}
```

### 9.5 — CREATE `src/modules/page/comment.routes.ts`
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http/async-handler";
import { validate } from "../../common/validation/validate";
import { requireAuth, resolveUser } from "../auth/auth.access";
import { commentBodySchema } from "./comment.schema";
import { toCommentDto } from "./comment.dto";
import * as commentService from "./comment.service";

// mergeParams lets this nested router read :pageId from the parent route.
const router = Router({ mergeParams: true });

// GET / — list comments for the page (public pages readable by anyone).
router.get("/", asyncHandler(async (req, res) => {
  const requester = await resolveUser(req);
  const comments = await commentService.listComments(req.params.pageId, requester);
  res.json(comments.map(toCommentDto));
}));

// POST / — add a comment (page owner only).
router.post("/", requireAuth, validate(commentBodySchema), asyncHandler(async (req, res) => {
  res.status(201).json(await commentService.createComment(req.userId!, req.params.pageId, req.body));
}));

// PUT /:commentId — edit your own comment.
router.put("/:commentId", requireAuth, validate(commentBodySchema), asyncHandler(async (req, res) => {
  await commentService.updateComment(req.userId!, req.params.commentId, req.body);
  res.status(204).send();
}));

// DELETE /:commentId — delete your own comment.
router.delete("/:commentId", requireAuth, asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.userId!, req.params.commentId);
  res.status(204).send();
}));

export default router;
```

### 9.6 — EDIT `src/modules/page/page.routes.ts` — mount the nested comment router

Add the import and mount it **at the top** of the router (before `/:pageId` routes):
```ts
import commentsRouter from "./comment.routes";

// ...right after `const router = Router();`
// Comments are nested under a page so they can't be orphaned.
router.use("/:pageId/comments", commentsRouter);
```

---

## Verify

(Use account **A**'s token unless noted.)

```
# A creates a comment on A's page
curl -s -X POST http://localhost:3000/backend-api/pages/<A_pageId>/comments \
  -H "Authorization: Bearer <A_token>" -H "Content-Type: application/json" \
  -d '{"body":"first note"}'
# -> 201 { id }

# list -> 200 [ {body:"first note", ...} ]

# B tries to comment on A's page -> 403 page.forbidden
# empty body -> 400 validation.failed ("Comment can't be empty.")
# B tries to edit A's comment -> 403 comment.forbidden
# A deletes own comment -> 204
```

---

## Review checklist

- [ ] Comments are reachable only under `/pages/:pageId/comments`.
- [ ] Only the page owner can create a comment (public pages included → 403 for others).
- [ ] Empty comment → 400; editing/deleting someone else's comment → 403 `comment.forbidden`.
- [ ] `comment.service.ts` imports no Express; throws only DomainErrors.
- [ ] The nested router is mounted before `/:pageId` routes.

---

## What's next

Phase 10 proves the architecture: **unit‑test the domain alone**, add integration tests, and
harden for production (rate limit, headers, prod run). → [phase-10.md](phase-10.md)
