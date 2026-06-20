# Architecture Redesign — Decoupled, SRP, Domain/HTTP‑Independent

This supersedes the *structure* and *error* conventions in earlier phase files. The phase
files will be updated to match once this is approved.

The driving rule: **two developers building two different features should never edit the same
file.** And: **a domain error is data, not behavior** — it has no HTTP status, no English text,
and no factory logic.

---

## 1. Coupling problems found (yours + extras I caught)

| # | Old plan | Why it couples people/layers | Fix |
|---|---|---|---|
| 1 | `PageError.notFound()` **static factories** | the error class holds construction logic; every new error edits one shared class; throwers depend on its method surface | plain classes, **one error per file**, built with `new`. No statics, no logic. |
| 2 | One big `page.service.ts` | create/update/delete devs all edit the same file | **one operation per file** under `operations/` |
| 3 | Global `ERROR_STATUS` catalog | every module edits one map → conflicts; couples all modules together | **per‑module `*.error-status.ts`**, merged at the composition root |
| 4 | Error codes drifting toward an `enum`/global file | one shared edit point | **per‑module `*.error-codes.ts`** plain constants |
| 5 | `page.service` imports `AuthError` | page **domain** coupled to auth **domain** | access errors (`Unauthenticated`, `Forbidden`) live in **common** — access control is cross‑cutting |
| 6 | Deep imports like `../auth/auth.access` | importer is tied to another module's internal file layout | each module has a public **`index.ts`**; others import the barrel only |
| 7 | Central `locales/en.json` | one shared file for all copy | **per‑module `i18n/en.json`**, merged at the composition root |
| 8 | `app.ts` hand‑wires every module | adding a module edits many lines in one place | a tiny **module manifest** (`{ basePath, router, errorStatus, messages }`) + a loop |

---

## 2. Principles

- **One responsibility per file.** One error class per file. One domain operation per file.
- **Domain layer is pure.** `operations/` and `shared/` import only `common` + their own module.
  No Express, no HTTP status, no English. They throw `DomainError`s carrying a **code + params**.
- **HTTP layer owns the web.** routes, schemas, DTOs, and the code→status map. Only this layer
  knows status codes and the request locale.
- **Composition root** (`app.ts`) is the single place allowed to know all modules. It merges
  status maps + messages and mounts routers — the same role as wiring routers today.
