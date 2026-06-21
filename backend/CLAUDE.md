# Code Style

## Formatting

- Never add extra spaces to align arguments or values across lines — write each line as it naturally reads.
- 4-space indentation. Prettier is configured with `printWidth: 120`.

## Functions

- Use destructured named parameters for any function with 2 or more parameters.

## Imports

- Always use path aliases (`@core/`, `@lib/`, `@modules/`). Never use relative imports.

## File Naming

- Pattern: `[subject].[role].ts` — always a singular role suffix.
- Roles: `.service.ts`, `.handler.ts`, `.middleware.ts`, `.router.ts`, `.models.ts`, `.constants.ts`, `.mapper.ts`.

## Architecture

- Strict unidirectional imports: `lib` → `core` → `modules`. A layer must not import from a layer above it.
- `lib/` — zero app knowledge, purely reusable utilities.
- `core/` — app infrastructure: config, db, errors, HTTP middleware. No business logic.
- `modules/` — business domain. Each module owns its errors, models, services, handlers, and router.

## Services

- Services validate their own input independently of callers. Never assume pre-validation by the HTTP layer.
- Business rules are explicit in code. Never rely on database defaults to enforce them.
- IDs are always generated in application code (`generateUuid()`), not delegated to the database.

## Errors

- HTTP status codes: use `StatusCodes.*` from `http-status-codes`. Never hardcode numeric status codes.
- Error codes follow `namespace.specific_issue` format. Always define as exported constants in a `.constants.ts` file. Never inline as strings.
- `DomainError` has no HTTP concerns. Middleware at the HTTP boundary converts domain errors to `ApiError`.

## Logging

- Log 5xx errors in all environments. Log 4xx errors in non-production only.

## Comments

- Do not add inline code comments.

---

# Endpoint Development Guide

This section provides exact, step-by-step instructions for writing new endpoints. Every pattern is extracted from the existing auth module and must be followed precisely.

## Request Lifecycle (Order of Execution)

Every request flows through this exact pipeline:

```
Request → requestIdMiddleware → basePath → [validateReqBody] → [authMiddleware] → handler → service → Response
                                                                                                ↘ errorMiddleware (on throw)
```

1. `requestIdMiddleware` assigns `req.requestId`, `req.clientRequestId`, `req.optCurrentUser = null`.
2. Express router matches the route.
3. `validateReqBody(Schema)` middleware parses + validates `req.body` using a Zod schema. On failure, throws `ApiError` with `StatusCodes.BAD_REQUEST`. On success, replaces `req.body` with the parsed (typed, trimmed, transformed) data.
4. `authMiddleware` (if route is protected) resolves the token from `req.headers.authorization`, calls `resolveCurrentUser`, and sets `req.currentUser`.
5. Handler function orchestrates: calls a service, catches domain errors, maps them to `ApiError`, and writes the response.
6. If anything throws, Express catches it and `errorMiddleware` converts it to a JSON error response.

## File Structure for a New Module

Create a directory under `src/modules/<module-name>/` with these files:

```
modules/
  <module-name>/
    <module-name>.router.ts          ← route definitions
    <module-name>.handler.ts         ← HTTP handlers (one file for all handlers in the module)
    <module-name>.models.ts          ← shared response types for the module
    <module-name>.constants.ts       ← domain constants (limits, config values)
    <action>.models.ts               ← per-action Zod schemas and types (e.g., signup.models.ts)
    <action>.service.ts              ← per-action business logic (e.g., signup.service.ts)
    <module-name>.middleware.ts       ← module-specific middleware (if needed)
    <module-name>-result.mapper.ts   ← DB-row-to-response mappers (if needed)
    errors/
      <module-name>-error.ts         ← DomainError subclass
      <module-name>-error.constants.ts ← error code constants
```

Key rules:
- **One service file per action** (e.g., `signup.service.ts`, `signin.service.ts`) — not one mega service.
- **One handler file per module** containing all handler functions — not one file per handler.
- **One models file per action** for input schemas; one shared models file for response types.

