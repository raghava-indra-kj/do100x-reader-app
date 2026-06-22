# Reader Backend — Architecture & Code Quality Review

**Reviewer perspective:** Senior software architect, production-readiness audit.
**Scope:** All hand-written source under `src/` plus `prisma/schema.prisma`, `app.ts`, `server.ts`, config, and infra. Generated Prisma client, `node_modules`, lockfiles, and `package.json`/`package-lock.json` were excluded from scoring per instructions (referenced only where they explain an issue).
**Date:** 2026-06-22

The codebase is, overall, cleanly structured and disciplined — the layering rules in `CLAUDE.md` are largely respected, errors are modelled well, and the auth/page services are readable. The issues below are the gap between "clean prototype" and "production-ready." They are ordered by severity within themed sections, but numbered sequentially so each can be tracked independently.

---

## A. Security & Authentication

### Problem 1: Sessions never expire

**Description**
The `session` model (`prisma/schema.prisma`) has `token`, `isActive`, and `createdAt`, but no `expiresAt` or any TTL. `createSession` (`session.service.ts`) sets `isActive: true` and a `createdAt`, and `resolveCurrentUser` only checks `session.isActive`. A token is therefore valid indefinitely until the user explicitly signs out.

**Why It Matters**
A leaked or stolen bearer token (browser storage theft, log leak, shared device) grants permanent access. There is no natural expiry to bound the blast radius, no "sign out everywhere on password change" because there is no password-change flow, and no way to expire idle sessions. This is one of the most common findings that blocks a security review.

**Recommended Solution**
Add `expiresAt DateTime` to `session`, set it in `createSession` (e.g. `now + 30d`, plus an optional sliding "last used" refresh). In `resolveCurrentUser`, reject sessions where `expiresAt < now` (return `AUTH_SESSION_INACTIVE` or a new `AUTH_SESSION_EXPIRED`). Add a scheduled job (or `deleteMany` on access) to purge expired/inactive sessions so the table does not grow unbounded.

Action: P2

### Problem 2: No rate limiting or brute-force protection

**Description**
There is no rate-limiting middleware anywhere (`app.ts` wires only `express.json`, `requestIdMiddleware`, the routers, not-found, and error middleware). `package.json` contains no `express-rate-limit`, `helmet`, or equivalent. `/auth/signin` and `/auth/signup` are unthrottled.

**Why It Matters**
Unlimited login attempts enable credential stuffing and password brute-forcing. Unlimited signup enables automated account/spam creation and resource exhaustion (every signup also creates a homepage page row and runs Argon2, which is deliberately CPU-expensive — making signup a cheap DoS vector). Argon2 slows a single guess but does nothing against distributed attempts.

**Recommended Solution**
Add IP- and account-scoped rate limiting (e.g. `express-rate-limit` with a Redis store for multi-instance deployments) on auth routes specifically, plus a sensible global limit. Add exponential backoff / temporary lockout after repeated failed logins for the same email. Set `app.set("trust proxy", ...)` correctly so client IPs are accurate behind a load balancer.

ACTION: P2

### Problem 3: User enumeration via timing and response differences

**Description**
`signinUser` (`signin.service.ts`) returns immediately with `AUTH_INVALID_CREDENTIALS` when the email is not found, and only runs `verifyPassword` (Argon2) when the user exists. The response time for "unknown email" is therefore measurably faster than "known email, wrong password." Separately, `signupUser` returns `409 USER_EMAIL_TAKEN`, directly confirming which emails are registered.

**Why It Matters**
An attacker can enumerate valid accounts by timing signin responses or by probing signup, then focus credential-stuffing on confirmed accounts. This is information leakage that undermines the (otherwise good) generic "Invalid credentials" message.

**Recommended Solution**
On signin, always perform an Argon2 verification against a constant dummy hash when the user is missing, so both paths take comparable time. Consider rate-limiting and a generic signup response (e.g. send a verification email regardless and never reveal "already taken" inline), or accept the signup trade-off but document it. At minimum, fix the timing side-channel in signin.

ACTION: P2

### Problem 4: Inconsistent authorization errors leak resource existence (IDOR enumeration)

**Description**
Ownership checks are not consistent across the page module. Some services treat "exists but not yours" as **404 Not Found**, hiding existence:

- `createPage`, `movePage` (neighbours), `reparentPage`, and all comment services use `if (!row || row.userId !== currentUser.id) → *_NOT_FOUND`.

Others treat it as **403 Access Denied**, *revealing* that the resource exists:

- `getPage`, `updatePage`, `deletePage`, `movePage` (the target page) use `if (!row) NOT_FOUND` then a separate `if (row.userId !== currentUser.id) PAGE_ACCESS_DENIED` (403).

**Why It Matters**
The 403 paths let any authenticated user distinguish "this page ID does not exist" (404) from "this page ID exists but belongs to someone else" (403), enabling enumeration of other users' page IDs. It is also an API-consistency defect — the same logical condition produces two different status codes depending on the endpoint.

**Recommended Solution**
Pick one policy (returning **404** for "not found OR not owned" is the safer default for a single-tenant-per-user model) and apply it uniformly across all page and comment services. Extract a shared `loadOwnedPage({ pageId, userId })` helper that throws a single canonical error so the rule cannot drift again.

ACTION: DO IT - implement the solution of loadOwnedPage

### Problem 5: Authorization header is consumed raw, with no scheme parsing

**Description**
`authMiddleware` (`auth.middleware.ts`) does `const token = req.headers.authorization;` and passes it straight to `resolveCurrentUser`, which queries `session.findFirst({ where: { token } })`. The stored token is `randomBytes(32).toString("hex")` (no scheme). So the client must send `Authorization: <hex>` with **no** `Bearer ` prefix.

**Why It Matters**
This silently breaks compatibility with every standard HTTP client, SDK, and proxy that assumes `Authorization: Bearer <token>` — the `Bearer ` prefix would become part of the token and the lookup would fail with a confusing 401. It is an undocumented, non-standard contract that will cause integration pain and is easy to get subtly wrong.

**Recommended Solution**
Parse the header explicitly: split on the first space, require the `Bearer` scheme (case-insensitive), and use the remainder as the token. Return `401` with a clear error if the scheme is missing/wrong. Document the expected header format.

ACTION: DO IT - Add Bearer

### Problem 6: No baseline HTTP hardening (helmet/CORS/headers)

**Description**
No `helmet` (security headers), no CORS configuration, and no explicit content-type or header policy are present. The app exposes a JSON API presumably consumed by a browser frontend, but CORS is entirely unconfigured.

**Why It Matters**
Missing security headers (HSTS, `X-Content-Type-Options`, frame options, etc.) weakens defense-in-depth. Missing/incorrect CORS either blocks the legitimate frontend or, if later "fixed" with `*`, opens the API to any origin. These are table-stakes for a production API.

**Recommended Solution**
Add `helmet()` early in the middleware chain. Add a configured `cors()` middleware with an explicit allow-list of origins sourced from env. Keep credentials handling explicit. Verify TLS is terminated upstream and enable HSTS.

ACTION: DO IT - Add helmet and cors

### Problem 7: Debug error responses leak internals in every non-production environment

**Description**
`error.middleware.ts` adds `debugMessage` and full `stack` to the response body whenever `env.isDebug` is true, and `env.ts` defines `isDebug = APP_ENV !== PRODUCTION`. So any environment that is not exactly `production` (including a misconfigured staging or a forgotten `APP_ENV`) returns stack traces and internal messages to clients.

**Why It Matters**
Stack traces reveal file paths, library versions, and internal logic to anyone hitting the API in a non-prod environment, and a single misconfiguration of `APP_ENV` in production would expose them there too. Internal error detail belongs in logs, not responses.

**Recommended Solution**
Gate verbose error bodies on an explicit, separate flag (e.g. `EXPOSE_ERROR_DETAILS`, default false) rather than inferring from `APP_ENV`. Never include `stack` in a response by default; always log it server-side via the existing pino logger.


ACTION: DO IT
---

## B. Database & Data Integrity

### Problem 8: Circular foreign key and a permanently-nullable invariant (`homepageId`)

**Description**
`appuser.homepageId → page.id` and `page.userId → appuser.id` form a circular FK. `homepageId` is `String?` (nullable) in the schema, but business logic requires every user to always have a homepage. The nullability is "patched" at runtime in at least three places (`signin.service.ts`, `me.service.ts`, `resolve-current-user.service.ts`) which each throw `IllegalStateError` when `homepageId` is null, plus `as appuser & { homepageId: string }` casts.

**Why It Matters**
A field that is structurally nullable but logically never-null forces defensive checks and unsafe casts to be scattered across the codebase forever; miss one and you get a runtime crash or a wrong type. The circular FK also complicates inserts (handled today only by the signup transaction), backups/restores, and any future bulk operations or cascade deletes.