- **Errors are data.** No static factories, no logic. Construct with `new`. A constructor may
  accept typed params (that's shaping data, not logic).
- **Cross‑module access goes through a module's `index.ts`**, never a deep path.

---

## 3. Folder structure (end state)

```
src/
├── config/
│   └── env.ts
├── common/
│   ├── prisma.ts
│   ├── module.ts                       # BackendModule type + mergeMessages/mergeStatus helpers
│   ├── errors/
│   │   ├── domain-error.ts             # base: code + params (NO http, NO text)
│   │   ├── unauthenticated.error.ts    # access.unauthenticated
│   │   ├── forbidden.error.ts          # access.forbidden
│   │   └── validation-failed.error.ts  # validation.failed (takes a reason param)
│   ├── error-codes.ts                  # common codes (access.*, validation.failed, common.*)
│   ├── error-status.ts                 # common code -> status
│   ├── i18n/
│   │   ├── locales/en.json             # common messages
│   │   ├── translator.ts               # configureMessages() + t()
│   │   └── locale.middleware.ts
│   ├── http/
│   │   ├── async-handler.ts
│   │   └── error.middleware.ts         # createErrorMiddleware(statusMap)
│   └── validation/
│       └── validate.ts                 # throws ValidationFailedError
├── modules/
│   ├── auth/
│   │   ├── index.ts                    # manifest + public guards (requireAuth, resolveUser)
│   │   ├── auth.error-codes.ts
│   │   ├── auth.error-status.ts
│   │   ├── i18n/en.json
│   │   ├── errors/
│   │   │   ├── email-taken.error.ts
│   │   │   └── invalid-credentials.error.ts
│   │   ├── shared/
│   │   │   ├── hash-password.ts
│   │   │   ├── create-session.ts
│   │   │   └── ensure-homepage.ts
│   │   ├── operations/                 # DOMAIN, one per file
│   │   │   ├── signup.ts
│   │   │   ├── login.ts
│   │   │   ├── get-profile.ts
│   │   │   └── logout.ts
│   │   ├── schemas/
│   │   │   ├── signup.schema.ts
│   │   │   └── login.schema.ts
│   │   ├── access/                     # auth-owned middleware (auth's public guards)
│   │   │   ├── resolve-user.ts
│   │   │   ├── require-user.ts
│   │   │   └── require-auth.ts
│   │   └── auth.routes.ts              # thin aggregator
│   └── page/
│       ├── index.ts                    # manifest (mounts comment router inside)
│       ├── page.error-codes.ts
│       ├── page.error-status.ts
│       ├── i18n/en.json
│       ├── errors/
│       │   ├── page-not-found.error.ts
│       │   ├── page-home-protected.error.ts
│       │   └── page-swap-parent-mismatch.error.ts
│       ├── shared/
│       │   ├── load-owned-page.ts
│       │   ├── load-live-page.ts
│       │   ├── assert-page-access.ts
│       │   ├── parse-page-content.ts
│       │   ├── collect-descendants.ts
│       │   └── page.dto.ts
│       ├── operations/                 # DOMAIN, one per file
│       │   ├── create-page.ts
│       │   ├── get-page.ts
│       │   ├── list-pages.ts
│       │   ├── list-trash.ts
│       │   ├── update-page.ts
│       │   ├── delete-page.ts          # softDelete + permanentDelete (one "delete" concern)
│       │   ├── restore-page.ts
│       │   └── swap-pages.ts
│       ├── schemas/
│       │   ├── create-page.schema.ts
│       │   ├── update-page.schema.ts
│       │   ├── swap-pages.schema.ts
│       │   └── page-id.schema.ts
│       ├── page.routes.ts
│       └── comment/                    # sub-resource, same internal shape
│           ├── comment.error-codes.ts
│           ├── comment.error-status.ts
│           ├── i18n/en.json
│           ├── errors/comment-not-found.error.ts
│           ├── operations/
│           │   ├── list-comments.ts
│           │   ├── create-comment.ts
│           │   ├── update-comment.ts
│           │   └── delete-comment.ts
│           ├── schemas/comment-body.schema.ts
│           ├── comment.dto.ts
│           └── comment.routes.ts
├── app.ts                              # composition root: merge + mount
└── server.ts
```

> A feature dev now lives inside `operations/<their-op>.ts`, `schemas/<their-op>.schema.ts`,
> and one new error file. Shared edits are limited to adding a route line and (rarely) a code/
> status/message entry in their **own** module.

---

## 4. The error system

### 4.1 Base — `common/errors/domain-error.ts`
```ts
// A domain failure: a stable code plus optional params. NO http status, NO human text.
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly params: Record<string, unknown> = {}
  ) {
    super(code);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 4.2 Codes — `modules/page/page.error-codes.ts` (constants, not an enum)
```ts
// Stable codes for the page feature (also used as i18n keys).
export const PAGE_NOT_FOUND = "page.not_found";
export const PAGE_HOME_PROTECTED = "page.home_cannot_be_deleted";
export const PAGE_SWAP_PARENT_MISMATCH = "page.swap_parent_mismatch";
```

### 4.3 One error per file, no statics — `modules/page/errors/page-not-found.error.ts`
```ts
import { DomainError } from "../../../common/errors/domain-error";
import { PAGE_NOT_FOUND } from "../page.error-codes";

// Raised when a live page does not exist. Pure data — no logic, no http.
export class PageNotFoundError extends DomainError {
  constructor() {
    super(PAGE_NOT_FOUND);
  }
}
```
Usage: `throw new PageNotFoundError();`

**Before → after** (the coupling you flagged):
```ts
// BEFORE: factory + logic living on the error, one shared class everyone edits
class PageError extends DomainError { static notFound(){ return new PageError("page.not_found"); } }
throw PageError.notFound();

// AFTER: one file, one class, constructed with new
throw new PageNotFoundError();
```

### 4.4 Errors with params — `common/errors/validation-failed.error.ts`
```ts
import { DomainError } from "./domain-error";
import { VALIDATION_FAILED } from "../error-codes";

// Raised when request validation fails; carries a localized reason for the message.
export class ValidationFailedError extends DomainError {
  constructor(reason: string) {
    super(VALIDATION_FAILED, { reason });
  }
}
```

### 4.5 Cross‑cutting access errors live in `common/errors/`
`UnauthenticatedError` (`access.unauthenticated`, 401) and `ForbiddenError`
(`access.forbidden`, 403). The page/comment domains throw **these**, so they no longer import
auth — access control is a shared concern, not a domain one.

### 4.6 Per‑module status map — `modules/page/page.error-status.ts` (HTTP layer)
```ts
import { PAGE_NOT_FOUND, PAGE_HOME_PROTECTED, PAGE_SWAP_PARENT_MISMATCH } from "./page.error-codes";

// How this module's codes map to HTTP statuses. Merged at the composition root.
export const pageErrorStatus: Record<string, number> = {
  [PAGE_NOT_FOUND]: 404,
  [PAGE_HOME_PROTECTED]: 400,
  [PAGE_SWAP_PARENT_MISMATCH]: 400,
};
```

### 4.7 The error middleware is a **factory** — `common/http/error.middleware.ts`
```ts
import { Request, Response, NextFunction } from "express";
import { DomainError } from "../errors/domain-error";
import { t, DEFAULT_LOCALE } from "../i18n/translator";
import { config } from "../../config/env";

// Builds the global error handler from a merged code->status map (provided by app.ts).
export function createErrorMiddleware(statusMap: Record<string, number>) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const locale = req.locale ?? DEFAULT_LOCALE;
    if (err instanceof DomainError) {
      const status = statusMap[err.code] ?? 500;
      res.status(status).json({ code: err.code, message: t(locale, err.code, err.params), ...(config.isDev ? { stack: err.stack } : {}) });
      return;
    }
    console.error(err);
    res.status(500).json({ code: "common.internal_error", message: t(locale, "common.internal_error"), ...(config.isDev && err instanceof Error ? { stack: err.stack } : {}) });
  };
}
```

---

## 5. One operation per file (domain)

`modules/page/operations/create-page.ts` — pure, testable, throws only `DomainError`s:
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../../common/prisma";
import { loadOwnedPage } from "../shared/load-owned-page";
import { parsePageContent } from "../shared/parse-page-content";
import type { CreatePageInput } from "../schemas/create-page.schema";
import type { ParseResult } from "@reader/md-ast";

// Creates a page under an optional owned parent; stores parsed content only when parse succeeds.
export async function createPage(userId: string, input: CreatePageInput): Promise<{ id: string; parseResult: ParseResult | null }> {
  if (input.parentPageId) await loadOwnedPage(input.parentPageId, userId);

  let parseResult: ParseResult | null = null;
  let content: Prisma.InputJsonValue | undefined;
  if (input.rawMarkdown) {
    parseResult = parsePageContent(input.rawMarkdown);
    if (parseResult.ok) content = parseResult.data as unknown as Prisma.InputJsonValue;
  }

  const now = new Date();
  const max = await prisma.page.aggregate({ where: { parentId: input.parentPageId ?? null, deletedAt: null }, _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? 0) + 1;

  const page = await prisma.$transaction(async (tx) => {
    const created = await tx.page.create({ data: { userId, parentId: input.parentPageId ?? null, title: input.title, ...(content !== undefined ? { content } : {}), isPublic: false, category: input.category ?? null, sortOrder, childrenCount: 0, createdAt: now, updatedAt: now } });
    if (input.parentPageId) await tx.page.update({ where: { id: input.parentPageId }, data: { childrenCount: { increment: 1 }, updatedAt: now } });
    return created;
  });

  return { id: page.id, parseResult };
}
```

