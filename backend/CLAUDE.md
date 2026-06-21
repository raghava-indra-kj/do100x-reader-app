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

## Errors

- HTTP status codes: use `StatusCodes.*` from `http-status-codes`. Never hardcode numeric status codes.
- Error codes follow `namespace.specific_issue` format. Always define as exported constants in a `.constants.ts` file. Never inline as strings.
- `DomainError` has no HTTP concerns. Middleware at the HTTP boundary converts domain errors to `ApiError`.

## Logging

- Log 5xx errors in all environments. Log 4xx errors in non-production only.

## Comments

- Do not add inline code comments.