## Router (`*.router.ts`)

The router is a pure wiring file. It only imports and composes middleware + handlers. Zero logic.

```typescript
import { Router } from "express";
import { authMiddleware } from "@modules/auth/auth.middleware";
import { validateReqBody } from "@core/http/validate-req-body.middleware";
import { handleCreateThing, handleGetThing } from "./<module>.handler";
import { CreateThingInputSchema } from "./create-thing.models";

const router = Router();

router.post("/<module>", authMiddleware, validateReqBody(CreateThingInputSchema), handleCreateThing);
router.get("/<module>/:id", authMiddleware, handleGetThing);

export { router as <module>Router };
```

Rules:
- Middleware order: `authMiddleware` BEFORE `validateReqBody`. Auth must run first for protected routes.
- Route paths are bare strings — no dynamic base path.
- Export the router with a named alias: `export { router as <module>Router }`.
- Register the router in `app.ts` via `app.use(env.api.basePath, <module>Router)`.

## Input Models (`<action>.models.ts`)

Every endpoint that accepts a body defines a Zod schema and infers a TypeScript type from it.

```typescript
import { z } from "zod";
import { TITLE_MIN_LENGTH, TITLE_MAX_LENGTH } from "@modules/<module>/<module>.constants";

export const CreateThingInputSchema = z.object({
    title: z.string().trim().min(TITLE_MIN_LENGTH).max(TITLE_MAX_LENGTH),
    isPublic: z.boolean().default(false),
});

export type CreateThingInput = z.infer<typeof CreateThingInputSchema>;
```

Rules:
- Schema names end with `Schema` (e.g., `CreateThingInputSchema`).
- Type names are the schema name without `Schema` (e.g., `CreateThingInput`).
- Validation constraints (min/max lengths) come from exported constants — never inline magic numbers.
- Use `.trim()` on strings. Use `.toLowerCase()` on emails. Use `.pipe(z.email())` for email validation after length checks.
- Use `.default()` for optional fields with defaults — never rely on the DB default.
- When the handler needs to combine body data with `req.currentUser` data, define a separate service input type:

```typescript
// Body schema (what the client sends)
export const SignoutBodySchema = z.object({
    allSessions: z.boolean().default(false),
});
export type SignoutBody = z.infer<typeof SignoutBodySchema>;

// Service input (what the service actually needs)
export type SignoutInput = {
    userId: string;
    sessionId: string;
    allSessions: boolean;
};
```

## Handler (`*.handler.ts`)

Handlers are the HTTP boundary. They do exactly three things:
1. Extract data from `req.body` / `req.params` / `req.currentUser`.
2. Call a service function.
3. Write the HTTP response or catch domain errors and re-throw as `ApiError`.

```typescript
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { ThingError } from "./errors/thing-error";
import { THING_NOT_FOUND } from "./errors/thing-error.constants";
import { createThing } from "./create-thing.service";

export async function handleCreateThing(req: Request, res: Response): Promise<void> {
    try {
        const result = await createThing(req.body);
        res.status(StatusCodes.CREATED).json(result);
    } catch (err) {
        if (err instanceof ThingError) {
            if (err.errorCode === THING_NOT_FOUND) {
                throw new ApiError({
                    statusCode: StatusCodes.NOT_FOUND,
                    message: "Thing not found",
                    errorCode: THING_NOT_FOUND,
                });
            }
        }
        throw err;
    }
}
```

Rules:
- Return type is always `Promise<void>`. The handler writes the response, it does not return it.
- Status codes: `CREATED` (201) for resource creation, `OK` (200) for reads/updates, `NO_CONTENT` (204) for deletes/actions with no response body.
- The handler is the **only place** where `DomainError` → `ApiError` translation happens. Match on `err instanceof <DomainError>` and then on `err.errorCode` to map to the correct HTTP status.
- If no specific match, always `throw err` to let the global error middleware handle it as a 500.
- Never import Prisma or DB logic in a handler. All data access goes through services.
- For authenticated routes, access user data via `req.currentUser.id`, `req.currentUser.sessionId`, etc.
- When a service needs data from both the body and the current user, assemble the service input in the handler:

