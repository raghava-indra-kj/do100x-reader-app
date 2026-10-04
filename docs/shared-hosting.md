# Develop locally and deploy a private ZIP

Requires Node.js 22.12 or newer, npm, MySQL and Bash on the server. Local packaging
uses Windows PowerShell/.NET ZIP support on Windows; Linux/macOS also require
the `zip` utility. No new Node dependency is used for packaging. The host must
allow a shell startup command, dependency installation, Prisma's native engine,
outgoing npm/Prisma downloads and access to the configured MySQL database.

## Two explicit profiles

| Usage | Configuration |
| --- | --- |
| Local development | `reader-backend/.env` (`NODE_ENV=development`) |
| Packaging and hosting | `reader-backend/.env.prod` (`NODE_ENV=production`) |

Copy `.env.example` or `.env.prod.example` to the respective real file once and
fill in its settings. Real files are ignored by Git. The runtime scripts parse
dotenv data with Node's built-in parser; they do **not** execute it as shell code.
Use literal values, not shell commands or `${VARIABLE}` expansion.

Configure DATABASE_URL, GOOGLE_CLIENT_ID, APP_ORIGINS and a stable SESSION_SECRET.
PORT defaults to 3000. Use your provider's exact database name, username and host;
URL-encode the username/password inside the MySQL URL. No credentials belong in
this document, a tracked template or frontend configuration.

For production, APP_ORIGINS must list your exact HTTPS frontend origins without
paths or trailing slashes. Authorize those same origins in the Google Web client.
Google's public client ID comes from the backend at runtime, so there is no
separate frontend environment file or per-domain frontend rebuild.

The production profile wins over inherited application settings. The exception
is PORT: a numeric port assigned by the hosting platform takes precedence over
the file. Keep SESSION_SECRET stable between releases; changing it signs users
out. Each profile is mandatory; a missing production file never falls back to
the development file. Files are validated without printing secret values.

## Development

Install all project dependencies once with `npm install`, then:

```sh
npm run dev
```

This generates Prisma's client, applies pending migrations **only to the database
configured in `.env`**, and starts backend/frontend watchers together. It never
resets or seeds that database. Do not point the development file at production.
Use local PORT=3000 to match Vite's proxy and open http://localhost:5173. Both
localhost:3000 and localhost:5173 should be allowed Google/APP_ORIGINS origins.
Ctrl+C stops both child process trees. If either watcher fails, the other stops.

## Create the ZIP

With dependencies installed and `.env.prod` configured:

```sh
npm run package
```

This generates the build-time Prisma client with a dummy database URL (generation
does not connect), builds both applications, then writes a uniquely named ZIP
inside `releases`. **No local or production migrations, setup, start, reset or
seed command is run during packaging.** Fix any build error before deploying;
failed builds never produce a completed ZIP. Build tools must be installed
locally, including development dependencies.

The artifact contains compiled frontend/backend, workspace dependency manifests,
the unchanged lockfile, Prisma schema/migrations, production startup helpers,
`start.sh`, this guide, release metadata and the captured `.env.prod`. It does not
contain development `.env`, node_modules, Git files, credentials JSON files or
the application source tree. The runtime root package exposes only `npm start`.
Backend/shared workspace imports are already bundled by the existing backend
build; their manifests are retained for npm's workspace/lockfile resolution.

Production configuration is validated and copied, **not injected into the frontend
build**. The ZIP and its staging directory are private; temporary staging is
removed after packaging. Do not use this ZIP as a public download or attach it
to a public release: it contains database credentials and SESSION_SECRET.

## Shared hosting

1. Stop the old application before activating a release with schema changes.
2. Upload and extract the ZIP into a private application directory **outside the
   hosting provider's public web root**. Extract its contents directly into that
   directory; `start.sh`, `package.json` and the app folders are at the same level.
3. Set Node.js 22.12+ and startup command `bash start.sh`, with the application root
   as its working directory. In an extracted ZIP, `npm start` invokes the same
   script. A control panel accepting only a JavaScript entry file/Passenger is
   not supported by this shell workflow without provider-specific integration.
4. Start/restart the app. The script installs locked backend runtime dependencies,
   generates Prisma's client **on the server**, applies pending migrations from
   `.env.prod`, and starts the compiled app. It does not build, reset or seed.
5. Route the HTTPS domain through the hosting platform to the app's assigned PORT.

No environment edits on the server are needed when the ZIP is configured correctly.
Set the hosting platform's environment to production too if it requires that field;
app/database settings come from `.env.prod`. Do not copy Windows node_modules to
Linux. The server installs/generates compatible native Prisma assets itself.

Use `bash start.sh` or `npm run start:hosting` in the source project only if you
intentionally want to start production: `npm ci --omit=dev` replaces installed
dependencies and removes development tools. Do not run it for local development.
Every startup runs the locked install and migration check; allow enough startup
time and avoid concurrent startup processes for the same extracted directory.

## Subsequent releases and database safety

Re-run `npm run package` locally after changes. Stop the app, extract the new ZIP
into a fresh private directory, select that application root and restart using the
same command. Keep the same production settings and secret. Existing database
data stays in MySQL; uploads never contain database files. Deploy migrations
can still alter/delete columns or consolidate records according to their SQL,
so back up the database before deploying schema changes. They are not automatic
backwards-compatibility migrations; old code may no longer work after a change.

Never overwrite a live directory during installation, migrate reset, or delete
the production database. Code rollback alone cannot undo an applied schema
migration; review the migration/backups before reverting a release.

## Verification status

These scripts have not been executed as part of implementation. No ZIP, production
connection, dependency install, build, migration or hosting startup has been run.
Verify the artifact/startup on a disposable database before first production use.

References: [Node environment parsing](https://nodejs.org/download/release/latest-jod/docs/api/util.html#utilparseenvcontent),
[locked npm installations](https://docs.npmjs.com/cli/commands/npm-ci/).
