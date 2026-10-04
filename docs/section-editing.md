# Precise section-body editing

## Using it

On an owned page, click inside a section body, then use the single small pencil
icon in the reading pane's top-right corner. Its tooltip identifies the selected
section. There are no duplicate editing buttons beside headings. The full-screen
editor shows only that body's
Markdown, with Preview and Original/Proposed comparison. Save applies one patch.
Cancel/close asks before discarding an unsaved draft; failed saves keep the draft
open, with a Copy draft action. A page refresh in the store does not reset it.

A section body ends at the next semantic heading of **any level**. Its own
heading and all child headings/bodies are excluded. For example, editing an H2
does not touch the H3 below it. Introduction text without a heading is editable
as its own body. Empty pages continue to use the existing full-page editor.

Use full-page editing for renaming, moving, adding, or removing headings and for
changing frontmatter or document-wide reference/footnote definitions. Body-only
editing rejects these operations. It accepts complete fenced code/diagrams,
lists, tables, and contained HTML/details blocks. Diagram syntax is rendered by
the existing renderer; this feature does not automatically repair invalid diagrams.

Public visitors and signed-in nonowners cannot edit. An owner can still edit
their own shared page. No AI calls are made by the section editor.

## Safety contract

- `@reader/md-ast` parses CommonMark + GFM + YAML frontmatter + math. Source
  positions, not heading labels or search-and-replace, identify the target.
  Duplicate titles, Setext headings, Unicode, and headings inside fences are
  handled by the parser. Positions use JavaScript UTF-16 offsets.
- `replaceSectionBody` splices the original string. It never serializes the
  complete document. Every character before `bodyStart` and after `bodyEnd`
  remains identical. Only the edited body/separating line breaks are normalized
  to the source's line-ending style. An unchanged draft is a byte-preserving no-op.
- The server recomputes the target and checks its version, raw heading, exact
  expected body, and SHA-256 hash. The client does not supply a trusted end offset.
- Validation reparses the proposed document and checks every heading's text,
  level, and expected shifted offset. New headings and constructs swallowing an
  existing heading are rejected. Unclosed HTML containers and changed global
  definitions/frontmatter are rejected too.
- Saving uses an atomic `UPDATE ... WHERE id + owner + contentVersion + not-deleted`.
  A concurrent write returns HTTP 409 rather than overwriting new content.
  A whole-page version is deliberately conservative: a change in another section
  also requires a fresh snapshot; there is no automatic rebasing.
- The patch writes only `content`, `contentVersion`, and `updatedAt`. Title,
  category, sharing, prompts, and other metadata are untouched.
- Every existing HTTP/MCP page-content writer carries a version precondition.
  Prisma middleware advances the version and rejects unversioned direct content
  updates. New writers must follow that contract; do not bypass it with raw SQL,
  nested updates, or page upserts. External database writers must increment the
  version as well.

## API and future AI integration

`GET /backend-api/pages/:id/edit-targets` requires an authenticated owner and
returns `contentVersion` plus exact `{ range, target, expectedBodyHash }` snapshots.

`PATCH /backend-api/pages/:id/section-body` accepts:

```json
{
  "contentVersion": 4,
  "target": {
    "kind": "heading",
    "headingStart": 0,
    "bodyStart": 8,
    "expectedHeading": "## Intro",
    "expectedBody": "\n\nOriginal body\n\n"
  },
  "expectedBodyHash": "<SHA-256 returned by edit-targets>",
  "newBody": "Replacement Markdown body"
}
```

Success returns `{ content, contentVersion }`. Errors are 400 (invalid request),
401 (missing session), 404 (missing/nonowned page), 409 (stale snapshot), or
422 (unsafe body/structure). Never retry a 409 with a newly fetched version while
keeping old positions. Preserve the draft and ask the user to select/review again.

For future AI, the model should produce only `newBody`, not positions or a complete
page. A user reviews the result, and the same patch endpoint applies it. An entire
diagram fence can be changed from D2 to Mermaid inside the selected body without
giving the model authority to modify anything else. Diagram validation and model
configuration are separate future work, not part of this implementation.

MCP `reader_get_page` and `reader_get_page_sections` expose `contentVersion`.
`reader_update_section` defaults to this same body-only service and requires the
version. `reader_replace_lines` also requires it. Indexed append/insertion require
the caller's version. Full-page replacement through `reader_update_page` requires
it whenever `content` is supplied. Explicit `preserveHeading: false`, insertion,
and line editing remain structural MCP operations, not body-only guarantees.
Clients using the older tool schemas must fetch and pass a fresh version.

## Setup and verification

The current Google-only release uses the checked-in Prisma migration baseline.
Use a new empty database; the old username/password database is not migrated.
Stop the running backend first on Windows so it does not lock Prisma's engine,
then from the root:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run build
npm start
```

Page ownership uses a signed HttpOnly SameSite=Strict session cookie issued only
after server verification of Google sign-in. Private HTTP APIs derive account
identity from that cookie, not from request headers or submitted user IDs.
Configure a stable `SESSION_SECRET` of at least 32 random characters in every
environment. Production requires HTTPS. See [google-sign-in.md](google-sign-in.md)
for database cutover, environment settings, Google setup, and startup.

```powershell
npm test --workspace @reader/md-ast
npm test --workspace reader-backend
$env:RUN_DATABASE_TESTS='1'
npm test --workspace reader-backend
Remove-Item Env:RUN_DATABASE_TESTS
npm test --workspace reader-frontend
```

The opt-in database test creates a fixture inside a transaction and always rolls
it back. HTTP tests use real requests and mocked storage. MCP tests use the actual
SDK client/server over in-memory transport. The local browser fixture at
`reader-backend/scripts/browser-fixture.ts` is for nonproduction verification only;
it requires `RUN_BROWSER_TESTS=1`, creates an isolated temporary account/page,
binds loopback port 4317, and removes
only those fixture IDs on shutdown. Do not expose or deploy the fixture server.
