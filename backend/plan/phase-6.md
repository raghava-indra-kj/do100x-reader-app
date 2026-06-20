# Phase 6 — HTTP Building Blocks & the Module Pattern

**Goal:** Add the last shared pieces the feature modules need: a Zod **`validate`** middleware
that turns bad input into a localized `validation.failed`, the **DTO** convention, and a clear
**anatomy of a feature module** so every feature looks the same.

**What you'll learn:** request validation at the HTTP boundary, why we never return Prisma rows
directly, and the file‑per‑responsibility layout that makes features predictable.

**Prerequisites:** Phases 1–5 complete.

---

## Concept (read once)

- **Validation is an HTTP concern.** Schemas describe the request body; the `validate`
  middleware runs the schema, and on failure throws `DomainError("validation.failed", {reason})`.
  Because validate runs in the HTTP layer, it is allowed to translate the message.
- **Schemas hold message keys, not English.** `.min(1, "validation.required")` — the string is
  an i18n key. The middleware builds params (`field`, `max`, `min`) from the Zod issue and
  translates them. So validation messages are localized too.
- **DTOs** are mapper functions `(row) -> apiObject`. They (1) rename fields (`parentId` →
  `parentPageId`), (2) drop secrets (never return `password`), and (3) freeze the API shape so a
  DB change doesn't leak to clients.
- **Module anatomy** (every feature folder uses the same file roles):
  | File | Role | Layer |
  |---|---|---|
  | `*.constants.ts` | limits / magic numbers | — |
  | `*.errors.ts` | `DomainError` subclass + code constants | domain |
  | `*.schema.ts` | Zod request models + inferred types | http |
  | `*.dto.ts` | response mappers | http |
  | `*.service.ts` | business logic (pure, throws DomainError) | **domain** |
  | `*.access.ts` | shared guards (e.g. load‑owned) | domain |
  | `*.routes.ts` | thin Express wiring | http |

---

## Steps

### 6.1 — CREATE `src/common/validation/validate.ts`
```ts
import { ZodType } from "zod";
import { Request, Response, NextFunction } from "express";
import { DomainError } from "../errors/domain-error";
import { t } from "../i18n/translator";

// Validates and normalizes req.body against a schema. On failure it builds a localized,
// field-specific reason from the first Zod issue and throws validation.failed.
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      // Zod issues optionally carry `maximum`/`minimum`; pass them so templates can use them.
      const params = {
        field: issue.path.join(".") || "value",
        max: (issue as { maximum?: number }).maximum,
        min: (issue as { minimum?: number }).minimum,
      };
      const reason = t(req.locale!, issue.message, params);
      throw new DomainError("validation.failed", { reason });
    }
    req.body = result.data;
    next();
  };
}
```

> A **synchronous** throw inside middleware is caught by Express automatically, so `validate`
> does not need `asyncHandler`. Async handlers (services hitting the DB) still do.

### 6.2 — Confirm the validation message keys exist

These were added in Phase 4's `en.json`. Verify they are present:
`validation.failed`, `validation.required`, `validation.too_long`, `validation.invalid_email`,
`validation.invalid_id`, `validation.password_too_short`, `validation.comment_empty`.
The translator ignores params a template doesn't use, so passing `{field, max, min}` is always safe.

### 6.3 — DTO convention (reference — you'll create real DTOs in Phases 7–9)

A DTO is just a pure mapper. Example shape you'll follow:
```ts
// Maps a database row to its public API shape (rename fields, drop secrets).
export const toThingDto = (row: Thing) => ({ id: row.id, name: row.name /* never row.password */ });
```

### 6.4 — Temporary demo to prove validation (remove in Phase 7)

EDIT `src/app.ts`: add a demo schema + route, keep the error handler last.
```ts
import { z } from "zod";
import { validate } from "./common/validation/validate";

// ...inside createApp(), before app.use(errorMiddleware):

// Temporary route proving the validate -> DomainError -> localized 400 pipeline.
const demoSchema = z.object({
  title: z.string().trim().min(1, "validation.required").max(10, "validation.too_long"),
});
app.post("/backend-api/validate-demo", validate(demoSchema), (req, res) => {
  res.json({ ok: true, body: req.body });
});
```

---

## Verify

```
npm run dev

# valid:
curl -s -X POST http://localhost:3000/backend-api/validate-demo \
  -H "Content-Type: application/json" -d '{"title":"Hi"}'
# -> {"ok":true,"body":{"title":"Hi"}}

# missing field:
curl -s -X POST http://localhost:3000/backend-api/validate-demo \
  -H "Content-Type: application/json" -d '{}'
# -> 400 {"code":"validation.failed","message":"title is required.", ...}

# too long:
curl -s -X POST http://localhost:3000/backend-api/validate-demo \
  -H "Content-Type: application/json" -d '{"title":"way too long title"}'
# -> 400 {"code":"validation.failed","message":"title must be at most 10 characters.", ...}
```
Now **remove** the demo schema and route (and the now‑unused imports) from `app.ts`.

---

## Review checklist

- [ ] Valid input passes and `req.body` is the trimmed/typed result.
- [ ] Missing/oversized input returns 400 `validation.failed` with a localized reason.
- [ ] Schemas contain only message **keys**, no English.
- [ ] You understand each file role in a feature module (the table above).
- [ ] Demo route removed.

---

## What's next

Phase 7 builds the first real feature — the **auth & user module** — as a full vertical slice
with a pure, testable domain service. → [phase-7.md](phase-7.md)
