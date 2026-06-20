# Phase 1 — Project Foundation

**Goal:** A fresh, typed Node project that boots a minimal Express server, answers a
health check, and shuts down cleanly. Nothing else.

**What you'll learn:** how a Node/TypeScript backend is wired from zero — package manifest,
the TypeScript compiler, dev vs build vs start, the Express app, and why we separate
"build the app" from "start the server."

**Prerequisites:** none. You are at `D:\RaghavaIndra\Projects\reader\backend`.

---

## Concept (read once)

- **`package.json`** declares dependencies and the scripts you run (`dev`, `build`, `start`).
- **TypeScript** is compiled by `tsc` for production, but in development we run it directly
  with **`tsx`** (no separate compile step, instant restarts with `tsx watch`).
- **Express** is a function that returns an `app`. You attach **middleware** (functions that
  run on every request) and **routes**, then call `app.listen(port)`.
- **Split `app.ts` from `server.ts`.** `app.ts` only *builds* the app (great for tests —
  you can run it without opening a port). `server.ts` *starts* it. This is a standard
  production pattern.
- **Graceful shutdown:** when the OS sends `SIGINT`/`SIGTERM` (Ctrl‑C, container stop), we
  stop accepting connections before exiting so nothing is cut off mid‑request.

---

## Steps

### 1.1 — CREATE `package.json`
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Reader backend API",
  "main": "dist/server.js",
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit"
  },
  "license": "ISC",
  "dependencies": {
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^25.9.3",
    "tsx": "^4.19.0",
    "typescript": "^6.0.3"
  }
}
```

### 1.2 — CREATE `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 — CREATE `.gitignore`
```
node_modules
dist
.env
```

### 1.4 — CREATE `.env.example`
```
PORT=3000
NODE_ENV=development
```
Then copy it: create `.env` with the same contents. (`.env` is git‑ignored.)

### 1.5 — CREATE `src/app.ts` (builds the app, does not listen)
```ts
import express, { Express } from "express";

// Builds and returns the Express application with all middleware and routes attached.
export function createApp(): Express {
  const app = express();

  // Parse JSON request bodies (cap the size to avoid memory abuse).
  app.use(express.json({ limit: "1mb" }));

  // Liveness probe so we can confirm the server is up.
  app.get("/backend-api/status", (_req, res) => {
    res.json({ success: true });
  });

  return app;
}
```

### 1.6 — CREATE `src/server.ts` (starts the app, handles shutdown)
```ts
import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 3000;

// Builds the app and starts listening, wiring graceful shutdown on process signals.
function start(): void {
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Stops accepting new connections, then exits, so in-flight requests can finish.
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
```

> `dotenv/config` loads `.env` into `process.env`. We add `dotenv` as a dependency in Phase 2;
> for now it is fine if the import is unresolved until you run `npm install` in the next step.

### 1.7 — Install and add `dotenv`
From `backend/`:
```
npm install express dotenv
npm install -D typescript tsx @types/express @types/node
```

---

## Verify

```
cd backend
npm run dev
```
In another terminal:
```
curl http://localhost:3000/backend-api/status
```
Expected:
```json
{"success":true}
```
Press **Ctrl‑C** — you should see `SIGINT received — shutting down.` and a clean exit.

Also confirm the production path compiles:
```
npm run typecheck
```
No output = success.

---

## Review checklist

- [ ] `npm run dev` starts and prints the running URL.
- [ ] `/backend-api/status` returns `{ "success": true }`.
- [ ] Ctrl‑C shuts down gracefully (you see the shutdown log).
- [ ] `npm run typecheck` passes.
- [ ] `app.ts` has no `listen`; `server.ts` does. (You can build the app without a port.)

---

## What's next

Phase 2 replaces raw `process.env` reads with a **typed, validated config object** that
fails fast if the environment is wrong. → [phase-2.md](phase-2.md)
