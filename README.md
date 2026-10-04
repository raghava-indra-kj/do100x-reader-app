# do100x

Reader, Finance and Tasks are part of the do100x application and share Google-only
sign-in. The home page provides quick access to each app. No Firebase, usernames,
or passwords.

## Run the full application

Requires Node.js 22 or newer and MySQL. Configure `reader-backend/.env` using
`reader-backend/.env.example`; use a **new empty database** for this release.
Google credentials and complete configuration are covered in
[Google sign-in setup](docs/google-sign-in.md).

From this folder, stop your running application server and run:

```powershell
npm run prod
```

This installs dependencies, generates the Prisma client, deploys migrations,
builds both apps, and starts the unified server at http://localhost:3000.
It does not reset or seed the database. Use `NODE_ENV=development` for local
HTTP; production needs HTTPS, `NODE_ENV=production`, and exact HTTPS origins.

If dependencies, migrations, and builds are already ready, use `npm start`.

## Application routes

`/` is the do100x launcher. Apps live at `/reader`, `/finance` and `/tasks`;
Reader documents and public share links use `/reader/pages/:id`. Google sign-in
and shared account settings use `/login` and `/settings`.

Old document and demo addresses are not registered and do not redirect. Unknown
addresses show a not-found screen with a link home. Backend API and MCP resource
addresses are unchanged. See [branding and route verification](docs/do100x-rebrand.md).

## Development

After `npm run setup`, run these in two separate terminals:

```powershell
npm run dev --workspace reader-backend
```

```powershell
npm run dev --workspace reader-frontend
```

Use http://localhost:5173, authorize that origin in Google Cloud, and include it
in `APP_ORIGINS`. Vite proxies `/backend-api` to the backend on port 3000.

## Features and verification

- [Precise Markdown section editing](docs/section-editing.md)
- [Quizzes and feedback](docs/quizzes.md)
- [Google sign-in architecture and checks](docs/google-sign-in.md)
- [Finance: accounts, plans, statements and MCP](docs/finance.md)

```powershell
npm test --workspace @reader/md-ast
npm test --workspace @reader/finance-core
npm test --workspace reader-frontend
npm test --workspace reader-backend
```

Database integration tests are opt-in. Point `DATABASE_URL` at an appropriate
test database before setting `RUN_DATABASE_TESTS=1` and running backend tests.
