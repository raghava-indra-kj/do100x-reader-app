# Google-only sign-in

## Result and boundaries

Google Identity Services is the sole interactive sign-in provider. The browser
loads Google's hosted `https://accounts.google.com/gsi/client` SDK; the backend
uses the official `google-auth-library`, pinned to 11.1.0 (Node.js >=22).
There is no Firebase or second credential system. Configuration comes from
environment files, with the public client ID served at runtime by the backend.
The frontend does not need a duplicate build-time client ID or any secret.

Old login/signup endpoints, username/password columns, signup UI, client-side
credential persistence, and HTTP user-ID authentication have been removed.
Old session cookies are invalid. A removal-only cleanup deletes previously
stored `current_user` data; it never reads it or restores authentication from it.
Other applications do not need Reader content to sign in.

## Storage

| Table | Purpose |
| --- | --- |
| `appuser` | Internal UUID, display name, email, avatar URL, timestamps only. |
| `auth_identity` | Google subject linked to an internal user; unique `(provider, providerSubject)` and `(userId, provider)`. |
| `auth_login_challenge` | Hashed single-use login challenge and nonce, with a five-minute expiry. No Google token stored. |
| `reader_preferences` | Per-account nullable `homePageId`, separate from account identity. |

Google `sub`, not email, identifies an account. Subjects are case-sensitive in
MySQL; separate Google identities with the same email are not silently merged.
Reader preferences reference owned pages and reject missing, foreign, or deleted
pages. Reader initialization locks the account row within a transaction so
concurrent opens create only one home page. It repairs stale preferences by
selecting an existing active root page or creating a new Home. A read alone does
not initialize content. Hard deletion sets the home preference to null.

Future workspace/team/app preferences should use their own tables referencing
the internal account UUID; do not add application settings to `appuser`.

## Environment

Copy `reader-backend/.env.example` to `reader-backend/.env` when setting up a new
machine. Never commit the real file. Required values:

```dotenv
PORT=3000
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/reader_google"
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
SESSION_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
APP_ORIGINS=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

Use URL-encoded database credentials when they contain special characters.
Generate a secret, for example with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Keep the secret stable across restarts and identical across backend instances.
Changing it invalidates all sessions. Client IDs are public; OAuth client secrets
are not needed for this ID-token sign-in flow and are never shipped to the browser.
Google credentials JSON files are ignored by Git.

`APP_ORIGINS` is a comma-separated list of exact origins, without paths or
wildcards. Production requires `NODE_ENV=production`, HTTPS origins, and HTTPS
at the public-facing proxy. Secure cookies are automatically enabled in that
environment. All private HTTP mutations and sign-in/logout require a matching
Origin header. Do not allow arbitrary origins.

## Google Cloud setup

1. Open Google Cloud Console and select your project.
2. In Google Auth Platform, configure Branding, Audience, and contact details.
   Add your account as a test user if the app is in testing mode.
3. In Clients, create or select an OAuth **Web application** client.
4. Add `http://localhost:3000` to **Authorized JavaScript origins**.
   Also add `http://localhost:5173` if using Vite development. These are distinct
   origins; configuring `APP_ORIGINS` does not update Google's console.
5. Add each actual production HTTPS origin. HTTP entries for production domains
   are not interchangeable with HTTPS. Wait for Google settings to propagate.
6. Copy the client ID into `GOOGLE_CLIENT_ID`, then restart the backend.

This uses the JavaScript popup callback, not an authorization-code redirect
flow, so no app redirect URI or client secret is required. Do not add arbitrary
extra Google API scopes. For third-party Google account emails, email is profile
information, not an independent identity/linking or domain-access authority.

## Clean database cutover and startup

The approved local database is `reader_google`; the previous `reader` database
is left untouched. There is no account/content import or legacy compatibility
path. The checked-in baseline is
`reader-backend/prisma/migrations/20261004_google_only/migration.sql`.
It includes the complete Reader, Tasks, quizzes, and authentication schema.
Point this release at a new empty database, not the old populated database.

From the repository root:

```powershell
npm run prod
```

This runs installation, generation, `prisma migrate deploy`, builds, and server
startup. Normal startup never invokes reset, schema push, or seed. Subsequent
starts retain data and only deploy pending migrations. Future schema changes
must add reviewed migrations rather than editing the applied baseline.

For individual steps use `npm run setup`, then `npm start`. On Windows stop your
running Reader backend before setup/generation; it may hold the Prisma engine
DLL open. For local unified mode visit http://localhost:3000 and select Sign in.
The first Open Reader creates or resolves your separate Reader home preference.

## Authentication flow and API

1. `GET /backend-api/auth/config` returns only the public Google client ID.
2. `GET /backend-api/auth/challenge` issues an HttpOnly SameSite=Strict challenge
   cookie and returns a nonce; only hashes are stored server-side.
3. Google returns a signed credential bound to that nonce. The frontend sends
   `POST /backend-api/auth/google` with `{credential}` and `x-login-csrf: nonce`.
4. The server checks exact Origin, cookie/challenge, expiry, the official Google
   signature/issuer/audience/token expiry verifier, verified email, and nonce.
5. A transaction consumes the challenge and creates or updates the Google
   identity/profile. Unique keys and bounded transaction retries handle races.
6. An HttpOnly SameSite=Strict signed application cookie is issued for seven
   days; private HTTP routes also verify that its Google identity still exists.
7. `GET /backend-api/auth/session` restores only `{id, displayName, email,
   avatarUrl}`; `POST /backend-api/auth/logout` clears the browser cookie.

Neither Google ID tokens nor application session tokens are persisted in
localStorage. Logout clears this browser session; it does not log out of Google
globally or revoke a copied application cookie server-side. Private HTTP routes
ignore supplied account IDs and use the verified session identity. Public reading
remains available with existing page visibility rules. Session rechecks preserve
editor state during temporary network failures; the server continues enforcing
authentication on every private request.

Reader API: `GET /backend-api/reader/preferences`, `POST /backend-api/reader/home`,
and `PATCH /backend-api/reader/preferences` with `{homePageId: UUID | null}`.

MCP retains its existing transport and account-identifier authentication model,
as requested. It uses the internal UUID of a Google-backed account, not usernames
or email. This is distinct from browser Google sign-in; protect that identifier
as required by your existing MCP configuration. No new MCP security architecture
or token system has been introduced.

## Verification and limitations

Automated tests cover configured Google verifier invocation, rejected token
claims, nonce/Origin checks, expired or replayed challenges, concurrent first
sign-in, profile updates, separate Reader initialization, stale home repair,
cross-account private API access, obsolete login endpoints/session rejection,
logout, and frontend bootstrap/race/offline behavior. Database tests clean up
only their own fixtures or roll back transactions.

A real Google account consent popup cannot be fully exercised by those tests.
Manually sign in once on an authorized origin, reload, open Reader and Tasks,
and sign out. If Google reports an origin mismatch, check exact protocol, host,
and port in Google Cloud. If the script is blocked, the UI exposes an error and
retry instead of falling back to passwords.

## Official references

- [Google web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Server-side ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [Official Node.js authentication library](https://github.com/googleapis/google-auth-library-nodejs)
