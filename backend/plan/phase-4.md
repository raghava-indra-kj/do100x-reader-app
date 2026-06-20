# Phase 4 — Internationalization (locale files)

**Goal:** Move **every** user‑facing message out of code and into locale files, behind a
tiny `t(locale, key, params)` translator. Resolve the request's locale from the
`Accept-Language` header.

**What you'll learn:** how production apps separate *copy* (words) from *logic*, how
message interpolation works, and how a request carries a locale.

**Prerequisites:** Phases 1–3 complete.

---

## Concept (read once)

- A **message key** is a stable id like `"page.not_found"`. Code references the key; the
  actual words live in `locales/en.json`. Adding Hindi later = adding `hi.json`, no code change.
- **Interpolation:** a template `"{field} is required."` + params `{ field: "Title" }` →
  `"Title is required."`.
- **Locale resolution:** read the first language from `Accept-Language`; if we don't have it,
  fall back to `en`. We attach the result to `req.locale`.
- The translator is a **pure function** — easy to unit‑test, and reused by both the error
  middleware (Phase 5) and validation (Phase 6).

---

## Steps

### 4.1 — CREATE `src/common/i18n/locales/en.json`

Keys are grouped by domain. The same code strings will be thrown by the domain layer in
later phases, so the message for a thrown code is found automatically.

```json
{
  "common.internal_error": "Something went wrong. Please try again.",
  "common.rate_limited": "Too many requests. Please try again later.",

  "validation.failed": "{field}: {reason}",
  "validation.required": "{field} is required.",
  "validation.too_long": "{field} must be at most {max} characters.",
  "validation.invalid_email": "A valid email is required.",
  "validation.invalid_id": "A valid id is required.",
  "validation.password_too_short": "Password must be at least {min} characters.",
  "validation.comment_empty": "Comment can't be empty.",

  "auth.email_taken": "Email is already taken.",
  "auth.invalid_credentials": "Invalid email or password.",
  "auth.unauthenticated": "You must be logged in to do this.",

  "page.not_found": "Page not found.",
  "page.forbidden": "You do not have access to this page.",
  "page.home_cannot_be_deleted": "Your home page can't be deleted.",
  "page.swap_parent_mismatch": "Pages must share the same parent to be reordered.",

  "comment.not_found": "Comment not found.",
  "comment.forbidden": "You can only modify your own comments."
}
```

### 4.2 — CREATE `src/common/i18n/translator.ts`
```ts
import fs from "fs";
import path from "path";

// Supported locales; the first is the fallback.
const SUPPORTED_LOCALES = ["en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Loads every locale file once at startup into an in-memory dictionary.
function loadMessages(): Record<Locale, Record<string, string>> {
  const dir = path.join(__dirname, "locales");
  const messages = {} as Record<Locale, Record<string, string>>;
  for (const locale of SUPPORTED_LOCALES) {
    const file = path.join(dir, `${locale}.json`);
    messages[locale] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return messages;
}

const MESSAGES = loadMessages();

// Picks a supported locale from an Accept-Language header, falling back to the default.
export function resolveLocale(acceptLanguage: string | undefined): Locale {
  const requested = acceptLanguage?.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(requested ?? "")
    ? (requested as Locale)
    : DEFAULT_LOCALE;
}

// Translates a key into the given locale, interpolating {param} placeholders.
export function t(locale: Locale, key: string, params: Record<string, unknown> = {}): string {
  const template = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}
```

### 4.3 — CREATE `src/common/i18n/locale.middleware.ts`
```ts
import { Request, Response, NextFunction } from "express";
import { Locale, resolveLocale } from "./translator";

// Express request augmentation carrying the resolved locale for this request.
declare global {
  namespace Express {
    interface Request {
      locale?: Locale;
    }
  }
}

// Middleware that resolves the request locale from Accept-Language and stores it on req.
export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.locale = resolveLocale(req.headers["accept-language"]);
  next();
}
```

### 4.4 — EDIT `src/app.ts` to attach the locale middleware and a demo of `t()`
```ts
import express, { Express } from "express";
import { localeMiddleware } from "./common/i18n/locale.middleware";
import { t } from "./common/i18n/translator";

// Builds and returns the Express application with all middleware and routes attached.
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(localeMiddleware);

  app.get("/backend-api/status", (_req, res) => {
    res.json({ success: true });
  });

  // Temporary demo route — proves locale + translation work end to end. Remove in Phase 5.
  app.get("/backend-api/i18n-demo", (req, res) => {
    res.json({ message: t(req.locale!, "validation.required", { field: "Title" }) });
  });

  return app;
}
```

---

## Verify

```
npm run dev
curl http://localhost:3000/backend-api/i18n-demo
```
Expected:
```json
{"message":"Title is required."}
```

Interpolation and fallback both work because the template `"{field} is required."` received
`{ field: "Title" }`. Requesting an unknown key returns the key itself (safe fallback).

---

## Review checklist

- [ ] All messages live in `locales/en.json` — none hard‑coded in code.
- [ ] `t("en", "validation.required", { field: "Title" })` returns `"Title is required."`.
- [ ] `req.locale` is set on every request by the middleware.
- [ ] An unknown key returns the key (no crash).
- [ ] You can unit‑test `t()` and `resolveLocale()` without Express.

---

## What's next

Phase 5 builds the **error architecture**: a `DomainError` that carries only a *code*, an
error catalog mapping codes to HTTP statuses, and a global middleware that turns a thrown
domain error into a **localized** HTTP response — without the domain layer ever knowing
about HTTP. → [phase-5.md](phase-5.md)
