# Phase 10 — Testing, Hardening & Production

**Goal:** Prove the architecture pays off by testing the **domain layer with no Express**, add
integration tests through the real app, then harden for production (rate limiting, security
headers, proxy trust) and document the production run.

**What you'll learn:** why separating domain from HTTP makes testing easy, how to test an
Express app without opening a port, and the baseline hardening every API needs.

**Prerequisites:** Phases 1–9 complete.

---

## Concept (read once)

- **Two test levels:**
  - **Unit (domain):** call a service or pure helper directly and assert on returned data or
    `err.code`. No HTTP, no `Accept-Language`, no status codes. This is only possible *because*
    the domain never imported Express.
  - **Integration (HTTP):** use `supertest` on `createApp()` — no `listen` needed (that's why
    Phase 1 split `app.ts` from `server.ts`). Assert status code + `{ code, message }`.
- **Hardening:** `helmet` sets safe response headers; `express-rate-limit` caps request rate;
  `trust proxy` makes rate limiting count the real client IP behind a reverse proxy.

---

## Steps

### 10.1 — Install test + hardening packages
From `backend/`:
```
npm install helmet express-rate-limit
npm install -D vitest supertest @types/supertest
```
Add a test script (already present if you followed Phase 1, otherwise add):
```json
"scripts": { "test": "vitest run", "test:watch": "vitest" }
```

### 10.2 — CREATE `vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";

// Runs *.test.ts files in a Node environment.
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

### 10.3 — Unit test the domain (no Express) — CREATE `src/common/i18n/translator.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { t, resolveLocale } from "./translator";

describe("translator", () => {
  // Interpolates params into the template.
  it("interpolates params", () => {
    expect(t("en", "validation.required", { field: "Title" })).toBe("Title is required.");
  });

  // Falls back to the key when it is unknown.
  it("falls back to the key", () => {
    expect(t("en", "nope.missing")).toBe("nope.missing");
  });

  // Resolves an unsupported language to the default locale.
  it("defaults unknown locales", () => {
    expect(resolveLocale("fr-FR")).toBe("en");
  });
});
```

### 10.4 — Domain service test (no HTTP) — CREATE `src/modules/auth/auth.service.test.ts`

This requires a **test database**. Point `DATABASE_URL` at a throwaway schema and run
`npx prisma migrate deploy` against it before testing. The point: we assert on the domain
error **code**, never on an HTTP status.

```ts
import { describe, it, expect } from "vitest";
import { login } from "./auth.service";
import { AUTH_INVALID_CREDENTIALS } from "./auth.errors";

describe("auth.service.login", () => {
  // Unknown email yields the invalid-credentials domain code (not a 401 — that's HTTP's job).
  it("rejects unknown email with a domain code", async () => {
    await expect(login({ email: "nobody@example.com", password: "whatever" }))
      .rejects.toMatchObject({ code: AUTH_INVALID_CREDENTIALS });
  });
});
```

### 10.5 — Integration test through the app (no port) — CREATE `src/app.test.ts`
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app";

const app = createApp();

describe("HTTP layer", () => {
  // Health check responds.
  it("reports status", async () => {
    const res = await request(app).get("/backend-api/status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  // A protected route without a token maps the domain error to 401 + localized message.
  it("requires auth", async () => {
    const res = await request(app).get("/backend-api/auth/session");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("auth.unauthenticated");
    expect(res.body.message).toBe("You must be logged in to do this.");
  });
});
```

### 10.6 — Harden `src/app.ts`

Add `helmet`, the rate limiters, and trust‑proxy. Final `createApp`:
```ts
import express, { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { localeMiddleware } from "./common/i18n/locale.middleware";
import { errorMiddleware } from "./common/http/error.middleware";
import { t, DEFAULT_LOCALE } from "./common/i18n/translator";
import authRouter from "./modules/auth/auth.routes";
import pagesRouter from "./modules/page/page.routes";

// Builds and returns the fully wired Express application (no listen).
export function createApp(): Express {
  const app = express();

  // Count the real client IP when running behind one reverse proxy.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(localeMiddleware);

  // Localized 429 responder shared by both limiters.
  const limitHandler = (req: express.Request, res: express.Response) =>
    res.status(429).json({ code: "common.rate_limited", message: t(req.locale ?? DEFAULT_LOCALE, "common.rate_limited") });

  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, handler: limitHandler });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false, handler: limitHandler });

  app.use("/backend-api", globalLimiter);
  app.use("/backend-api/auth", authLimiter);

  app.get("/backend-api/status", (_req, res) => {
    res.json({ success: true });
  });
  app.use("/backend-api/auth", authRouter);
  app.use("/backend-api/pages", pagesRouter);

  // Error handler must be registered LAST.
  app.use(errorMiddleware);
  return app;
}
```

### 10.7 — Production run

`@reader/md-ast` ships TypeScript (`"type": "module"`, `exports: "./src/index.ts"`), so plain
`node dist/server.js` cannot `require` it. For this MVP, run production with `tsx` (it executes
TypeScript and resolves the workspace package). EDIT `package.json`:
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "tsx src/server.ts",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```
Set `NODE_ENV=production` in the deployment environment so error responses **omit** the stack.
(Long‑term cleaner option: give `md-ast` a build step and point its `exports` at compiled JS,
then revert `start` to `node dist/server.js`.)

---

## Verify

```
npm test
```
Expected: translator unit tests, the auth domain test, and the app integration tests all pass.

```
npm run dev
# hammer the auth endpoint > 15 times in 15 min -> 429 common.rate_limited
curl -i http://localhost:3000/backend-api/status   # observe helmet security headers
```

Set `NODE_ENV=production`, trigger an error, and confirm the response has **no `stack`** field.

---

## Final acceptance checklist (the whole backend)

- [ ] **Domain is testable alone** — `auth.service.test.ts` asserts on `code`, no Express.
- [ ] **HTTP layer maps codes** — integration test gets 401 + localized message.
- [ ] All messages come from `locales/en.json`; no English in services/errors/schemas.
- [ ] Passwords hashed (bcrypt); email normalized; same error for unknown email vs wrong password.
- [ ] Ownership enforced everywhere; comments only by the page owner; edits only by the author.
- [ ] Failed markdown parse never wipes stored content.
- [ ] Home page can't be deleted; cross‑parent swap rejected.
- [ ] Permanent delete cascades — no orphaned pages or comments.
- [ ] Every multi‑row write is inside `prisma.$transaction`.
- [ ] Rate limiting, helmet, and trust‑proxy are active; prod hides stack traces.
- [ ] `npm run typecheck` and `npm test` are green.

---

## You're done

You built a feature‑based, internationalized backend where the **domain layer is pure and
independently testable** and the **HTTP layer owns all status/locale concerns**. Each phase
left you something runnable — and now you understand, end to end, how a maintainable Node.js
backend is assembled for production.

Back to the roadmap → [README.md](README.md)
