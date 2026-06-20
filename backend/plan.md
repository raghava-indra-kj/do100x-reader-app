# Backend Hardening & Refactor Plan

A single, ordered blueprint to (a) fix 8 security / data‑integrity issues and
(b) restructure the backend into a **feature‑based** layout with a proper error
hierarchy and verified transaction safety.

Execute the steps **top to bottom**. Each step says **CREATE**, **REPLACE**, **EDIT**,
or **DELETE** a file and gives the full content. No decisions required.

---

## 0. Scope

**Issues being fixed**

1. `POST /pages/:pageId/comments` — no page‑ownership check (anyone can write on others'/public pages).
2. `POST /pages` — parent not validated (cross‑user tree pollution, 500 on missing parent).
3. `PUT /pages/:pageId` — failed parse wipes existing content (silent data loss).
4. Email not normalized — duplicate accounts / login mismatch.
5. Missing input validation on writes (trim, length, type).
6. `POST /pages/swap` — unguarded input + cross‑parent swaps corrupt sort order.
7. Homepage can be soft‑deleted — user locked out.
8. Delete doesn't cascade — orphaned child pages & comments.

**No Prisma migration is required** for these fixes — the existing schema already
supports them. (Optional indexes are in the Appendix.)

---

## 1. Architecture & conventions (read before coding)

**Two feature modules, one shared core.**
- `modules/auth` — authentication, users, sessions, onboarding, access middleware.
- `modules/page` — pages **and comments** (comments are a sub‑resource of pages).
- `common` — cross‑cutting infrastructure only (Prisma, error base, async helper, validation middleware).

**Dependency rule (no cycles):** `common` depends on nothing; `auth` depends on `common`;
`page` depends on `common` and `auth`. `auth` must **never** import from `page`.

**Error hierarchy.** `AppError` is the base. Each domain extends it:
- `AuthError extends AppError` (auth feature) — identity/session failures.
- `PageError extends AppError` (page feature) — page/comment resource failures.
- `ValidationError extends AppError` (common) — generic 400 for bad input or violated rules.
The global handler catches anything `instanceof AppError`.

**Three model layers, kept separate.**
- Request models → `*.schema.ts` (Zod) + `z.infer` types.
- Domain models → `@prisma/client` entities.
- Response models → `*.dto.ts` mappers.

**Other rules.**
- Routes are thin: `requireAuth?` → `validateBody(schema)?` → call a **service** → map with a **dto** → respond. No logic in routes.
- Services take plain inputs and return data or throw an `AppError` subclass. They never touch `req`/`res` (so they are unit‑testable).
- Every multi‑row write runs inside `prisma.$transaction` (see §15).
- **Comments**: exactly one or two lines above every `type` and every function (including private helpers and static factories). Never comment individual parameters.
- Wrap every route handler and async middleware in `asyncHandler`.

---

## 2. Final folder structure

```
src/
├── common/
│   ├── prisma.ts
│   ├── http.ts                      # asyncHandler
│   ├── errors/
│   │   └── app-error.ts             # AppError (base), ValidationError, INTERNAL_ERROR
│   └── middleware/
│       └── validate.ts              # validateBody(schema)
├── modules/
│   ├── auth/
│   │   ├── auth.constants.ts        # name/email/password limits, bcrypt rounds, token bytes
│   │   ├── auth.errors.ts           # AUTH_* codes + AuthError
│   │   ├── auth.schema.ts           # signupSchema, loginSchema
│   │   ├── auth.access.ts           # resolveUser, requireUser, requireAuth, Request augmentation
│   │   ├── auth.service.ts          # signup, login, getProfile, logout, ensureHomepage
│   │   └── auth.routes.ts
│   └── page/
│       ├── page.constants.ts        # page + comment limits
│       ├── page.errors.ts           # PAGE_*/COMMENT_* codes + PageError
│       ├── page.schema.ts           # idSchema, create/update/swap page schemas
│       ├── comment.schema.ts        # commentBodySchema
│       ├── page.access.ts           # loadOwnedPage
│       ├── page.parse.ts            # parseContent (md-ast wrapper)
│       ├── page-tree.ts             # collectPageAndDescendants
│       ├── page.dto.ts              # toPageDto, toPageListDto, toTrashDto
│       ├── comment.dto.ts           # toCommentDto
│       ├── page.service.ts
│       ├── comment.service.ts
│       ├── page.routes.ts
│       └── comment.routes.ts
└── index.ts
```

**Files to DELETE after the new structure compiles** (old layout):
`src/error-codes.ts`, `src/errors.ts`, `src/prisma.ts`, `src/lib/`, `src/middleware/`, `src/routes/`.

---

## 3. Dependencies

**Step 3.1 — REPLACE `package.json`** (adds `zod`; adds a test script + `vitest`).

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Reader backend API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@reader/md-ast": "*",
    "bcrypt": "^6.0.0",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^7.5.0",
    "prisma": "^5.22.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^5.0.6",
    "@types/node": "^25.9.3",
    "nodemon": "^3.1.14",
    "tsx": "^4.19.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9"
  }
}
```

**Step 3.2** — from `backend/`, run `npm install`.

---

## 4. common/

**Step 4.1 — CREATE `src/common/prisma.ts`**
```ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for the whole app.
export const prisma = new PrismaClient();
```

**Step 4.2 — CREATE `src/common/http.ts`**
```ts
import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async handler so thrown/rejected errors reach the global error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);
```

**Step 4.3 — CREATE `src/common/errors/app-error.ts`**
```ts
// Base application error: a string code, an HTTP status, and a user-facing message.
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Code used when an unexpected (non-AppError) failure reaches the global handler.
export const INTERNAL_ERROR = "INTERNAL_ERROR";