**Recommended Solution**
Break the cycle: either make "homepage" a derivable property (e.g. `page.parentId IS NULL AND isHomepage = true`, or the single root page per user) instead of a column on `appuser`, or keep the column but make the invariant enforceable and centralize the "load user with guaranteed homepage" logic into one function that returns a non-nullable type, so the rest of the code never re-checks.

ACTION: Needs more clear and easy to understand explanation

### Problem 9: Missing composite indexes for real query patterns; non-indexable search

**Description**
MySQL/InnoDB auto-creates single-column indexes for FK columns (`userId`, `parentId`, `pageId`), but the actual access patterns are composite and unindexed:

- `queryPages` filters `where { userId, parentId }` and `orderBy sortOrder` → wants `@@index([userId, parentId, sortOrder])`.
- `createPage`/`reparentPage` find the last sibling via `where { userId, parentId } orderBy sortOrder desc` → same composite.
- `signoutUser` `updateMany where { userId, isActive }` → `@@index([userId, isActive])`.
- Search uses `title: { contains: searchQuery }`, which compiles to `LIKE '%term%'` — a leading-wildcard scan that cannot use any B-tree index, and there is no `FULLTEXT` index.

**Why It Matters**
As any single user accumulates pages, list/order queries degrade from index seeks to scans, and title search becomes a full-table scan. This is a latent performance cliff that will only appear under real data volumes.

**Recommended Solution**
Add the composite indexes above via Prisma `@@index`. For search, add a MySQL `FULLTEXT` index on `title` (and `content` if needed) and use full-text search, or integrate a dedicated search engine if richer search is planned. Re-run `EXPLAIN` on the hot queries to confirm index usage.

ACTION: P2

### Problem 10: No `onDelete` behavior; deletion correctness lives entirely in application code

**Description**
None of the relations declare `onDelete`/`onUpdate`. Cascade/cleanup is implemented manually: `deleteSubtree` (`delete-page.service.ts`) recursively deletes children and `deleteMany` comments. There is no handling for deleting an `appuser` at all (no account-deletion path), and a page deleted by any route other than `deletePage` would orphan its comments and children.

**Why It Matters**
Integrity depends on application discipline rather than database guarantees. Any future code path, admin script, or manual DB operation that deletes a row can leave orphans or violate FK constraints. Account deletion (a GDPR/"right to be forgotten" concern) is unimplemented.

**Recommended Solution**
Define explicit referential actions in the schema (`onDelete: Cascade` for comments→page and children→parent where appropriate, or `Restrict` where you want to force explicit handling). Even if you keep app-level deletion for the `sortOrder`/`childrenCount` bookkeeping, the DB should be the backstop. Add an account-deletion service that removes a user's sessions, comments, pages, and homepage in one transaction.

ACTION: P2
---

### Problem 11: Recursive subtree delete is N+1 and runs as one long transaction

**Description**
`deleteSubtree` issues one `findMany` per node to discover children, recurses, then per node runs `comment.deleteMany` + `page.delete`. The entire recursion executes inside a single `prisma.$transaction`.

**Why It Matters**
Deleting a large/deep subtree produces O(N) round-trips and holds a transaction (and row locks) open for the whole traversal, risking lock contention, transaction timeouts, and stack growth on pathological depth. It is the worst-case operation in the system from a latency standpoint.

**Recommended Solution**
Collect the full set of descendant IDs first (a recursive CTE via `$queryRaw`, or an iterative breadth-first gather), then perform set-based `deleteMany({ where: { id: { in: ids } } })` for comments and pages — turning O(N) statements into a handful. Alternatively, rely on `onDelete: Cascade` (Problem 10) and only do the `childrenCount` decrement in app code. Consider chunking very large deletes.

ACTION: DO IT - use the app level code improvements, do not modify the database schema for now.

### Problem 12: `childrenCount` is a hand-maintained denormalized counter (drift risk)

**Description**
`childrenCount` is incremented/decremented manually in `createPage`, `deletePage`, and `reparentPage`. There is no reconciliation, no DB constraint, and no check that it matches the actual child count.

**Why It Matters**
Any missed path, partial failure outside a transaction, or future bug silently desynchronizes the counter from reality, and clients relying on it (e.g. to show expand arrows) will be wrong. Denormalized counters are a classic source of "impossible" data states.

**Recommended Solution**
If the counter is kept, guard every mutation inside the same transaction as the structural change (mostly done today) and add a periodic reconciliation job/admin endpoint that recomputes counts from `COUNT(children)`. Better: drop the column and derive child counts on read via Prisma `_count`, unless profiling proves the denormalization is necessary.

ACTION: P2