Reusable guard `modules/page/shared/load-owned-page.ts` (throws common + page errors, no auth import):
```ts
import { prisma } from "../../../common/prisma";
import { ForbiddenError } from "../../../common/errors/forbidden.error";
import { PageNotFoundError } from "../errors/page-not-found.error";

// Loads a live page owned by userId, else throws PageNotFoundError or ForbiddenError.
export async function loadOwnedPage(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null } });
  if (!page) throw new PageNotFoundError();
  if (page.userId !== userId) throw new ForbiddenError();
  return page;
}
```

---

## 6. Module manifest + composition root

`common/module.ts`:
```ts
import { Router } from "express";

// What every feature module exposes to the composition root.
export interface BackendModule {
  basePath: string;
  router: Router;
  errorStatus: Record<string, number>;
  messages: Record<string, Record<string, string>>; // locale -> (code -> text)
}

// Shallow-merges several locale dictionaries into one.
export function mergeMessages(...parts: BackendModule["messages"][]): BackendModule["messages"] {
  const out: BackendModule["messages"] = {};
  for (const part of parts) for (const [loc, dict] of Object.entries(part)) out[loc] = { ...(out[loc] ?? {}), ...dict };
  return out;
}
```

`modules/page/index.ts` (public surface — note comment router is mounted *inside* page.routes.ts):
```ts
import pageEn from "./i18n/en.json";
import { pageErrorStatus } from "./page.error-status";
import { pageRouter } from "./page.routes";
import type { BackendModule } from "../../common/module";

// The page module's contribution to the app.
export const pageModule: BackendModule = {
  basePath: "/backend-api/pages",
  router: pageRouter,
  errorStatus: pageErrorStatus,
  messages: { en: pageEn },
};
```

