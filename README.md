# Reader

Reader uses Google Identity Services for authentication. It does not use Firebase and it never accepts, stores, or displays a username/password credential.

## Google Sign-In configuration

1. In Google Cloud Console, create an OAuth 2.0 **Web application** client and configure the OAuth consent screen.
2. Add every browser origin that will show Reader under **Authorized JavaScript origins**. For local Vite development this is `http://localhost:5173`; add the deployed HTTPS origin for production.
3. Put the same public client ID in both runtime configuration files:

   - `reader-backend/.env`: `GOOGLE_CLIENT_ID="…apps.googleusercontent.com"`
   - `reader-frontend/public/env.json`: `"googleClientId": "…apps.googleusercontent.com"`

   The client ID is public by design. Do not put a Google client secret in either file; this sign-in flow does not need one. Set `APP_ORIGIN` in the backend `.env` to the Vite/deployed browser origin (comma-separate multiple origins).

4. Apply the schema and generate the Prisma client:

   ```powershell
   cd reader-backend
   npx prisma db push
   npx prisma generate
   ```

   For an existing installation, take a database backup, deploy this schema, then run the idempotent Reader migration once:

   ```powershell
   npm run data:migrate-reader-documents
   ```

   Do not use `db:reset` in a deployed environment. The migration preserves legacy page IDs, content, properties, comments, and the home-page choice while moving Reader data to versioned documents.

## Identity model

`user_account` is application-independent and stores only Google identity/profile data. A `workspace` is the tenancy boundary shared by Reader, Tasks, and future applications. `reader_space` is Reader's installation inside a workspace; `reader_member_preference` holds a person's Reader navigation state such as their home document. Tasks and future applications can reference the account and workspace IDs while owning their own app data.

## Reader documents and Markdown

Markdown is the canonical document format. Each document has a stable ID and immutable revision snapshots; writes require the revision that the editor started from, so a stale save returns a conflict instead of overwriting another editor. The visual editor is a Markdown projection, not a second content format. The supported Reader Markdown profile is CommonMark with YAML frontmatter, GitHub Flavored Markdown (tables/task lists/strikethrough), and inline/display math.

Documents are private to their workspace by default. Workspace roles support teams, direct grants support a single document's viewer/editor access, and share links are opaque, hashed, read-only, and revocable. Share links never include descendant documents implicitly.

## Deploying the data-model transition

1. Back up the database.
2. Deploy the backend and run `npx prisma db push` / `npx prisma generate`.
3. Run `npm run data:migrate-reader-documents` from `reader-backend`.
4. Deploy the frontend and verify a migrated document, revision history, and Google sign-in.
5. Keep legacy tables read-only during the transition. The browser page API is retired and legacy Reader MCP write tools are intentionally unavailable; do not remove legacy tables until the document-native MCP and vocabulary integrations are released and the retention window has passed.

The migration is safe to re-run and does not duplicate document revisions or annotations.

Browser sessions are opaque, hashed server-side tokens stored in HTTP-only, SameSite cookies. The browser does not persist user identity in local storage or send a user-ID header. MCP access uses a separately generated high-entropy token that can be rotated from Settings.
