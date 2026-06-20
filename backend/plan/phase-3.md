# Phase 3 — Database Layer (Prisma)

**Goal:** Define the full data model with Prisma, generate the client, run the first
migration, and verify the app connects to MySQL at boot.

**What you'll learn:** schema/data modeling (soft delete, JSON columns, indexes), how
Prisma migrations turn a schema into SQL, and the "single client" connection pattern.

**Prerequisites:** Phases 1–2 complete; a reachable MySQL database in `DATABASE_URL`.

---

## Concept (read once)

- **Prisma schema** is the single source of truth for your tables. `prisma migrate dev`
  diffs it against the database and writes a versioned SQL migration.
- **One `PrismaClient` for the whole process.** Creating many clients exhausts the DB
  connection pool. We export a singleton from `common/prisma.ts`.
- **Design choices in this model:**
  - `password` stores a **bcrypt hash** (~60 chars) — never plaintext.
  - `session.isActive` is a logout flag; we never delete sessions (audit trail).
  - `page.content` is a **JSON** column holding the parsed markdown AST (Phase 8).
  - `page.deletedAt` is a **soft delete**: non‑null means "in trash".
  - `@@index` on foreign‑key‑like columns keeps list queries fast.

---

## Steps

### 3.1 — Install Prisma
From `backend/`:
```
npm install @prisma/client@^5.22.0
npm install -D prisma@^5.22.0
```

### 3.2 — CREATE `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model appuser {
  id         String   @id @default(uuid()) @db.VarChar(36)
  name       String   @db.VarChar(100)
  email      String   @unique @db.VarChar(255)
  password   String   @db.VarChar(255)   // bcrypt hash
  homepageId String?  @db.VarChar(36)
  createdAt  DateTime @db.DateTime(6)
}

model session {
  id        String   @id @default(uuid()) @db.VarChar(36)
  userId    String   @db.VarChar(36)
  token     String   @unique @db.VarChar(64)
  isActive  Boolean  @default(true)
  createdAt DateTime @db.DateTime(6)

  @@index([userId])
}

model page {
  id            String    @id @default(uuid()) @db.VarChar(36)
  userId        String    @db.VarChar(36)
  parentId      String?   @db.VarChar(36)
  title         String    @db.VarChar(1000)
  content       Json?
  isPublic      Boolean   @default(false)
  category      String?   @db.VarChar(255)
  sortOrder     Int
  childrenCount Int
  createdAt     DateTime  @db.DateTime(6)
  updatedAt     DateTime  @db.DateTime(6)
  deletedAt     DateTime? @db.DateTime(6)

  @@index([userId])
  @@index([parentId])
}

model comment {
  id        String   @id @default(uuid()) @db.VarChar(36)
  pageId    String   @db.VarChar(36)
  userId    String   @db.VarChar(36)
  body      String   @db.Text
  createdAt DateTime @db.DateTime(6)
  updatedAt DateTime @db.DateTime(6)

  @@index([pageId])
}
```

### 3.3 — Run the first migration
From `backend/`:
```
npx prisma migrate dev --name init
```
This creates `prisma/migrations/...`, applies it to the DB, and generates the client.

### 3.4 — CREATE `src/common/prisma.ts`
```ts
import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for the whole process (avoids exhausting the pool).
export const prisma = new PrismaClient();

// Verifies the database is reachable; throws if the connection fails.
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

// Closes the connection pool during shutdown.
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
```

### 3.5 — EDIT `src/server.ts` to connect before listening and disconnect on shutdown
```ts
import { config } from "./config/env";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./common/prisma";

// Connects the database, then builds and starts the app with graceful shutdown.
async function start(): Promise<void> {
  await connectDatabase();
  console.log("Database connected.");

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Boot the server; exit if the database (or any startup step) fails.
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

---

## Verify

```
npm run dev
```
Expected logs, in order:
```
Database connected.
Server running on http://localhost:3000 (development)
```

Inspect the tables visually:
```
npx prisma studio
```
You should see empty `appuser`, `session`, `page`, and `comment` tables.

Failure path: put a wrong password in `DATABASE_URL`, run `npm run dev` → it prints
`Failed to start server:` and exits (it does **not** half‑start). Restore the URL.

---

## Review checklist

- [ ] `npx prisma migrate dev --name init` succeeded and created a migration folder.
- [ ] The four tables exist (check `npx prisma studio`).
- [ ] The app logs `Database connected.` before `Server running`.
- [ ] A bad `DATABASE_URL` prevents startup (fail‑fast).
- [ ] Only `common/prisma.ts` constructs `PrismaClient`.

---

## What's next

Phase 4 introduces **internationalization**: every message moves into locale files behind
a `t(locale, key)` translator, so no English lives in code. → [phase-4.md](phase-4.md)
