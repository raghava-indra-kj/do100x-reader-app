# Global Reader page search

Complete implementation approved on 4 October 2026. Automated verification remains deferred.

## Scope

One Find a page icon in private Reader headers, plus Ctrl+K / Cmd+K. Searches titles and categories at any nesting level. It does not search document bodies, quizzes, Tasks or Finance.

The existing local subpage filter is unchanged. No AI service, external search engine, copied content or new dependencies were added.

## API and data

`GET /backend-api/pages/search?q=&limit=20` requires the existing authenticated session. It is registered before the dynamic page route. Ownership comes only from the session; deleted pages are excluded. Search responses use Cache-Control: no-store.

Queries are trimmed, at most 200 characters; result limits are integers from 1 to 50. Missing query text produces Recently updated results.

The database orders exact title, title prefix, title substring and category matches, followed by updatedAt descending and ID ascending. Parameterized LOCATE expressions handle percent signs, underscores and backslashes as literal text. The service retrieves limit+1 records to indicate more matches and never downloads the entire page collection for ranking.

Results expose only ID, title, category, updatedAt, ancestor IDs/titles and pathIncomplete. Shared ancestors are loaded in owner-scoped batches with a maximum of 32 levels and cycle protection. Incomplete paths are marked with an ellipsis rather than pretending to be complete.

Migration `20261004_page_search` adds `(userId, deletedAt, updatedAt)` to page. It does not delete or rewrite content. The normal setup process applies it; it was not applied during this change. Substring searches still scan the owner's matching candidate rows; the index is not a full-text search index.

## UI behavior

The dialog uses the existing theme-aware dialog and button primitives. Input is focused on open. Arrow keys select, Enter opens the canonical Reader URL, and Escape closes. It renders parent paths to distinguish duplicate titles.

Requests debounce by 200ms, cancel on query change/unmount and ignore cancelled responses. Results from a different query are not shown as current results. Errors offer Retry. Empty, loading, recently updated and additional-match states use brief labels.

Account changes remount search state; sign-out and public views unmount it. Route changes close it. The keyboard shortcut does not intercept editable inputs or open over other dialogs, avoiding navigation around editor/quiz draft confirmations. Normal Reader navigation and unavailable-page handling are retained.

The existing 44px app bar is unchanged. Narrow Reader headers tighten global-control spacing to accommodate the one new icon without adding a row.

## Deferred verification

Added backend query-validation, SQL-parameterization, bounded-result, batched-ancestor, missing-parent and cycle/depth tests; frontend repository contract/cancellation forwarding tests; and Reader public/private trigger assertions. These tests have not been run.

Remaining runtime verification includes actual MySQL ranking/collation behavior, migration deployment, keyboard and screen-reader interaction, debounce/cancellation races, account changes, public/private pages, duplicate/long titles, all themes and narrow screen widths. No builds, compilation, tests, database migration or browser checks were run for this change.