// Code emitted for any invalid input or violated business rule.
export const VALIDATION_ERROR = "VALIDATION_ERROR";

// Generic 400 for invalid input or violated business rules.
export class ValidationError extends AppError {
  constructor(message: string) {
    super(VALIDATION_ERROR, 400, message);
  }
}
```

**Step 4.4 — CREATE `src/common/middleware/validate.ts`**
```ts
import { ZodType } from "zod";
import { asyncHandler } from "../http";
import { ValidationError } from "../errors/app-error";

// Validates and normalizes req.body against a Zod schema before the handler runs.
export const validateBody = (schema: ZodType) =>
  asyncHandler(async (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Invalid request.");
    req.body = result.data;
    next();
  });
```

---

## 5. modules/auth/

**Step 5.1 — CREATE `src/modules/auth/auth.constants.ts`**
```ts
// Field limits and crypto parameters for the auth/user feature (mirror appuser columns).
export const PERSON_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt ignores bytes past 72
export const BCRYPT_SALT_ROUNDS = 10;
export const SESSION_TOKEN_BYTES = 32;
```

**Step 5.2 — CREATE `src/modules/auth/auth.errors.ts`**
```ts
import { AppError } from "../../common/errors/app-error";

// Error codes emitted by the auth feature.
export const AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN";
export const AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS";
export const AUTH_REQUIRED = "AUTH_REQUIRED";

// Authentication and identity failures.
export class AuthError extends AppError {
  // Signup with an email that already exists.
  static emailTaken() {
    return new AuthError(AUTH_EMAIL_TAKEN, 409, "Email is already taken.");
  }
  // Wrong email or password (same message for both to avoid user enumeration).
  static invalidCredentials() {
    return new AuthError(AUTH_INVALID_CREDENTIALS, 401, "Invalid email or password.");
  }
  // No valid session on a protected action.
  static unauthenticated() {
    return new AuthError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
  }
}
```

**Step 5.3 — CREATE `src/modules/auth/auth.schema.ts`**
```ts
import { z } from "zod";
import {
  PERSON_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./auth.constants";

// Trims and lowercases the email BEFORE the format check (order matters in Zod).
const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email("A valid email is required.").max(EMAIL_MAX_LENGTH)
);

// Request body for POST /auth/signup.
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(PERSON_NAME_MAX_LENGTH),
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH),
});
export type SignupRequest = z.infer<typeof signupSchema>;

// Request body for POST /auth/login.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required."),
});
export type LoginRequest = z.infer<typeof loginSchema>;
```

**Step 5.4 — CREATE `src/modules/auth/auth.access.ts`**
```ts
import { Request } from "express";
import { prisma } from "../../common/prisma";
import { asyncHandler } from "../../common/http";
import { AuthError } from "./auth.errors";

// Express request augmentation to carry the authenticated userId.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Returns the userId behind a valid Bearer token, or null when absent/invalid.
export async function resolveUser(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const session = await prisma.session.findFirst({ where: { token: header.slice(7), isActive: true } });
  return session?.userId ?? null;
}

// Returns the authenticated userId or throws AUTH_REQUIRED.
export async function requireUser(req: Request): Promise<string> {
  const userId = await resolveUser(req);
  if (!userId) throw AuthError.unauthenticated();
  return userId;
}

