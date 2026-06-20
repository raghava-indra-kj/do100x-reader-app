# Phase 5 — Error Architecture (domain ↔ HTTP separation)

**Goal:** Make the domain layer throw errors that carry **only a code** (no HTTP status, no
English). Put all HTTP knowledge in one place: a catalog that maps codes to statuses and a
global middleware that builds a **localized** response.

**What you'll learn:** the single most important separation in this codebase. After this
phase, a service can be tested by asserting `err.code === "page.not_found"` with no Express.

**Prerequisites:** Phases 1–4 complete.

---

## Concept (read once)

- **`DomainError`** = `{ code, params }`. That's it. `code` is a stable string that also
  doubles as the i18n key (`"page.not_found"`). `params` feed message interpolation.
- The domain layer **throws** these. It does not know that `page.not_found` is a 404, and it
  does not know English. It only knows the *fact* that a page was not found.
- The **error catalog** (`code → HTTP status`) and the **error middleware** are the *only*
  place that knows HTTP. The middleware:
  1. recognizes a `DomainError`,
  2. looks up its status (default 500 if unknown),
  3. translates `t(req.locale, code, params)` into a message,
  4. responds `{ code, message }` (+ `stack` in dev).
- Anything that is **not** a `DomainError` (a bug, a DB outage) becomes a generic 500 — we
  never leak internals to the client.

```
domain:      throw new DomainError("page.not_found")
catalog:     "page.not_found" -> 404
middleware:  404 + t(locale, "page.not_found") -> { code, message }
```

---

## Steps

### 5.1 — CREATE `src/common/errors/domain-error.ts`
```ts
// A domain failure identified by a stable code, with optional params for the message.
// It carries NO HTTP status and NO human text — the HTTP layer adds those.
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

### 5.2 — CREATE `src/common/http/error-catalog.ts`
```ts
// Maps each domain error code to the HTTP status the API should return.
// This is the ONLY place codes meet HTTP. Unknown codes fall back to 500.
export const ERROR_STATUS: Record<string, number> = {
  // validation
  "validation.failed": 400,

  // auth
  "auth.email_taken": 409,
  "auth.invalid_credentials": 401,
  "auth.unauthenticated": 401,

  // page
  "page.not_found": 404,
  "page.forbidden": 403,
  "page.home_cannot_be_deleted": 400,
  "page.swap_parent_mismatch": 400,

  // comment
  "comment.not_found": 404,
  "comment.forbidden": 403,
};

// Status used when an error is not a known DomainError (bug, outage, etc.).
export const DEFAULT_STATUS = 500;
```

### 5.3 — CREATE `src/common/http/async-handler.ts`
```ts
import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route/middleware so thrown or rejected errors reach the error middleware.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);
```

### 5.4 — CREATE `src/common/http/error.middleware.ts`
```ts
import { Request, Response, NextFunction } from "express";
import { DomainError } from "../errors/domain-error";
import { ERROR_STATUS, DEFAULT_STATUS } from "./error-catalog";
import { t, DEFAULT_LOCALE } from "../i18n/translator";
import { config } from "../../config/env";

// Converts a DomainError into a localized { code, message } response.
function handleDomainError(err: DomainError, req: Request, res: Response): void {
  const status = ERROR_STATUS[err.code] ?? DEFAULT_STATUS;
  const message = t(req.locale ?? DEFAULT_LOCALE, err.code, err.params);
  res.status(status).json({
    code: err.code,
    message,
    ...(config.isDev ? { stack: err.stack } : {}),
  });
}

// Global error middleware: localizes domain errors, hides everything else behind a 500.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof DomainError) {
    handleDomainError(err, req, res);
    return;
  }
  console.error(err);
  res.status(DEFAULT_STATUS).json({
    code: "common.internal_error",
    message: t(req.locale ?? DEFAULT_LOCALE, "common.internal_error"),
    ...(config.isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
}
```

> Express recognizes an error handler by its **four** arguments `(err, req, res, next)`.
> It must be registered **after** all routes.

### 5.5 — EDIT `src/app.ts` — remove the demo route, add a throwing test route, register the handler
```ts
import express, { Express } from "express";
import { localeMiddleware } from "./common/i18n/locale.middleware";
import { asyncHandler } from "./common/http/async-handler";
import { errorMiddleware } from "./common/http/error.middleware";
import { DomainError } from "./common/errors/domain-error";

// Builds and returns the Express application with all middleware and routes attached.
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(localeMiddleware);

  app.get("/backend-api/status", (_req, res) => {
    res.json({ success: true });
  });

  // Temporary route to prove the error pipeline. Remove once Phase 7 adds real routes.
  app.get(
    "/backend-api/error-demo",
    asyncHandler(async () => {
      throw new DomainError("page.not_found");
    })
  );

  // Error handler must be registered LAST, after every route.
  app.use(errorMiddleware);
  return app;
}
```

---

## Verify

```
npm run dev
curl -i http://localhost:3000/backend-api/error-demo
```
Expected: HTTP status **404** and body:
```json
{"code":"page.not_found","message":"Page not found.","stack":"..."}
```
(`stack` appears only because `NODE_ENV=development`.)

Notice what happened: the route threw `new DomainError("page.not_found")` with **no status
and no message**. The catalog turned it into 404; the translator turned it into
`"Page not found."`. That is the whole point.

Optional: throw a plain `new Error("boom")` from a temp route → you get a generic **500**
with `code: "common.internal_error"` and the real message hidden from the client.

---

## Review checklist

- [ ] `DomainError` has only `code` + `params` — no status, no English.
- [ ] The code→status mapping lives only in `error-catalog.ts`.
- [ ] Throwing `DomainError("page.not_found")` yields a 404 with a localized message.
- [ ] A non‑domain error yields a 500 with `common.internal_error` (internals hidden).
- [ ] The error middleware is registered after all routes.
- [ ] You could unit‑test a function that throws `DomainError` with no Express at all.

---

## What's next

Phase 6 adds the remaining **HTTP building blocks**: Zod request schemas that carry message
keys, a `validate` middleware that turns invalid input into a `DomainError("validation.failed")`,
the DTO pattern, and the per‑feature module layout. → [phase-6.md](phase-6.md)