### Problem 13: Unused `category` column

**Description**
`page.category` exists in the schema, the `Page`/`PageListItem` types, the mappers, and the `queryPages` select, but no endpoint or service ever writes it — it is always `null`. (Confirmed: the only non-generated references are the schema, the models, and the read mappers.)

**Why It Matters**
Dead schema surface area is misleading (it implies a feature that does not exist), adds payload weight to every page response, and creates a future migration question ("is anything relying on this?"). It is under-specified: there is no validation, no max set of categories, no endpoint.

**Recommended Solution**
Either implement the feature (add it to create/update schemas, validate it, expose it) or remove the column and its type/mapper references until it is actually needed.

ACTION: DO IT - implement the category feature

### Problem 14: No resource limits (unbounded growth per user)

**Description**
There is no cap on pages per user, tree depth, comments per page, or the size of the stored content JSON (only the *markdown string* input is capped at 500,000 chars; the parsed AST stored as JSON has no limit). List endpoints also return everything (see Problem 16).

**Why It Matters**
A single account can create unbounded data, degrading shared resources and making the unpaginated list/delete operations progressively slower and more expensive. Deeply nested trees worsen `deleteSubtree` and `wouldCreateCycle`. This is a scalability and abuse concern.

**Recommended Solution**
Introduce sane limits (max pages per user, max nesting depth, max comments per page) enforced in services, and bound the stored content size. Make limits configurable via env so they can be tuned without a deploy.

ACTION: P2

---

## C. Architecture, Boundaries & Coupling

### Problem 15: Comments are not their own module

**Description**
The objective describes a "Comments Module," but all comment code lives inside `modules/page/` (`create-comment.service.ts`, `comment.models.ts`, `comment-result.mapper.ts`, `errors/comment-error.ts`, etc.), and all comment HTTP handlers live in `page.handler.ts` alongside page handlers.

**Why It Matters**
The page module now owns two distinct domains, violating the one-module-per-domain principle in `CLAUDE.md` and SRP. `page.handler.ts` is large and mixes concerns, and comment files are interleaved with page files, making the module harder to navigate and grow.

**Recommended Solution**
Extract a `modules/comment/` module with its own router, handler, services, models, mapper, and errors, following the exact structure prescribed in `CLAUDE.md`. Mount its router in `app.ts`. Keep the page-existence/ownership check it needs as a small dependency on a shared page-loader.

ACTION: NOT AN ISSUE, Page and Comment are one module, not two separate modules. Comment is just a part of a page.

### Problem 16: No pagination on list endpoints