// Middleware that requires a valid session and sets req.userId.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  req.userId = await requireUser(req);
  next();
});
```

**Step 5.5 — CREATE `src/modules/auth/auth.service.ts`**
```ts
import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../common/prisma";
import { AuthError } from "./auth.errors";
import { BCRYPT_SALT_ROUNDS, SESSION_TOKEN_BYTES } from "./auth.constants";
import type { SignupRequest, LoginRequest } from "./auth.schema";

// Data returned to the client after a successful auth action.
export interface AuthResult {
  token: string;
  userId: string;
  name: string;
  email: string;
  homepageId: string;
}

// Ensures the user has a homepage within the given transaction, creating one if missing.
async function ensureHomepage(tx: Prisma.TransactionClient, userId: string): Promise<string> {
  const user = await tx.appuser.findUniqueOrThrow({ where: { id: userId } });
  if (user.homepageId) return user.homepageId;

  const pageId = randomUUID();
  const now = new Date();
  await tx.page.create({
    data: { id: pageId, userId, parentId: null, title: "Home", isPublic: false, sortOrder: 1, childrenCount: 0, createdAt: now, updatedAt: now },
  });
  await tx.appuser.update({ where: { id: userId }, data: { homepageId: pageId } });
  return pageId;
}

// Creates an active session row for a user and returns its token.
async function createSession(userId: string): Promise<string> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  await prisma.session.create({ data: { userId, token, isActive: true, createdAt: new Date() } });
  return token;
}

// Registers a new user and provisions their homepage atomically, then opens a session.
export async function signup(input: SignupRequest): Promise<AuthResult> {
  const existing = await prisma.appuser.findFirst({ where: { email: input.email } });
  if (existing) throw AuthError.emailTaken();

  const userId = randomUUID();
  const password = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const homepageId = await prisma.$transaction(async (tx) => {
    await tx.appuser.create({ data: { id: userId, name: input.name, email: input.email, password, createdAt: new Date() } });
    return ensureHomepage(tx, userId);
  });

  const token = await createSession(userId);
  return { token, userId, name: input.name, email: input.email, homepageId };
}

// Verifies credentials, ensures a homepage exists, and opens a session.
export async function login(input: LoginRequest): Promise<AuthResult> {
  const user = await prisma.appuser.findFirst({ where: { email: input.email } });
  if (!user) throw AuthError.invalidCredentials();
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw AuthError.invalidCredentials();

  const homepageId = await prisma.$transaction((tx) => ensureHomepage(tx, user.id));
  const token = await createSession(user.id);
  return { token, userId: user.id, name: user.name, email: user.email, homepageId };
}

// Returns the current user's profile, provisioning a homepage if needed.
export async function getProfile(userId: string) {
  const user = await prisma.appuser.findUniqueOrThrow({ where: { id: userId } });
  const homepageId = await prisma.$transaction((tx) => ensureHomepage(tx, userId));
  return { userId: user.id, name: user.name, email: user.email, homepageId };
}

// Deactivates the session for the given token (idempotent logout).
export async function logout(token: string): Promise<void> {
  await prisma.session.updateMany({ where: { token }, data: { isActive: false } });
}
```

**Step 5.6 — CREATE `src/modules/auth/auth.routes.ts`**
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth, requireUser } from "./auth.access";
import { signupSchema, loginSchema } from "./auth.schema";
import * as authService from "./auth.service";

const router = Router();

// POST /signup — register a new user and open a session.
router.post(
  "/signup",
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await authService.signup(req.body));
  })
);

// POST /login — verify credentials and open a session.
router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(await authService.login(req.body));
  })
);

// GET /session — return the current user's profile for a valid token.
router.get(
  "/session",
  asyncHandler(async (req, res) => {
    const userId = await requireUser(req);
    res.status(200).json(await authService.getProfile(userId));
  })
);

// DELETE /session — log out by deactivating the current session.
router.delete(
  "/session",
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.headers.authorization!.slice(7));
    res.status(204).send();
  })
);

export default router;
```

---

## 6. modules/page/ — building blocks

**Step 6.1 — CREATE `src/modules/page/page.constants.ts`**
```ts
// Field limits for the page and comment resources (mirror page/comment columns).
export const PAGE_TITLE_MAX_LENGTH = 1000;
export const PAGE_CATEGORY_MAX_LENGTH = 255;
export const COMMENT_BODY_MAX_LENGTH = 5000;
```