```typescript
export async function handleSignout(req: Request, res: Response): Promise<void> {
    const body = req.body as SignoutBody;
    await signoutUser({
        userId: req.currentUser.id,
        sessionId: req.currentUser.sessionId,
        allSessions: body.allSessions,
    });
    res.status(StatusCodes.NO_CONTENT).send();
}
```

## Service (`<action>.service.ts`)

Services own all business logic and data access. One exported async function per file.

```typescript
import { prisma } from "@core/db/prisma";
import { generateUuid } from "@lib/uuid";
import { ThingError } from "./errors/thing-error";
import { THING_NOT_FOUND } from "./errors/thing-error.constants";
import { CreateThingInput, CreateThingInputSchema } from "./create-thing.models";

export async function createThing(input: CreateThingInput): Promise<ThingResult> {
    const parsed = CreateThingInputSchema.parse(input);

    // Business logic...
    const id = generateUuid();

    await prisma.thing.create({
        data: {
            id,
            title: parsed.title,
            isPublic: parsed.isPublic,
            createdAt: new Date(),
        },
    });

    return { id, title: parsed.title };
}
```

Rules:
- **Always re-parse input at the top**: `const parsed = Schema.parse(input)`. The service does not trust the caller — validation is independent of the HTTP layer.
- **Generate IDs in application code**: `const id = generateUuid()`. Never let the database generate IDs.
- **Set timestamps in application code**: `createdAt: new Date()`. Never rely on DB defaults.
- Import `prisma` from `@core/db/prisma` for database access.
- Throw `DomainError` subclasses (never `ApiError`) — the service has no knowledge of HTTP.
- Use `IllegalStateError` for invariant violations that indicate bugs (e.g., "user has no homepage").

## Transactions

When a service performs multiple writes that must succeed or fail together, use `prisma.$transaction`:

```typescript
const { updatedUser, accessToken } = await prisma.$transaction(async (tx) => {
    await tx.appuser.create({
        data: {
            id: userId,
            name: parsed.name,
            email: parsed.email,
            password: hashedPassword,
            createdAt: new Date(),
        },
    });

    const updatedUser = await createUserHomepage({ tx, userId });
    const accessToken = await createSession({ tx, userId });

    return { updatedUser, accessToken };
});
```

Rules:
- Use the interactive callback form: `prisma.$transaction(async (tx) => { ... })`.
- Inside the callback, **always use `tx`** (the transaction client) for all DB operations — never `prisma`.
- When calling helper services within a transaction, **pass `tx` as a parameter**:

```typescript
export async function createSession({
    tx,
    userId,
}: {
    tx: Prisma.TransactionClient;
    userId: string;
}): Promise<string> {
    await tx.session.create({ ... });
    return accessToken;
}
```

- The helper service parameter type is `Prisma.TransactionClient` (imported from `@prisma-generated`).
- This allows the same helper to be called inside or outside a transaction (pass `prisma` directly as `tx` when outside a transaction, as done in `signin.service.ts`).

## Error Handling

### Error Class Hierarchy

```
Error
  └─ AppError                        (base, in @core/errors/)
       ├─ ApiError                   (HTTP-aware, has statusCode — only created in handlers/middleware)
       ├─ IllegalStateError          (invariant violations / bugs)
       └─ DomainError               (business rule violations — never HTTP-aware)
            ├─ AuthError             (auth-specific)
            ├─ UserError             (user-specific)
            └─ <YourModule>Error     (your module)
```

### Creating a Domain Error for a New Module

**1. Error class** — `errors/<module>-error.ts`:
```typescript
import { DomainError } from "@core/errors/domain-error";

export class ThingError extends DomainError {}
```

**2. Error codes** — `errors/<module>-error.constants.ts`:
```typescript
export const THING_NOT_FOUND = "thing.not_found";
export const THING_TITLE_TAKEN = "thing.title_taken";
```