`src/app.ts` (the only file that knows all modules):
```ts
import express, { Express } from "express";
import { localeMiddleware } from "./common/i18n/locale.middleware";
import { configureMessages } from "./common/i18n/translator";
import { createErrorMiddleware } from "./common/http/error.middleware";
import { mergeMessages, BackendModule } from "./common/module";
import { commonErrorStatus } from "./common/error-status";
import commonEn from "./common/i18n/locales/en.json";
import { authModule } from "./modules/auth";
import { pageModule } from "./modules/page";

// Builds the fully wired app by merging each module's status map + messages and mounting routers.
export function createApp(): Express {
  const modules: BackendModule[] = [authModule, pageModule];

  configureMessages(mergeMessages({ en: commonEn }, ...modules.map((m) => m.messages)));
  const errorStatus = Object.assign({}, commonErrorStatus, ...modules.map((m) => m.errorStatus));

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(localeMiddleware);
  app.get("/backend-api/status", (_req, res) => res.json({ success: true }));
  for (const m of modules) app.use(m.basePath, m.router);
  app.use(createErrorMiddleware(errorStatus));
  return app;
}
```

Adding a feature module later = create the folder + add it to the `modules` array. Nothing else.

---

## 7. How the phases change

| Phase | Change |
|---|---|
| 1–3 | unchanged (foundation, config, DB) |
| 4 | translator gains `configureMessages()`; messages move to **per‑module** `i18n/en.json` merged in `app.ts` |
| 5 | `DomainError` base + **common** access/validation errors (one file each) + per‑module codes + per‑module status map + `createErrorMiddleware(statusMap)` factory |
| 6 | `validate` throws `ValidationFailedError`; introduce `common/module.ts` (manifest + merge) |
| 7 | auth module split: `operations/` (signup/login/…), `errors/` (one per file), `access/`, `index.ts` manifest |
| 8 | page module split: `operations/` (one per file), `errors/`, `shared/`, `schemas/`, `index.ts` manifest |
| 9 | comment sub‑module mirrors the same shape |
| 10 | unchanged (the per‑operation domain files make unit tests even smaller) |

---

## 8. Deliberately NOT done (to avoid over‑engineering)

- **No DI container / no decorators / no repository abstraction.** Prisma is the repository;
  operations call it directly. Adding a layer here would be ceremony with no payoff at this size.
- **No per‑operation controller files.** Route handlers stay as 2–3 thin lines in the module's
  `*.routes.ts`; the heavy logic is already isolated in `operations/`. Splitting wiring too would
  add files without reducing real coupling.
- **Status stays out of the error class.** Tempting to co‑locate, but it would re‑couple domain
  to HTTP — the exact thing we're separating.
