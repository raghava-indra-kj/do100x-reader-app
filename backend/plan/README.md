# Reader Backend — 10‑Phase Build Plan

A learning‑oriented, production‑minded rebuild of the backend. You complete one phase
at a time, review it, and move on. Every phase is **independent and runnable** — you
always end with something you can start and verify.

> These files are instructions for an AI model to execute. Each phase says exactly what
> to create, gives full code, and ends with a verification you can see with your own eyes.

> **Read [architecture.md](architecture.md) first.** It is the source of truth for the folder
> structure and the error system (one error per file, no static factories, per‑module codes/
> status/messages merged at a composition root, domain fully decoupled from HTTP). Where a phase
> file's structure or error snippets differ, `architecture.md` wins — the phases are being
> updated to match.

---

## The two architectural rules that shape everything

1. **All user‑facing text lives in locale files** (`src/common/i18n/locales/*.json`).
   No English strings are hard‑coded in services, errors, or schemas — only **message keys**.

2. **The domain/service layer never knows about HTTP.**
   Services throw a `DomainError` carrying a stable **code** (e.g. `"page.not_found"`) and
   optional params — *no HTTP status, no English message*. The HTTP layer alone maps a code
   to an HTTP status and a localized message. This is what lets us unit‑test the domain
   layer with zero Express in sight.

```
Service throws:        new DomainError("page.not_found")
HTTP error middleware: code "page.not_found" -> 404 + t(locale, "page.not_found")
Domain test asserts:   expect(err.code).toBe("page.not_found")
```

---

## Layered architecture

```
HTTP layer        routes · middleware · error-middleware · validation · DTOs   (knows Express + status codes)
Domain layer      services · domain errors (codes only)                        (pure, testable, no Express)
Infrastructure    prisma client · config · i18n · server bootstrap
Cross-cutting     locales (messages) · error catalog (code -> status)
```

**Dependency rule (no cycles):** `common` depends on nothing in the app; `auth` depends on
`common`; `page` depends on `common` and `auth`. `auth` must never import from `page`.

---

## Target folder structure (end state)

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.ts                      # typed, validated environment
│   ├── common/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── errors/
│   │   │   └── domain-error.ts         # DomainError (code + params, NO http)
│   │   ├── i18n/
│   │   │   ├── locales/en.json         # every message, keyed by code
│   │   │   ├── translator.ts           # t(locale, key, params)
│   │   │   └── locale.middleware.ts    # sets req.locale
│   │   ├── http/
│   │   │   ├── async-handler.ts        # wraps async routes
│   │   │   ├── error-catalog.ts        # code -> http status
│   │   │   └── error.middleware.ts     # DomainError -> localized response
│   │   └── validation/
│   │       └── validate.ts             # Zod body validation -> DomainError
│   ├── modules/
│   │   ├── auth/                        # auth + user (identity, sessions, onboarding)
│   │   └── page/                        # pages + comments
│   ├── app.ts                          # builds the Express app (no listen)
│   └── server.ts                       # loads config, connects DB, listens
├── .env / .env.example
├── package.json
└── tsconfig.json
```

---

## The 10 phases

| # | Phase | You build | You learn |
|---|-------|-----------|-----------|
| 1 | **Project Foundation** | npm + TypeScript + scripts + a minimal Express server with health check & graceful shutdown | Node project setup, TS tooling, Express bootstrap, process signals |
| 2 | **Typed Configuration** | `config/env.ts` — env validated with Zod, app reads config (not `process.env`) | 12‑factor config, fail‑fast on misconfig |
| 3 | **Database Layer** | Prisma schema (all models + indexes), client singleton, migration, boot‑time connection check | data modeling, migrations, connection lifecycle |
| 4 | **Internationalization** | locale files + `t()` translator + `req.locale` middleware | i18n, message interpolation, separating copy from code |
| 5 | **Error Architecture** | `DomainError` (code only) + error catalog (code→status) + global error middleware that localizes | separation of concerns, Express error handling |
| 6 | **HTTP Building Blocks** | Zod schemas with message keys + `validate` middleware + DTO + `asyncHandler` + the module pattern | request validation, response shaping, conventions |
| 7 | **Auth & User module** | pure auth domain service, password hashing, sessions, access middleware, routes | a full vertical slice with a testable domain |
| 8 | **Page module** | page domain service (CRUD, trash, restore, swap, public access), md‑ast parsing, transactions | transactions, soft delete, parsing pipeline |
| 9 | **Comment module** | comments as a nested sub‑resource of pages, ownership rules | nested routing, resource ownership |
| 10 | **Testing, Hardening & Production** | unit tests for the **domain alone**, integration tests, rate limit, helmet, prod build/run | why the separation pays off; shipping |

---

## Conventions every phase follows

- **Comments:** one or two lines above every `type` and every function (including private
  helpers and factories). Never comment individual parameters.
- **Services** take plain inputs and return plain data, or throw a `DomainError`. No `req`/`res`.
- **Routes are thin:** `requireAuth?` → `validate(schema)?` → call service → map DTO → respond.
- **Every multi‑row write** runs inside `prisma.$transaction`.
- **Error responses** are always `{ "code": string, "message": string }` (+ `stack` in dev).
- **Verify before moving on:** each phase ends with a command + an expected result.

Start with [phase-1.md](phase-1.md).