**Step 6.2 — CREATE `src/modules/page/page.errors.ts`**
```ts
import { AppError } from "../../common/errors/app-error";

// Error codes emitted by the page/comment feature.
export const PAGE_NOT_FOUND = "PAGE_NOT_FOUND";
export const PAGE_FORBIDDEN = "PAGE_FORBIDDEN";
export const COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND";

// Page and comment resource failures.
export class PageError extends AppError {
  // Page does not exist (or is soft-deleted when a live page was expected).
  static pageNotFound(message = "Page not found.") {
    return new PageError(PAGE_NOT_FOUND, 404, message);
  }
  // Authenticated user is not allowed to access this page or comment.
  static forbidden(message = "You do not have access to this page.") {
    return new PageError(PAGE_FORBIDDEN, 403, message);
  }
  // Comment does not exist.
  static commentNotFound() {
    return new PageError(COMMENT_NOT_FOUND, 404, "Comment not found.");
  }
}
```

**Step 6.3 — CREATE `src/modules/page/page.schema.ts`**
```ts
import { z } from "zod";
import { PAGE_TITLE_MAX_LENGTH, PAGE_CATEGORY_MAX_LENGTH } from "./page.constants";

// Reusable UUID validator for page id fields.
export const idSchema = z.uuid("A valid id is required.");

// Request body for POST /pages.
export const createPageSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(PAGE_TITLE_MAX_LENGTH),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH).nullable().optional(),
  parentPageId: idSchema.nullable().optional(),
});
export type CreatePageRequest = z.infer<typeof createPageSchema>;

// Request body for PUT /pages/:pageId (all fields optional).
export const updatePageSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(PAGE_TITLE_MAX_LENGTH).optional(),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH).nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdatePageRequest = z.infer<typeof updatePageSchema>;

// Request body for POST /pages/swap.
export const swapPagesSchema = z.object({ pageId1: idSchema, pageId2: idSchema });
export type SwapPagesRequest = z.infer<typeof swapPagesSchema>;
```

**Step 6.4 — CREATE `src/modules/page/comment.schema.ts`**
```ts
import { z } from "zod";
import { COMMENT_BODY_MAX_LENGTH } from "./page.constants";

// Request body for creating or editing a comment.
export const commentBodySchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty.").max(COMMENT_BODY_MAX_LENGTH),
});
export type CommentBodyRequest = z.infer<typeof commentBodySchema>;
```

**Step 6.5 — CREATE `src/modules/page/page.access.ts`**
```ts
import { prisma } from "../../common/prisma";
import { PageError } from "./page.errors";

// Loads a live page owned by userId, else throws PAGE_NOT_FOUND or PAGE_FORBIDDEN.
export async function loadOwnedPage(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.pageNotFound();
  if (page.userId !== userId) throw PageError.forbidden();
  return page;
}
```

**Step 6.6 — CREATE `src/modules/page/page.parse.ts`**
```ts
import { safeParseMarkdown } from "@reader/md-ast";
import type { ParseResult } from "@reader/md-ast";

// Parses raw markdown into a ParseResult; callers decide what to persist.
export const parseContent = (rawMarkdown: string): ParseResult =>
  safeParseMarkdown({ source: rawMarkdown });
```

**Step 6.7 — CREATE `src/modules/page/page-tree.ts`**
```ts
import { Prisma } from "@prisma/client";

// Returns the page id plus every descendant id at any depth (within a transaction).
export async function collectPageAndDescendants(
  tx: Prisma.TransactionClient,
  rootId: string
): Promise<string[]> {
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

**Step 6.8 — CREATE `src/modules/page/page.dto.ts`**
```ts
import type { page } from "@prisma/client";

// Maps a page row to the list/summary response shape.
export const toPageListDto = (p: page) => ({
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
});

// Maps a page row to the full response shape (includes parsed content).
export const toPageDto = (p: page) => ({ ...toPageListDto(p), content: p.content ?? null });

// Maps a trashed page row, exposing deletedAt for the trash view.
export const toTrashDto = (p: page) => ({ ...toPageListDto(p), deletedAt: p.deletedAt });
```

**Step 6.9 — CREATE `src/modules/page/comment.dto.ts`**
```ts
import type { comment } from "@prisma/client";

// Maps a comment row to the API response shape.
export const toCommentDto = (c: comment) => ({
  id: c.id,
  pageId: c.pageId,
  userId: c.userId,
  body: c.body,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});
