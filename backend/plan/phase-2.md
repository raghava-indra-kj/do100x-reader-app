# Phase 2 — Typed Configuration

**Goal:** Read the environment **once**, validate it, and expose a typed `config` object.
The rest of the app never touches `process.env` again.

**What you'll learn:** the 12‑factor "config in the environment" idea, and *fail‑fast*
configuration — if a required variable is missing or malformed, the server refuses to start
with a clear message instead of crashing randomly later.

**Prerequisites:** Phase 1 complete.

---

## Concept (read once)

- Scattered `process.env.X` reads are untyped (`string | undefined`) and fail deep inside
  the app at runtime. Instead we parse the whole environment **at startup** with a Zod schema.
- The result is a frozen, fully‑typed object. `config.port` is a `number`, `config.isDev`
  is a `boolean`. No `undefined`, no `Number(...)` sprinkled around.
- If validation fails, we print exactly which variable is wrong and exit. This is the single
  most useful habit for production reliability.

---

## Steps

### 2.1 — Install Zod
From `backend/`:
```
npm install zod@^4.4.3
```

### 2.2 — Extend `.env.example` (and your `.env`)
```
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://user:password@localhost:3306/reader"
```
Use real credentials in `.env`. `DATABASE_URL` is needed from Phase 3 onward; we validate it now.

### 2.3 — CREATE `src/config/env.ts`
```ts
import "dotenv/config";
import { z } from "zod";

// Shape and coercion rules for every environment variable the app needs.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

// Parse the environment once; on failure, print the problem and stop the process.
function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  const env = parsed.data;
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    isDev: env.NODE_ENV !== "production",
  };
}

// The typed, frozen configuration used everywhere in the app.
export const config = Object.freeze(loadConfig());
```

### 2.4 — EDIT `src/server.ts` to use `config`
```ts
import { config } from "./config/env";
import { createApp } from "./app";

// Builds the app and starts listening, wiring graceful shutdown on process signals.
function start(): void {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
```
Remove the old `import "dotenv/config"` and `process.env.PORT` line from `server.ts` —
`config/env.ts` now owns dotenv loading.

---

## Verify

Normal boot:
```
npm run dev
```
Expected log includes the environment:
```
Server running on http://localhost:3000 (development)
```

Fail‑fast test: temporarily comment out `DATABASE_URL` in `.env` and run `npm run dev`.
Expected:
```
Invalid environment configuration:
  - DATABASE_URL: DATABASE_URL is required
```
and the process exits. Restore `DATABASE_URL` afterward.

---

## Review checklist

- [ ] The app boots and logs the environment name.
- [ ] Removing `DATABASE_URL` makes the server refuse to start with a clear message.
- [ ] No file other than `config/env.ts` reads `process.env`.
- [ ] `config.port` is a number and `config.isDev` is a boolean (typed).

---

## What's next

Phase 3 adds the **database**: the Prisma schema for all models, a client singleton, the
first migration, and a connection check at boot. → [phase-3.md](phase-3.md)