**3. Throwing in service**:
```typescript
throw new ThingError({ errorCode: THING_NOT_FOUND, message: "Thing not found" });
```

**4. Catching in handler** (DomainError → ApiError):
```typescript
if (err instanceof ThingError) {
    if (err.errorCode === THING_NOT_FOUND) {
        throw new ApiError({
            statusCode: StatusCodes.NOT_FOUND,
            message: "Thing not found",
            errorCode: THING_NOT_FOUND,
        });
    }
}
throw err;
```

## Middleware

### Using `authMiddleware`

- Apply `authMiddleware` to any route that requires authentication.
- After `authMiddleware` runs, `req.currentUser` is populated with a `CurrentUser` instance containing: `id`, `name`, `email`, `homepageId`, `sessionId`.
- The Express `Request` type is globally augmented (in `@core/types/express.d.ts`) so `req.currentUser` is always typed — no manual casting needed.

### Using `validateReqBody`

- Apply `validateReqBody(Schema)` to any route that accepts a JSON body.
- Pass the Zod schema directly: `validateReqBody(CreateThingInputSchema)`.
- On success, `req.body` is replaced with the parsed data. Inside the handler, `req.body` already has the correct type and transformations applied (trimmed strings, lowercased emails, defaults filled).
- On failure, an `ApiError` with `StatusCodes.BAD_REQUEST` and structured validation issues is thrown automatically.

### Writing Module-Specific Middleware

Module middleware follows the Express `(req, res, next)` signature. It catches domain errors and maps them to `ApiError`:

```typescript
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { ThingError } from "./errors/thing-error";
import { THING_FORBIDDEN } from "./errors/thing-error.constants";

export async function thingOwnerMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        // resolve and validate...
        next();
    } catch (err) {
        if (err instanceof ThingError) {
            if (err.errorCode === THING_FORBIDDEN) {
                throw new ApiError({
                    statusCode: StatusCodes.FORBIDDEN,
                    message: "Forbidden",
                    errorCode: THING_FORBIDDEN,
                });
            }
        }
        throw err;
    }
}
```

## Mappers (`*-result.mapper.ts`)

When a DB row needs to be transformed into an API response type, use a dedicated mapper function:

```typescript
import { thing } from "@prisma-generated";
import { ThingResult } from "./<module>.models";

export function toThingResult(row: thing): ThingResult {
    return {
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
    };
}
```

Rules:
- Mapper functions are pure — no DB calls, no side effects.
- Input type is the Prisma model type (or an intersection like `appuser & { homepageId: string }`).
- Output type is the API response type defined in `<module>.models.ts`.
- Name pattern: `to<ResultType>(row)`.

## Response Types (`<module>.models.ts`)

Shared response types for the module live in the main models file:

```typescript
export type ThingResult = {
    id: string;
    title: string;
    createdAt: Date;
};
```

## Registering a New Module

After creating all files, register the router in `src/app.ts`:

```typescript
import { thingRouter } from "@modules/thing/thing.router";

// Inside createApp():
app.use(env.api.basePath, thingRouter);
```

Place it after existing routers, before `notFoundMiddleware`.

## Quick Checklist for a New Endpoint

1. [ ] Define input Zod schema + inferred type in `<action>.models.ts`
2. [ ] Define response type in `<module>.models.ts`
3. [ ] Create domain error class in `errors/<module>-error.ts` (extends `DomainError`)
4. [ ] Define error code constants in `errors/<module>-error.constants.ts`
5. [ ] Write service function in `<action>.service.ts` — re-parse input, generate IDs, use transactions, throw domain errors
6. [ ] Write handler function in `<module>.handler.ts` — call service, catch domain errors, map to `ApiError`, write response
7. [ ] Wire route in `<module>.router.ts` — apply `authMiddleware` and `validateReqBody` as needed
8. [ ] Register router in `app.ts`
9. [ ] Add mapper in `<module>-result.mapper.ts` if DB rows need transformation