```

> If TS can't find the `page`/`comment` type names, run `npx prisma generate`, or use
> `Prisma.pageGetPayload<{}>` / `Prisma.commentGetPayload<{}>`.

---

## 7. modules/page/ — services

**Step 7.1 — CREATE `src/modules/page/page.service.ts`**
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../common/prisma";
import { ValidationError } from "../../common/errors/app-error";
import { AuthError } from "../auth/auth.errors";
import { PageError } from "./page.errors";
import { loadOwnedPage } from "./page.access";
import { parseContent } from "./page.parse";
import { collectPageAndDescendants } from "./page-tree";
import type { CreatePageRequest, UpdatePageRequest } from "./page.schema";
import type { ParseResult } from "@reader/md-ast";

// Loads a live page by id or throws PAGE_NOT_FOUND (no ownership check).
async function loadLivePage(pageId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.pageNotFound();
  return page;
}

// Throws unless the requester owns the resource (401 when anonymous, 403 otherwise).
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
      return prisma.page.findMany({
        where: { parentId: parentPageId, deletedAt: null, isPublic: true },
        orderBy: { sortOrder: "asc" },
      });
    }
    assertOwnership(parent.userId, requesterUserId);
    return prisma.page.findMany({
      where: {
        parentId: parentPageId,
        deletedAt: null,
        userId: parent.userId,
        ...(searchQuery ? { title: { contains: searchQuery } } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (requesterUserId === null) throw AuthError.unauthenticated();
  return prisma.page.findMany({
    where: {
      userId: requesterUserId,
      deletedAt: null,
      ...(parentPageId === "null" ? { parentId: null } : {}),
      ...(searchQuery ? { title: { contains: searchQuery } } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });
}

// Lists the requester's soft-deleted pages (trash).
export async function listTrash(userId: string) {
  return prisma.page.findMany({ where: { userId, deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } });
}

// Creates a page under an optional owned parent; stores parsed content only when parsing succeeds.
export async function createPage(
  userId: string,
  input: CreatePageRequest
): Promise<{ id: string; parseResult: ParseResult | null }> {
  if (input.parentPageId) await loadOwnedPage(input.parentPageId, userId);

  let parseResult: ParseResult | null = null;
  let content: Prisma.InputJsonValue | undefined;
  if (input.rawMarkdown) {
    parseResult = parseContent(input.rawMarkdown);
    if (parseResult.ok) content = parseResult.data as unknown as Prisma.InputJsonValue;
  }

  const now = new Date();
  const max = await prisma.page.aggregate({
    where: { parentId: input.parentPageId ?? null, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? 0) + 1;

  const page = await prisma.$transaction(async (tx) => {
    const created = await tx.page.create({
      data: {
        userId,
        parentId: input.parentPageId ?? null,
        title: input.title,
        ...(content !== undefined ? { content } : {}),
        isPublic: false,
        category: input.category ?? null,
        sortOrder,
        childrenCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
    if (input.parentPageId) {
      await tx.page.update({
        where: { id: input.parentPageId },
        data: { childrenCount: { increment: 1 }, updatedAt: now },
      });
    }
    return created;
  });

  return { id: page.id, parseResult };
}

// Updates an owned page; content is overwritten only when re-parsing succeeds (a failed parse keeps the last good content).
export async function updatePage(
  userId: string,
  pageId: string,
  input: UpdatePageRequest
): Promise<{ parseResult: ParseResult | null }> {
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
  if (user?.homepageId === pageId) throw new ValidationError("Your home page can't be deleted.");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.page.update({ where: { id: pageId }, data: { deletedAt: now, updatedAt: now } });
    if (page.parentId) {
      await tx.page.update({ where: { id: page.parentId }, data: { childrenCount: { decrement: 1 }, updatedAt: now } });
    }
  });
}

// Permanently deletes a trashed page with all descendants and their comments (no orphans).
export async function permanentDeletePage(userId: string, pageId: string): Promise<void> {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: { not: null } } });
  if (!page) throw PageError.pageNotFound("Page not found in trash.");
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
  if (!page) throw PageError.pageNotFound("Page not found in trash.");
  if (page.userId !== userId) throw PageError.forbidden();

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.page.update({ where: { id: pageId }, data: { deletedAt: null, updatedAt: now } });
    if (page.parentId) {
      const parent = await tx.page.findFirst({ where: { id: page.parentId, deletedAt: null } });
      if (parent) {
        await tx.page.update({ where: { id: page.parentId }, data: { childrenCount: { increment: 1 }, updatedAt: now } });
      }
    }
  });
}

// Swaps the sort order of two owned sibling pages (same parent required).
export async function swapPages(userId: string, pageId1: string, pageId2: string): Promise<void> {
  const page1 = await loadOwnedPage(pageId1, userId);
  const page2 = await loadOwnedPage(pageId2, userId);
  if (page1.parentId !== page2.parentId) {
    throw new ValidationError("Pages must share the same parent to be reordered.");
  }
  if (page1.sortOrder === page2.sortOrder) return;

  const s1 = page1.sortOrder;
  const s2 = page2.sortOrder;
  const parentId = page1.parentId;
  const now = new Date();

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
    await tx.page.update({ where: { id: pageId1 }, data: { sortOrder: s2, updatedAt: now } });
  });
}
```

