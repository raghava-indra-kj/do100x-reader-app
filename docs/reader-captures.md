# Reader captures and Chrome extension

Implementation prepared locally on 14 October 2026. The agreed design is account-backed temporary captures with a seven-day expiry. The migration is a draft only: it has not been applied to any database, and this feature has not been deployed.

## User flow

1. Select text and choose **Read selection in do100x**, or use the extension toolbar to read an article. Explicitly pasting text or Markdown into the popup is also supported. Ordinary copying does not trigger collection.
2. The extension opens the existing Reader application. Its normal sign-in protects the capture; no account token is stored in the extension.
3. The capture opens as a private page using the existing Reader view, including reading settings, sections, comments, vocabulary and quizzes. Existing AI configuration and access requirements still apply.
4. A visible expiry banner and a separate **Temporary inbox** distinguish captures from saved pages. The inbox supports search, source information, expiry dates, Keep and Discard.
5. **Keep in my pages** selects an owned destination, defaulting to Reader home. It removes expiry from the same page, retaining its URL, content, notes and quizzes. Kept pages inherit their destination's public accessibility; the dialog explains this. Sharing and subpages become available after keeping it.
6. An unkept capture becomes inaccessible after seven days. Background cleanup then deletes its page, attached comments and quiz records. Independently saved vocabulary remains in the vocabulary library.

## Platform and boundaries

Use a small Chrome Manifest V3 extension and reuse the web Reader instead of maintaining a second reading interface. The extension uses Chrome's [activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) for a user-invoked page capture, [context menus](https://developer.chrome.com/docs/extensions/reference/api/contextMenus) for selected text, and locally bundled [Mozilla Readability](https://github.com/mozilla/readability) and [Turndown](https://github.com/mixmark-io/turndown) for article extraction and Markdown conversion.

The initial release handles readable HTML articles, selected passages and pasted text. Browser-protected pages, PDF extraction and inaccessible frames may need the explicit paste fallback. It does not bypass sign-in or paywalls, mirror the Reader offline, or monitor the clipboard. Web Store publication is a separate release step.

The service worker holds up to ten pending captures in browser-session storage for at most 30 minutes, allowing sign-in or a failed-save retry. Closing Chrome clears this queue. Successful saves acknowledge and remove the pending content. A capture is limited to 512 KiB of UTF-8 text; an account can have 100 active temporary captures.

The destination is fixed at build time (default `https://www.do100x.com`). Only the bound top-level tab at that exact origin, import route and capture nonce can retrieve pending content. The content script is installed on the app origin to survive SPA sign-in, but responds only on `/reader/capture`. There is no broad website host permission, clipboard permission, remote executable code or extension-held API credential. Source metadata removes URL credentials, queries and fragments; links inside article content retain their destinations.

## Storage and expiry

Three nullable columns on `page` hold `captureExpiresAt`, `captureKey` and `captureSourceUrl`. All existing rows retain a null expiry and remain permanent. A unique account/capture-key index makes save retries idempotent; an expiry index supports bounded cleanup. No content backfill or deletion is in the migration.

Captures are private and rootless, and are excluded from saved-page collections, search and home-page choices. Direct page access is allowed only before expiry. Shared Prisma query middleware enforces this across ordinary HTTP and MCP page operations; lifecycle operations deliberately supply an explicit expiry filter. Future raw SQL or nested relation queries must preserve this boundary. Temporary captures cannot be shared, made the Reader home, or used as parents until kept.

Keep and cleanup lock and recheck the same page, so cleanup cannot delete a concurrently kept page. Comment creation takes the page lock as well, preventing orphan comments during deletion. Cleanup removes dependent quiz rows in foreign-key order and refuses to cascade into child pages or a configured home page.

Cleanup is disabled by default through `READER_CAPTURE_CLEANUP=0`. When explicitly enabled, it runs after one minute and every 15 minutes, processing at most 100 candidates per run. Expiry access checks do not depend on the worker. A backlog or worker outage can delay physical deletion; monitor cleanup failures, skipped rows and backlog before promising a fixed deletion time. Flag rollback stops deletion but does not make expired captures readable again.

## Main page organization

The main collection now has drag handles and keyboard reordering (Space, arrow keys, Space), plus Sort and Group controls shared with the sidebar. **Rearrange pages** restores manual, ungrouped ordering. Reordering is disabled during a pending update and when filtered/grouped order would make its meaning ambiguous.

Successful reorder, create, edit and delete operations invalidate both collections. A request sequence prevents late responses from overwriting a newer view. Returning focus to Reader also refreshes collections after changes made in another tab or through MCP. The existing MCP move operation remains available; this change does not add a new general move-to-folder dialog.

## Release sequence

1. Review the additive SQL in `reader-backend/prisma/migrations/20261014000000_reader_captures/migration.sql`. Do not run the repository startup/deployment wrappers against production during review: some automatically apply migrations.
2. After separate authorization, apply the migration to an isolated database with representative disposable data. Verify account isolation, expiry boundaries, Keep/cleanup races, comments and quiz deletion, home-page protections, and unchanged permanent pages. Test an installed unpacked extension, including logged-out sign-in and retry.
3. Back up production and separately approve the additive migration and coordinated backend/frontend deployment. The new backend requires these columns; it cannot be deployed against the old schema. Keep cleanup disabled initially.
4. Smoke-test capture, Keep, permissions and list synchronization, then explicitly enable cleanup and observe deletion of disposable captures. Retain the nullable columns on an application rollback; do not drop tables or reset data.
5. Package/publish the extension after the matching app release. Chrome Web Store listing, privacy disclosures, required artwork and review are still release work. Unpacked installation instructions are in `reader-extension/README.md`.

## Verification of the local implementation

- Backend unit suite: 133 passed, 14 database-dependent tests skipped. The new lifecycle tests cover expiry, quotas, retries, Keep and cleanup protections without connecting to a database.
- Frontend production build and backend bundle build passed. Targeted strict type checking of the capture backend modules passed; the full backend type check exceeded Node's default heap limit.
- New main-list ordering and refresh tests: five passed. Extension protocol tests: three passed. The full frontend suite had one existing quiz-message assertion failure (`quiz-draft.test.ts`, expected wording containing “prompt”); this is unrelated to captures.
- Browser checks used the real built frontend with an in-memory sample API, with no production requests or database connection. Inbox display, Reader banner, Keep at the same URL, synchronized keyboard reordering, sorting and narrow-screen layout were inspected.
- The migration, real MySQL integration and an installed Chrome extension end-to-end flow remain unverified. The local implementation and packaged extension are not a deployed release.
