# Phase 7 — Auth & User Module

**Goal:** Build the first complete feature: signup, login, session check, logout. The domain
service is **pure** (throws `DomainError`, returns data) and the homepage is provisioned
atomically. Sessions are token rows; logout flips a flag.

**What you'll learn:** a full vertical slice (constants → errors → schema → service → routes),
password hashing, session‑token auth, and how the access middleware sets `req.userId`.

**Prerequisites:** Phases 1–6 complete.

---

## Concept (read once)

- **Passwords** are stored as a **bcrypt** hash. We compare with `bcrypt.compare`. The same
  error (`auth.invalid_credentials`) is returned for both "no such email" and "wrong password"
  so attackers can't enumerate accounts.
- **Sessions:** on signup/login we insert a random token row (`isActive: true`) and return the
  token. The client sends `Authorization: Bearer <token>`. Logout sets `isActive: false`
  (we never delete — audit trail).
- **Homepage onboarding** lives here (it's part of the user lifecycle). It writes the initial
  `page` row directly inside the signup/login transaction, so `auth` never imports `page`
  (keeping the dependency graph acyclic).
- The service throws `AuthError.*` (a `DomainError`). It has **no idea** these become 401/409.

---

## Steps

### 7.1 — Install hashing
From `backend/`:
```
npm install bcrypt
npm install -D @types/bcrypt
```

### 7.2 — CREATE `src/modules/auth/auth.constants.ts`
```ts
// Field limits and crypto parameters for the auth/user feature (mirror appuser columns).
export const PERSON_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt ignores bytes past 72
export const BCRYPT_SALT_ROUNDS = 10;
export const SESSION_TOKEN_BYTES = 32;
```

### 7.3 — CREATE `src/modules/auth/auth.errors.ts`
```ts
import { DomainError } from "../../common/errors/domain-error";

// Stable codes (also used as i18n keys) for auth failures.
export const AUTH_EMAIL_TAKEN = "auth.email_taken";
export const AUTH_INVALID_CREDENTIALS = "auth.invalid_credentials";
export const AUTH_UNAUTHENTICATED = "auth.unauthenticated";

// Domain errors raised by the auth feature (code only — no HTTP, no text).
export class AuthError extends DomainError {
  // Signup with an email that already exists.
  static emailTaken() { return new AuthError(AUTH_EMAIL_TAKEN); }
  // Wrong email or password (same error for both to prevent enumeration).
  static invalidCredentials() { return new AuthError(AUTH_INVALID_CREDENTIALS); }
  // No valid session on a protected action.
  static unauthenticated() { return new AuthError(AUTH_UNAUTHENTICATED); }
}
```

### 7.4 — CREATE `src/modules/auth/auth.schema.ts`
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
  z.email("validation.invalid_email").max(EMAIL_MAX_LENGTH, "validation.too_long")
);

// Request body for POST /auth/signup.
export const signupSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(PERSON_NAME_MAX_LENGTH, "validation.too_long"),
  email: emailField,
  password: z.string().min(PASSWORD_MIN_LENGTH, "validation.password_too_short").max(PASSWORD_MAX_LENGTH, "validation.too_long"),
});
export type SignupRequest = z.infer<typeof signupSchema>;

// Request body for POST /auth/login.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "validation.required"),
});
export type LoginRequest = z.infer<typeof loginSchema>;
```

### 7.5 — CREATE `src/modules/auth/auth.service.ts`
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

### 7.6 — CREATE `src/modules/auth/auth.access.ts`
```ts
import { Request } from "express";
import { prisma } from "../../common/prisma";
import { asyncHandler } from "../../common/http/async-handler";
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

// Returns the authenticated userId or throws auth.unauthenticated.
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

### 7.7 — CREATE `src/modules/auth/auth.routes.ts`
```ts
import { Router } from "express";
import { asyncHandler } from "../../common/http/async-handler";
import { validate } from "../../common/validation/validate";
import { requireAuth, requireUser } from "./auth.access";
import { signupSchema, loginSchema } from "./auth.schema";
import * as authService from "./auth.service";

const router = Router();

// POST /signup — register a new user and open a session.
router.post("/signup", validate(signupSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await authService.signup(req.body));
}));

// POST /login — verify credentials and open a session.
router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  res.status(200).json(await authService.login(req.body));
}));

// GET /session — return the current user's profile for a valid token.
router.get("/session", asyncHandler(async (req, res) => {
  const userId = await requireUser(req);
  res.status(200).json(await authService.getProfile(userId));
}));

// DELETE /session — log out by deactivating the current session.
router.delete("/session", requireAuth, asyncHandler(async (req, res) => {
  await authService.logout(req.headers.authorization!.slice(7));
  res.status(204).send();
}));

export default router;
```

### 7.8 — EDIT `src/app.ts` — mount the auth router (remove any leftover demo routes)
```ts
import authRouter from "./modules/auth/auth.routes";

// ...inside createApp(), after the status route and before app.use(errorMiddleware):
app.use("/backend-api/auth", authRouter);
```

---

## Verify

```
npm run dev

# signup
curl -s -X POST http://localhost:3000/backend-api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"Ada@Example.com ","password":"secret1"}'
# -> 201 { token, userId, name:"Ada", email:"ada@example.com", homepageId }

# duplicate email (any casing) -> 409 auth.email_taken
# login with the token's email lowercased works; wrong password -> 401 auth.invalid_credentials

# use the token:
curl -s http://localhost:3000/backend-api/auth/session -H "Authorization: Bearer <token>"
# -> 200 profile

# no token:
curl -s -i http://localhost:3000/backend-api/auth/session
# -> 401 auth.unauthenticated
```
Confirm the email was stored **lowercased and trimmed** (`ada@example.com`) and a `Home`
page exists for the user (`npx prisma studio`).

---

## Review checklist

- [ ] Signup stores a bcrypt hash (not plaintext) and a `Home` page is created atomically.
- [ ] Email is trimmed + lowercased; duplicate (any casing) → 409.
- [ ] Wrong email and wrong password both → 401 `auth.invalid_credentials`.
- [ ] `GET /session` with a token returns the profile; without → 401.
- [ ] `auth.service.ts` imports no Express and throws only `AuthError` (a `DomainError`).

---

## What's next

Phase 8 builds the **page module**: CRUD, trash/restore, swap, public access, and markdown
parsing via `@reader/md-ast` — all in a pure domain service. → [phase-8.md](phase-8.md)