**Step 7.2 — CREATE `src/modules/page/comment.service.ts`**
```ts
import { prisma } from "../../common/prisma";
import { AuthError } from "../auth/auth.errors";
import { PageError } from "./page.errors";
import { loadOwnedPage } from "./page.access";
import type { CommentBodyRequest } from "./comment.schema";

// Loads a comment by id or throws COMMENT_NOT_FOUND.
async function loadComment(commentId: string) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId } });
  if (!comment) throw PageError.commentNotFound();
  return comment;
}

// Lists comments for a page that is public or owned by the requester.
export async function listComments(pageId: string, requesterUserId: string | null) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw PageError.pageNotFound();
  if (!page.isPublic) {
    if (requesterUserId === null) throw AuthError.unauthenticated();
    if (requesterUserId !== page.userId) throw PageError.forbidden();
  }
  return prisma.comment.findMany({ where: { pageId }, orderBy: { createdAt: "asc" } });
}

// Adds a comment to a page the requester owns (owner-only, even on public pages).
export async function createComment(
  userId: string,
  pageId: string,
  input: CommentBodyRequest
): Promise<{ id: string }> {
  await loadOwnedPage(pageId, userId);
  const now = new Date();
  const comment = await prisma.comment.create({
    data: { pageId, userId, body: input.body, createdAt: now, updatedAt: now },
  });
  return { id: comment.id };
}

// Updates the body of a comment owned by the requester.
export async function updateComment(userId: string, commentId: string, input: CommentBodyRequest): Promise<void> {
  const comment = await loadComment(commentId);
  if (comment.userId !== userId) throw PageError.forbidden("You can only edit your own comments.");
  await prisma.comment.update({ where: { id: commentId }, data: { body: input.body, updatedAt: new Date() } });
}

// Deletes a comment owned by the requester.
export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const comment = await loadComment(commentId);
  if (comment.userId !== userId) throw PageError.forbidden("You can only delete your own comments.");
  await prisma.comment.delete({ where: { id: commentId } });
}
```

---

## 8. modules/page/ — routes

**Step 8.1 — CREATE `src/modules/page/comment.routes.ts`**
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth, resolveUser } from "../auth/auth.access";
import { commentBodySchema } from "./comment.schema";
import { toCommentDto } from "./comment.dto";
import * as commentService from "./comment.service";

// mergeParams lets this nested router read :pageId from the parent route.
const router = Router({ mergeParams: true });

// GET / — list comments for the page (public pages readable by anyone).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const requester = await resolveUser(req);
    const comments = await commentService.listComments(req.params.pageId, requester);
    res.json(comments.map(toCommentDto));
  })
);

// POST / — add a comment (page owner only).
router.post(
  "/",
  requireAuth,
  validateBody(commentBodySchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await commentService.createComment(req.userId!, req.params.pageId, req.body));
  })
);

// PUT /:commentId — edit your own comment.
router.put(
  "/:commentId",
  requireAuth,
  validateBody(commentBodySchema),
  asyncHandler(async (req, res) => {
    await commentService.updateComment(req.userId!, req.params.commentId, req.body);
    res.status(204).send();
  })
);

// DELETE /:commentId — delete your own comment.
router.delete(
  "/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await commentService.deleteComment(req.userId!, req.params.commentId);
    res.status(204).send();
  })
);