**Description**
`queryPages` returns every matching page (and when `parentId` is omitted, the user's *entire* page tree), and `queryComments` returns every comment on a page. `PageListResult`/`CommentListResult` carry no `total`, cursor, or limit. There is no `take`/`skip`/cursor anywhere.

**Why It Matters**
Response sizes and query cost grow without bound as users add pages/comments — the textbook scalability defect. The "/query" naming and POST-with-body shape suggest pagination was anticipated but never implemented.

**Recommended Solution**
Add cursor-based pagination (preferred for the `sortOrder`/`createdAt` orderings already in use): accept `limit` and a `cursor`, return `{ items, nextCursor }`. Enforce a max `limit`. Apply consistently to both list endpoints.

ACTION: P2

### Problem 17: `me` endpoint re-queries the database unnecessarily

**Description**
`authMiddleware` already resolves the full user (id, name, email, homepageId, sessionId) into `req.currentUser`. `handleMe` then calls `getMe`, which runs another `appuser.findUnique` and re-checks `homepageId`, returning essentially the same data.

**Why It Matters**
Every `/auth/me` call costs an extra DB round-trip for data already in memory, and `getMe`/`me.models.ts`/`MeResult` duplicate the `CurrentUser` and `AuthUser` shapes — more code to keep in sync for no benefit.

**Recommended Solution**
Have `handleMe` map directly from `req.currentUser` to the response. Delete `me.service.ts`/`me.models.ts` (or keep a thin mapper) and reuse the existing `AuthUser` type.

ACTION: DO IT - keep a thin mapper, do not delete the me.models.ts and me.service.ts

### Problem 18: Authenticated requests perform two sequential queries that should be one join

**Description**
`resolveCurrentUser` runs `session.findFirst({ where: { token } })` and then a separate `appuser.findUnique`. This happens on **every** authenticated request (all page/comment endpoints, `me`, `signout`).

**Why It Matters**
Two serial round-trips per request adds avoidable latency to the entire authenticated surface and doubles DB load at scale. It is the single hottest path in the app.

**Recommended Solution**
Fetch in one query with a relation include: `session.findUnique({ where: { token }, include: { user: true } })` (use `findUnique` since `token` is `@unique` — see Problem 19). Optionally add a short-TTL in-memory/Redis cache keyed by token to avoid hitting the DB on bursts.

ACTION: DO IT - lets get it in one query and for now no TTL is required.

### Problem 19: `findFirst` used where `findUnique` is correct

**Description**
`resolveCurrentUser` uses `session.findFirst({ where: { token } })`, but `token` is declared `@unique`.

**Why It Matters**
`findFirst` communicates "there may be many" and can prevent the query planner/Prisma from taking the unique fast path; it also reads as if duplicate tokens are expected, which is misleading. Minor performance and a clarity/correctness signal.

**Recommended Solution**
Use `findUnique({ where: { token } })`. (Folds naturally into the join fix in Problem 18.)

ACTION: DO IT

### Problem 20: Tight coupling from `auth` into `page` and `user`

**Description**
`signupUser` imports `createUserHomepage` from the page module and `UserError`/constants from the user module, so the auth signup flow directly orchestrates page creation. The "every new user gets a homepage" rule is hard-wired into auth.

**Why It Matters**
Auth now depends on the internal details of the page module; changes to homepage creation ripple into auth, and the modules can no longer evolve independently. It blurs the boundary between "authentication" and "page domain bootstrapping."

**Recommended Solution**
Invert the dependency: expose a `provisionNewUser`/post-signup hook owned by a higher-level orchestration (or an event like `user.created` that the page module subscribes to). At minimum, document this as an intentional composition seam and keep the coupling to a single well-named function call.

ACTION: NOT AN ISSUE, As of now keep it as is.

### Problem 21: The `user` module is effectively empty

**Description**
`modules/user/` contains only `user.constants.ts` (name/email/**password** length limits) and error definitions. There is no user router, handler, or service — no get/update profile, change password, change email, or delete account. Password-policy constants live in the user module but are consumed by auth.

**Why It Matters**
Core account lifecycle features are missing (notably change-password and delete-account, which interact with sessions and the homepage invariant). Placing password constants under `user` while auth owns authentication is a naming/placement smell that will confuse where new auth rules belong.

**Recommended Solution**
Flesh out the user module with the expected lifecycle endpoints as the app grows, and move password/credential constants to an auth (or shared security) location aligned with where they are enforced.

ACTION: NOT AN ISSUE, As of now keep it as is.

---

## D. Validation & Request/Response Contracts

### Problem 22: Login applies password length/policy validation

**Description**
`SigninInputSchema` validates the password with `min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH)` — the same policy as signup.

**Why It Matters**
Login should authenticate against whatever password the user actually has, not re-impose the *current* policy. If the policy ever tightens (e.g. min length raised), legitimate users with older valid passwords get a `400` validation error instead of a clean `401`, and the 400-vs-401 distinction leaks that the submitted password failed *format* rather than *match*.

**Recommended Solution**
On signin, validate only that `email` is well-formed and `password` is a non-empty string (perhaps a generous max to bound payload size). Reserve policy enforcement for signup and password-change.

ACTION: NOT AN ISSUE, keep it as of now.

### Problem 23: Duplicated Body/Input Zod schemas in every action

**Description**
Almost every action defines two near-identical schemas — e.g. `CreatePageBodySchema` and `CreatePageInputSchema`, `UpdatePageBodySchema`/`UpdatePageInputSchema`, `MovePageBodySchema`/`MovePageInputSchema`, `CreateCommentBodySchema`/`CreateCommentInputSchema` — differing only by the added `currentUser: z.instanceof(CurrentUser)` and id fields. The field rules (title/content/comment constraints) are copy-pasted between them.

**Why It Matters**
The "service re-validates independently" rule in `CLAUDE.md` is sound, but copy-pasting the constraints means they can silently drift (someone updates the body max but not the input max). It is significant duplication across the whole module.

**Recommended Solution**
Define the field rules once (a shared object or a base schema) and compose: `InputSchema = BodySchema.extend({ currentUser: ..., pageId: ... })`. The service still calls `.parse`, but there is a single source of truth for each field's rules.

ACTION: NOT AN ISSUE, Keep it for now

### Problem 24: Two divergent UUID validators

**Description**
`lib/uuid.ts` exposes `isValidUUID` using a hand-written v4 regex, used only by `request-id.middleware.ts`. Everywhere else (`page-id.models.ts`, `comment-id.models.ts`, `user-id.models.ts`, `session-id.models.ts`) uses Zod's `z.uuid({ version: "v4" })`.

**Why It Matters**
Two implementations of "is this a UUID" can disagree at the edges (e.g. casing, nil UUID, version nibble handling) and must both be maintained. Inconsistent validation is a subtle source of bugs and confusion about which is canonical.

**Recommended Solution**
Standardize on one. Either route the request-id middleware through the same Zod schema, or keep a single `isValidUuid` utility in `lib` and have the Zod schemas refer to it. Remove the redundant one.

ACTION: Suggest best solution.

### Problem 25: Asymmetric page-content contract (write a string, read an object)

**Description**
Create/update accept `content` as a markdown **string** (`z.string().max(...)`), which the service parses to a JSON AST via `@reader/md-ast` and stores. But the `Page` response type returns `content: PageBody | null` — a JSON **object**. So clients POST a string and GET back an object.

**Why It Matters**
This round-trip asymmetry is undocumented and surprising; a client cannot send back what it received without re-serializing to markdown (which it may not have). It complicates the client contract and any future "patch content" semantics.

**Recommended Solution**
Document the contract explicitly, and consider returning both a canonical form the client can resubmit (e.g. the markdown source or a stable serialized form) and/or the rendered AST. Define the response `content` type precisely instead of `Record<string, unknown>`.

ACTION: NOT AN ISSUE

### Problem 26: `searchQuery` and `parentId` query semantics are loose and unbounded

**Description**
In `QueryPagesBodySchema`, `searchQuery` is `z.string().trim().nullish()` with no min/max length, and `parentId` is `nullish`. In `queryPages`, omitting `parentId` (`undefined`) returns the user's **entire** page set across all depths, while passing `null` returns only roots — two very different behaviors hinging on present-vs-null, with no pagination.

**Why It Matters**
A one-character or empty-ish search, or an omitted `parentId`, can return an unbounded result set. The present/null/undefined trichotomy is subtle and easy to misuse from a client, and undocumented.

**Recommended Solution**
Add a minimum length (and a max) for `searchQuery`, define explicit, documented semantics for `parentId` (omitted vs null), and require pagination (Problem 16) so no query can return an unbounded set.

ACTION: DO IT
- add min length and max length
- search is only allowed in page titles
- parentId should be present, since user always has homepage
Recomment the best solution for this.

---

## E. API Design & Consistency

### Problem 27: Non-RESTful RPC-over-POST

**Description**
Mutations and reads are expressed as POST verbs in the path: `/pages/:id/update`, `/pages/:id/delete`, `/pages/:id/move`, `/pages/:id/reparent`, `/pages/query`, `/pages/:id/comments/:commentId/update`, `/pages/:id/comments/:commentId/delete`, etc. Only `GET /pages/:id`, `GET /auth/me`, and `GET /status` use a non-POST verb.

**Why It Matters**
Mixing REST (`GET /pages/:id`) with RPC-over-POST is inconsistent and discards HTTP semantics: caching, idempotency (PUT/DELETE), conditional requests, and standard client/proxy behavior. It increases the cognitive load for API consumers.

**Recommended Solution**
If a RESTful contract is desired, use `PATCH`/`PUT` for updates, `DELETE` for deletes, and `GET` with query params for reads. If the RPC style is a deliberate choice (it is internally consistent for the page module), document it explicitly and apply it everywhere — but the current mix should at least be made consistent.

ACTION: Suggest solution to make everything RPC
---

### Problem 28: Inconsistent response envelopes

**Description**
`/status` returns `{ success: true }`; list endpoints return `{ pages: [...] }` / `{ comments: [...] }`; single-resource endpoints return the bare object (`Page`, `Comment`); auth returns `{ user, token }`; errors return `{ errorCode, message, ... }`. There is no consistent envelope.

**Why It Matters**
Clients must special-case each endpoint's shape; there is no uniform place for metadata (pagination, request id echo) on success responses, and the `{ success: true }` shape is unlike everything else.

**Recommended Solution**
Adopt one success convention (either always-bare resources or a consistent `{ data, meta }` envelope) and apply it across all endpoints. Whatever is chosen, lists should carry pagination metadata in the same place.

ACTION: no envelope is required.

### Problem 29: Health check is shallow

**Description**
`GET /status` returns `{ success: true }` unconditionally and never checks the database or other dependencies.

**Why It Matters**
A load balancer or orchestrator using this endpoint will route traffic to an instance that cannot reach the DB, because the check always reports healthy. It conflates liveness with readiness.

**Recommended Solution**
Provide separate liveness (process up) and readiness (can reach DB, e.g. `SELECT 1` / `prisma.$queryRaw`) checks. Return non-200 from readiness when a dependency is down. Include build/version info for ops.

ACTION: Need to understand, explain slighly more

### Problem 30: `endpoints.md` is stale and incomplete

**Description**
`endpoints.md` lists pages as query/get/create/update/delete but omits `POST /pages/:id/move` and `POST /pages/:id/reparent`, which exist in `page.router.ts`.

**Why It Matters**
Hand-maintained docs that drift from the router mislead consumers and reviewers. There is no machine-checked source of truth for the API surface.

**Recommended Solution**
Generate API docs from the Zod schemas/routes (e.g. an OpenAPI generator) so they cannot drift, or at minimum update `endpoints.md` and add a test/lint that fails when routes and docs diverge.

ACTION: DELETE this file, it is not required

---

## F. Code Quality & Maintainability

### Problem 31: Repetitive `DomainError → ApiError` mapping chains

**Description**
`handlePageError`, `handleCommentEndpointError` (`page.handler.ts`), and the inline blocks in `auth.handler.ts` and `auth.middleware.ts` are long `if (err instanceof X) { if (err.errorCode === Y) throw new ApiError(...) }` ladders. Each new error code requires another hand-written branch with a hardcoded status and message.

**Why It Matters**
This is verbose, error-prone (easy to forget a mapping → an intended 4xx leaks as a 500), and duplicated across modules. The mapping data (errorCode → status + message) is logic that wants to be a table.

**Recommended Solution**
Define a per-module (or central) registry mapping `errorCode → { statusCode, message }`, and a single generic translator that looks up the code and rethrows as `ApiError`, falling through to `throw err` for unmapped codes. This removes the ladders and makes coverage auditable.

ACTION: Need better solution, till then do not change anything.

### Problem 32: Dead code

**Description**
Several exported symbols are never used: `optionalAuthMiddleware` (`auth.middleware.ts`), `requirePageId` (`page-id.validator.ts`), `requireCommentId` (`comment-id.validator.ts`), and the constant `USER_NO_HOMEPAGE` (`user-error.constants.ts`). Note also that `optionalAuthMiddleware`, despite its name, still calls `resolveTokenToUser`, which **throws** on an invalid token — so it is not actually "optional"/non-throwing as its name implies.

**Why It Matters**
Dead code rots: it is maintained, refactored, and read for no benefit, and a misleadingly-named export (`optionalAuthMiddleware`) is a future bug waiting to be wired up incorrectly.

**Recommended Solution**
Remove the unused exports. If optional auth is a real future need, implement it correctly (swallow `AUTH_INVALID_TOKEN`/`AUTH_SESSION_INACTIVE` and set `optCurrentUser = null` instead of throwing) and add a test before exposing it.

ACTION: Remove the optional auth feature for now.

### Problem 33: Unpinned internal dependency `@reader/md-ast: "*"`

**Description**
`package.json` declares `"@reader/md-ast": "*"`. This package is central — it parses and serializes all page content (`create-page.service.ts`, `update-page.service.ts`).

**Why It Matters**
A `*` version range means builds are not reproducible: a new publish of `@reader/md-ast` can change parsing/serialization behavior or break the build without any code change here. For a dependency that defines the on-disk content format, this is risky (content written by one version may not round-trip under another).

**Recommended Solution**
Pin to an exact version or a controlled caret range, and rely on the lockfile for reproducibility. If it is a workspace package, reference it via the workspace protocol so the version is explicit and local.

ACTION: Not an issue

### Problem 34: Two sources of truth for database configuration

**Description**
The application builds its DB connection from discrete env vars (`DATABASE_HOST/PORT/USER/PASSWORD/NAME`) in `env.ts` → `prisma.ts`'s `PrismaMariaDb` adapter, while `prisma.config.ts` (migrations/CLI) uses a separate `DATABASE_URL`. `.env.example` defines both.

**Why It Matters**
The runtime app and the migration tooling can point at different databases if the two representations drift, producing "migrations ran but app sees old schema"-class confusion. Two encodings of the same secret also doubles the rotation surface.

**Recommended Solution**
Derive one from the other (build `DATABASE_URL` from the discrete vars, or parse the discrete adapter config from a single `DATABASE_URL`) so there is exactly one source of truth. Validate it once in `env.ts`.

ACTION: DO IT

### Problem 35: Time-of-check/time-of-use gaps in multi-step writes

**Description**
`createPage` checks parent existence/ownership with a `findUnique` **outside** the subsequent `$transaction` that inserts the child and increments `childrenCount`. Similarly `reparentPage` validates the page and new parent outside the transaction (the cycle check is inside, which is good).

**Why It Matters**
Between the check and the write, the parent could be deleted or reparented by a concurrent request, leading to an insert under a now-missing parent or a `childrenCount` increment on a deleted row (or a swallowed FK error). Low-probability today but a correctness risk under concurrency.

**Recommended Solution**
Move the existence/ownership checks inside the transaction, and rely on FK constraints plus row-level reads within the transaction for consistency. Where ordering matters, lock the parent row (`SELECT ... FOR UPDATE` via raw query) before mutating its counter.

ACTION: DO IT

---

## G. Production Readiness, Testing & Observability

### Problem 36: No automated tests and no test framework

**Description**
There are zero test files and no test runner in `devDependencies` (no Vitest/Jest, no Supertest). Business-critical, intricate logic — `sortOrder` generation via fractional indexing, `wouldCreateCycle`, `deleteSubtree`, the signup transaction, auth resolution — is entirely untested.

**Why It Matters**
The most complex and highest-risk code (tree manipulation, transactions, auth) has no regression safety net. Refactors (including the fixes in this report) cannot be made with confidence, and edge cases (cycles, sibling ordering, concurrent moves) are easy to break silently.

**Recommended Solution**
Add a test runner (Vitest) and Supertest for HTTP-level tests. Prioritize: auth flows, ownership/authorization rules (Problem 4), move/reparent/cycle logic, subtree deletion, and `childrenCount` integrity. Run them in CI on every push.

### Problem 37: No request logging, metrics, or tracing

**Description**
Only the error path logs (`error.middleware.ts`). There is no request/access logging (e.g. `pino-http`), no metrics, and no tracing/correlation beyond the `x-request-id` echo. Successful requests are invisible in logs.

**Why It Matters**
In production you cannot see latency, throughput, error rates, or trace a user-reported issue across a successful-but-wrong request. Observability is a prerequisite for operating the service.

**Recommended Solution**
Add `pino-http` (reusing the existing logger and `requestId`) for structured access logs, expose Prometheus-style metrics (request count/latency/error rate, DB pool stats), and propagate a correlation/trace id. Ensure request bodies and the `Authorization` header are never logged.

### Problem 38: No process-level crash handlers

**Description**
`server.ts` handles `SIGINT`/`SIGTERM` and `start().catch(...)`, but there are no handlers for `unhandledRejection` or `uncaughtException`.

**Why It Matters**
An unhandled promise rejection or thrown error outside the request lifecycle can crash or, worse, leave the process in a half-dead state without a clean shutdown or a logged reason — making production incidents hard to diagnose.

**Recommended Solution**
Add `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers that log via pino and trigger the existing graceful shutdown (then exit non-zero so the orchestrator restarts the instance).

### Problem 39: Body-size limit leaves little margin for max content, and stored JSON is unbounded

**Description**
`API_BODY_SIZE_LIMIT` defaults to `1mb` while `PAGE_CONTENT_MAX_LENGTH` allows a 500,000-character markdown string. After JSON quoting/escaping plus the rest of the request, a near-max create/update can approach or exceed the body limit, producing an opaque 413. Separately, the parsed AST stored in `content` has no size cap (Problem 14).

**Why It Matters**
The two limits are coupled but set independently, so a content value that passes the field validator can still be rejected at the body parser with a less helpful error — and a valid input can blow up the stored row size unpredictably.

**Recommended Solution**
Choose the content limit and body-size limit together with explicit headroom, document the relationship, and bound the serialized AST size in the service. Return a clear validation error (not a raw 413) when content is too large.

---

## Summary of Priorities

The highest-impact items to address before going to production:

1. **Security:** session expiry (P1), rate limiting (P2), login timing/enumeration (P3), authorization-error consistency / IDOR (P4), Authorization header parsing (P5), helmet/CORS (P6), error-detail leakage (P7).
2. **Data integrity & scale:** indexes & search (P9), cascade/deletion strategy (P10–P11), pagination (P16), the `homepageId` invariant/circular FK (P8), resource limits (P14).
3. **Performance hot paths:** single-query auth resolution (P18), the redundant `me` query (P17).
4. **Engineering safety net:** tests (P36), observability (P37), crash handlers (P38).

Addressing sections A, B, and G first will remove the bulk of production risk; sections C–F mostly reduce future maintenance cost and should follow.