export default router;
```

**Step 8.2 — CREATE `src/modules/page/page.routes.ts`**
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http";
import { validateBody } from "../../common/middleware/validate";
import { requireAuth, resolveUser } from "../auth/auth.access";
import { createPageSchema, updatePageSchema, swapPagesSchema } from "./page.schema";
import { toPageDto, toPageListDto, toTrashDto } from "./page.dto";
import * as pageService from "./page.service";
import commentsRouter from "./comment.routes";

const router = Router();

// Comments are nested under a page so they can't be orphaned.
router.use("/:pageId/comments", commentsRouter);

// GET /trash — list the requester's soft-deleted pages. (Must be before /:pageId.)
router.get(
  "/trash",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pages = await pageService.listTrash(req.userId!);
    res.json(pages.map(toTrashDto));
  })
);

// POST /swap — reorder two sibling pages. (Must be before /:pageId routes.)
router.post(
  "/swap",
  requireAuth,
  validateBody(swapPagesSchema),
  asyncHandler(async (req, res) => {
    await pageService.swapPages(req.userId!, req.body.pageId1, req.body.pageId2);
    res.status(204).send();
  })
);

// GET / — list pages (a public parent's children are readable by anyone).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const requester = await resolveUser(req);
    const { parentPageId, searchQuery } = req.query as { parentPageId?: string; searchQuery?: string };
    const pages = await pageService.listPages(requester, parentPageId, searchQuery);
    res.json(pages.map(toPageListDto));
  })
);

// GET /:pageId — fetch a single page (public or owned).
router.get(
  "/:pageId",
  asyncHandler(async (req, res) => {
    const requester = await resolveUser(req);
    const page = await pageService.getPage(req.params.pageId, requester);
    res.json(toPageDto(page));
  })
);

// POST / — create a page under an optional owned parent.
router.post(
  "/",
  requireAuth,
  validateBody(createPageSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await pageService.createPage(req.userId!, req.body));
  })
);

// PUT /:pageId — update an owned page.
router.put(
  "/:pageId",
  requireAuth,
  validateBody(updatePageSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(await pageService.updatePage(req.userId!, req.params.pageId, req.body));
  })
);

// DELETE /:pageId — soft delete, or permanently delete with ?permanent=true.
router.delete(
  "/:pageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.query.permanent === "true") {
      await pageService.permanentDeletePage(req.userId!, req.params.pageId);
    } else {
      await pageService.softDeletePage(req.userId!, req.params.pageId);
    }
    res.status(204).send();
  })
);

// POST /:pageId/restore — restore a page from trash.
router.post(
  "/:pageId/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    await pageService.restorePage(req.userId!, req.params.pageId);
    res.status(204).send();
  })
);

export default router;
```

---

## 9. Wiring

**Step 9.1 — REPLACE `src/index.ts`**
```ts
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import { AppError, INTERNAL_ERROR } from "./common/errors/app-error";
import authRouter from "./modules/auth/auth.routes";
import pagesRouter from "./modules/page/page.routes";

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDist = path.resolve(__dirname, "../../reader-frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));
const isDev = process.env.NODE_ENV !== "production";

app.use(express.json({ limit: "10mb" }));

// Rate limiters: a broad cap for the whole API and a stricter cap for auth.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT", message: "Too many requests. Try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT", message: "Too many auth requests. Try again later." },
});
app.use("/backend-api", globalLimiter);
app.use("/backend-api/auth", authLimiter);

if (hasFrontend) app.use(express.static(frontendDist));

app.get("/backend-api/status", (_req, res) => {
  res.json({ success: true });
});
app.use("/backend-api/auth", authRouter);
app.use("/backend-api/pages", pagesRouter);

if (hasFrontend) {
  app.get("*splat", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Global error handler: AppError subclasses become structured responses; everything else is 500.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message, ...(isDev ? { stack: err.stack } : {}) });
  } else {
    console.error(err);
    res.status(500).json({ code: INTERNAL_ERROR, message: "Something went wrong. Please try again.", ...(isDev ? { stack: err?.stack } : {}) });
  }
});

process.on("uncaughtException", (e) => console.error("Uncaught exception:", e));
process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (hasFrontend) console.log("Serving frontend from reader-frontend/dist");
});
```

**Step 9.2 — DELETE the old layout:** `src/error-codes.ts`, `src/errors.ts`, `src/prisma.ts`, `src/lib/`, `src/middleware/`, `src/routes/`.

---

## 10. Issue → fix traceability

| # | Issue | Fixed in |
|---|-------|----------|
| 1 | Comment ownership | `comment.service.createComment` → `loadOwnedPage` (7.2) |
| 2 | Parent not validated | `page.service.createPage` → `loadOwnedPage` (7.1) |
| 3 | Failed parse wipes content | `page.service.updatePage` sets content only when `parseResult.ok` (7.1) |
| 4 | Email not normalized | `emailField` in `auth.schema` (5.3) |
| 5 | Missing validation | all `*.schema.ts` + `validateBody` (4.4, 5.3, 6.3, 6.4) |
| 6 | Swap unguarded / cross-parent | `swapPagesSchema` + same-parent check in `swapPages` (6.3, 7.1) |
| 7 | Homepage deletable | home guard in `softDeletePage` (7.1) |
| 8 | Delete orphans | `permanentDeletePage` + `collectPageAndDescendants` (7.1, 6.7) |

---

## 11. Verification

**Step 11.1 — Type check**
```
cd backend
npx prisma generate
npx tsc --noEmit
```
Must be clean.

**Step 11.2 — Run:** `npm run dev`

**Step 11.3 — Manual API checks** (two accounts A and B; send `Authorization: Bearer <token>`):

| Check | Expectation |
|-------|-------------|
| B posts a comment to A's page | **403** (PAGE_FORBIDDEN) |
| Create page with another user's `parentPageId` | **403** |
| Create page with a non-existent `parentPageId` | **404** (not 500) |
| `PUT` a page with broken markdown, then `GET` it | 200 + `parseResult.ok=false`; **old content intact** |
| Signup `Bob@X.com `, then login `bob@x.com` | login succeeds; second signup any casing → **409** |
| Empty `title` / empty comment / 2000-char title | **400** |
| `swap` with a missing/invalid id | **400** |
| `swap` two pages under different parents | **400** |
| Delete the home page | **400** |
| Permanent-delete a parent with children + comments | children & comments gone; **no orphan rows** |

---

## 12. Testing readiness (future, not required now)

- **Pure / isolated**: `*.schema.ts`, `*.dto.ts`, `page-tree.ts`, `page.parse.ts` — test directly.
- **Services**: import a function, pass inputs, assert the result or the thrown error class/`code`. Use a test DB or a mocked `prisma`.
- **Routes**: integration-test with `supertest`.
- Suggested layout: `src/modules/<feature>/<name>.test.ts`, run with `npm test`.

---

## 13. Appendix — optional hardening (not part of the 8 fixes)

- **DB indexes** (perf): add to `schema.prisma`, then `npx prisma migrate dev --name add_indexes`.
  ```prisma
  model page    { /* ...existing... */ @@index([userId]) @@index([parentId]) }
  model comment { /* ...existing... */ @@index([pageId]) }
  ```
- **Reverse proxy**: in `index.ts` add `app.set("trust proxy", 1)` so rate limiting counts per real client IP.
- **Headers**: add `helmet` and `app.use(helmet())`.
- **Prod run**: `@reader/md-ast` ships TypeScript, so `node dist` can't load it. Either run prod with `tsx src/index.ts`, or give `md-ast` a build step and point its `exports` at compiled JS.
- **Body limit**: lower `express.json({ limit: "10mb" })` to `"1mb"` unless large pages are expected.

---

## 14. Module dependency map (must stay acyclic)

```
common  ─────────────►  (no imports from app code)
  ▲   ▲
  │   │
auth ──┘                auth → common
  ▲
  │
page ───────────────►   page → common, page → auth   (auth NEVER imports page)
```

`ensureHomepage` lives in **auth** (user onboarding) and writes the initial page row
directly within the signup/login transaction — this keeps `auth` free of any import
from `page` and avoids a dependency cycle.

---

## 15. Transaction safety (audited — every multi-row write is atomic)

| Operation | Writes inside one `$transaction` |
|---|---|
| `ensureHomepage` | `page.create` + `appuser.update` |
| `signup` | `appuser.create` + `ensureHomepage` (single outer tx) |
| `login` / `getProfile` | `ensureHomepage` (wrapped in tx) |
| `createPage` | `page.create` + parent `childrenCount` increment |
| `softDeletePage` | `page.update` + parent `childrenCount` decrement |
| `permanentDeletePage` | `comment.deleteMany` + `page.deleteMany` (page + all descendants) |
| `restorePage` | `page.update` + parent `childrenCount` increment |
| `swapPages` | sibling `updateMany` + `page.update` |
| `login` token / `logout` / comment create-update-delete | single statement — atomic by nature |

Rule going forward: **any handler that writes more than one row must wrap those writes in `prisma.$transaction`.**
