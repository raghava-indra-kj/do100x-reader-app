# Finance implementation contract

Approved scope: the five phases of the Finance product plan, implemented in the
existing application and existing MCP server. No separate MCP, tokens or
revocation system is introduced. Existing MCP access remains unchanged at the
user's explicit direction; do not expose account identifiers as secrets for a
public financial deployment. Reader/Tasks authentication is outside this task.

The pre-Finance state was committed and pushed to origin/stable as `348f11d`.
Tests, builds, additive migrations on `reader_google`, and local browser
verification were approved. Never reset or replace that database. The old
`reader` database remains outside this feature's scope.

## Delivery checklist

- [x] 1. Ledger: books, freely named accounts, category groups, exact money,
  atomic account movements, income/expense/transfer/refund/correction,
  uncategorized entries, opening balances, ownership, retry safety, version checks.
- [x] 2. Finance UI: separate authenticated app, book selection, overview,
  accounts, transaction register/filter/search/splits, categories, pending/posted
  balances, edit history, recoverable deletion; core MCP parity.
- [x] 3. Plans: recurring and one-off income/expenses/transfers, date rules,
  low/expected/high estimates, occurrence confirmation/skip, partial-payment
  matching, budgets separate from predictions, dated cash forecasts and overdue
  obligations. Preserve historical snapshots when a recurring rule changes.
- [x] 4. Imports: CSV and structured MCP staging, original row provenance,
  possible duplicates versus reliable external identifiers, explicit row
  resolutions, overlapping statements, existing/manual and paired-transfer
  matches, atomic retry-safe commit, completeness checks and reconciliation.
- [x] 5. Reports: spending/income/cash flow, category/merchant/payment-method
  breakdown, comparisons, history-based estimate/recurrence suggestions with
  coverage warnings, reviewed categorization rules, exports, data-quality alerts.
- [x] Integration and verification: all Finance services exposed through HTTP
  and the one existing MCP; public reading never grants financial access;
  UI accessible in all existing themes; tests exercise actual invariants;
  production builds and approved local browser workflow verified.

Deferred as in the product plan: direct bank connectivity, direct PDF/OCR
adapters (AI clients may extract PDFs and use structured MCP imports now),
investment feeds, tax filing, payment execution, advanced savings/debt products,
multi-currency exchange, team memberships, and MCP credential redesign.

## Architecture

`@reader/finance-core` contains only pure exact-money and calendar rules shared
by frontend and backend. Finance business services live in
`reader-backend/src/finance`, with thin HTTP and MCP adapters. Frontend Finance
uses existing authentication, API client, React/MobX patterns and theme tokens.
Financial values are structured data; optional human notes remain Markdown.

## Storage and invariants

The `finance_book` owns one currency/precision and timezone. Its owner references
the internal appuser UUID. There are no Finance settings on appuser and no
relations to Reader pages or Tasks. Accounts, category hierarchies, movements,
splits, schedules, occurrences and import provenance are book-scoped. Composite
foreign keys enforce that referenced entities belong to the same book.

Money is stored in signed MySQL BIGINT minor units and exposed as strings.
Decimal request amounts are parsed with the book's precision. Never use JS
floating point for ledger calculations. Account balances derive from active
movements; a correction is an auditable ADJUSTMENT transaction, not a rewritten
balance. Debt accounts use negative balances; repayments increase that balance.

Transactions contain signed account movements and signed category splits.
Income: positive net movement and positive income splits. Expense: negative net
movement and positive expense splits. Refund: positive net movement and negative
expense splits. Transfers balance to zero and have no category splits.
Adjustments have no category splits and never count as earnings/spending.
Mixed loan repayments can have bank -5500, debt +5000 and interest expense 500.
An unclassified remainder is explicit, not silently assigned a guessed category.

Creates carry UUID request keys and hashes; exact retries return the original
record while changed payloads conflict. Writes are transactional, scoped through
book ownership and guarded by resource versions. Book-row locks serialize
same-book mutations. Audit records are appended in the same transaction.
Reconciled movements are protected until an explicit audited reopening.

Unchanged schedule occurrences are calculated during reads. Persist snapshots
only on explicit occurrence changes or actual-payment matching. A virtual
occurrence is identified by schedule ID/date and version 0; a stored snapshot
has its own version. Monthly rules always anchor on the original date and do
not drift after February. Future rule edits do not rewrite persisted bill/payment
history. Payment links use movement IDs so principal repayments remain cash
commitments without being mistaken for expense categories.

Import batches hold source metadata and immutable extracted rows. Draft
resolutions are separate from committed transactions. File hashes and reliable
external identifiers support exact matching; approximate fingerprints are only
candidate matches and are not unique transaction keys. Legitimate repeated
same-day/amount payments must remain possible. Original source descriptions
remain separate from editable normalized merchant names. Imported/deleted
transactions are not silently recreated on another import.

Forecasts combine unpaid scheduled occurrences, user-approved discretionary
estimates excluding scheduled items, and one-off plans. Budgets are targets and
are never summed into forecasts. Ranges are assumption-based scenarios, not
guaranteed probability bounds. Reports and suggestions state missing coverage.

## Completion evidence

Implemented backend/UI milestones:

- Google-only prerequisite commit `348f11d` was pushed before Finance changes.
- Finance schema and retry-index migrations are applied to `reader_google`;
  migration status is up to date. No user tables/data were reset or deleted.
- MySQL requires a replacement account-FK index before dropping its predecessor.
  The initial zero-step failed index migration was inspected, marked rolled back,
  reordered and successfully deployed. Cancelled drafts keep their file hash;
  book-row locks prevent duplicate active/committed file staging.
- Shared ledger/plan/import/report services have HTTP parity and 41 Finance tools
  registered in the existing MCP, with its access model unchanged.
- 25 backend Finance tests pass, including real DB ownership, exact retries,
  statement overlap, explicit repeats, paired transfers, reconciled-period locks,
  historical occurrences, partial payment matches, budget/forecast separation,
  reports, source-preserving rules and exports.
- A later-row failed import is tested using the actual service transaction:
  earlier ledger/provenance writes roll back. Concurrent exact create retries
  return one record. That isolated UUID-scoped test fixture is removed afterward;
  other database fixtures use outer transaction rollback.
- 26 pure Finance-core tests pass (money, dates, forecasts and CSV).
- New Finance production services/adapters pass isolated strict type checks.
  The repository-wide TypeScript check exceeded Node's default heap in existing
  SDK/Zod declaration expansion; do not claim it passed. Finance's adapter uses
  an explicit SDK compatibility boundary without changing existing dependencies,
  schemas, runtime validation or other MCP registrations.
- Integrated backend production build and isolated strict Finance checks pass.
- The frontend now has an authenticated `/finance` app, independent books,
  overview/forecast, accounts, register/search/splits/bulk categorization,
  recurring and one-off bills/payment matching, CSV mapping/review/commit,
  category/budget/estimate/rule management, reports, exports and history with
  reconciliation/reopening. Markdown notes reuse appearance, not Reader state.
- Actual backend responses pass the frontend Zod contracts, including stored
  occurrences with payment links. The full backend suite passes 84 tests;
  frontend suite passes 113; Finance-core passes 26; Markdown AST passes 63:
  286 tests at the final successful full checks. `md-view` has no test script.
- Frontend production builds pass through the accessible field labels and
  budget/estimate action labels. Existing large diagram bundle warnings remain.
- Approved browser checks exercised book/account creation, exact expenses and
  splits, ranged monthly plans, statement duplicate matching, rejected
  unverified commit followed by accepted atomic commit, reconciliation, budget
  creation and actual-payment matching. A matched source row did not double
  count the expense. Light/dark/forest themes and the 390px breakpoint were
  checked; the page had no horizontal document overflow or console warnings.
- Browser testing found native date input could show a new value without
  updating the controlled draft. Finance date/month inputs now synchronize
  input events. Saved October 31 / November 30 / December 31 occurrences and
  the forecast shortfall date were rechecked in the browser.
- Import matching also exposed that an uncleared manual movement could become
  permanently uncleared after gaining source provenance. Clearing is now
  auditable metadata; source money/date/account/status and reconciliation
  protections remain intact. The database regression covers both allowed
  clearing and rejected money changes.
- The isolated browser server ended successfully and confirmed its entire
  temporary Google identity/Finance fixture was rolled back. No real financial
  data was edited. A sample-only screenshot is stored outside the repository.

Final verification (2026-10-04):

- The temporary approval-review usage limit cleared after its reported reset.
  Verification resumed through the same approval path, without a bypass.
- Both production builds pass on the final source. The full frontend suite
  passes 113 tests, including derived paid/partial/ranged-bill labels; the full
  backend suite passes 84 with real database tests enabled. Finance-core passes
  26 and Markdown AST passes 63. Strict Finance adapter checks pass, and Prisma
  reports the configured `reader_google` schema up to date.
- Browser verification shows panel scroll reset from 1085.6px to 0px on tab
  change. A recorded 300.00 expense linked to a fixed bill displays Paid, one
  payment link and zero remaining, without duplicating spending. Opening cash
  1000.00 remains 700.00 in balances and every forecast month after matching.
- A fresh production preview has no console warnings/errors. The old reused
  preview briefly retained a stale pre-build dynamic-import URL; navigating to
  the new fixture and checking a clean tab verified the current build instead.
- Final sample screenshots are stored outside the repository. Both temporary
  tabs were closed and the isolated server stopped. A read-only database check
  then returned zero temporary browser users and zero sample books, confirming
  rollback; no listener remained on port 4318. No real financial data was edited.
- Read-only remote verification confirms `348f11d` on `origin/stable`.
  Finance changes remain local/uncommitted; the prerequisite push is complete.

## Requirement-to-evidence audit

| Approved requirement | Implementation and verification |
| --- | --- |
| Independent books, free-form accounts, categories and exact ledger | 17 book-scoped Prisma models; catalog/ledger services; real ledger DB tests cover ownership, cross-book references, debt, transfers, refunds, versions and stable movement IDs; core money tests and frontend wire-contract tests |
| Complete separate Finance UI, editing, filtering and history | AuthGuard route, identity-keyed page, typed repository and page-scoped store; catalog/register/manage/history panels; frontend state/repository tests and browser creation/edit workflow; semantic fields and scoped theme tokens |
| Recurring bills, ranged next-month forecasting and actual payments | Plan/forecast services and panels; calendar tests cover month-end anchors; real plan DB test covers saved snapshots, partial matches, overdue obligations and budgets excluded; browser ranged monthly dates and fixed Paid state |
| AI and CSV statement ingestion without duplicate money | Shared import services, explicit mapping and original sources; import DB tests cover retries, overlap, manual/paired transfer matches, deleted provenance and clearing; real service transaction test proves later-row failure rolls back earlier writes; browser review/rejected unverified commit/accepted commit |
| Reports, categorization, suggestions, budgets, exports and reconciliation | Report/reconciliation services and panels; report DB test verifies actuals, refunds/corrections/transfers, rollups, merchant/method, comparison, zero-month suggestions, pinned rules and safe exports; ledger DB test verifies mismatch rejection and lock/reopening |
| One existing MCP and unchanged access | Additive registration in existing server, 41 Finance tools using the same service layer; actual SDK/HTTP integration test verifies persistence parity and ownership denial; existing Reader/Tasks registrations and MCP access code unchanged |
| Safe integration and deployability | Full backend/frontend regression suites and builds, strict Finance checks, applied additive migrations, browser theme/mobile workflow and final UI spot checks, startup/usage documentation; old database untouched and test fixtures removed/rolled back |

Implementation notes:

- Money responses are minor-unit strings; request amounts are decimal strings.
- Composite logical records (budgets/estimates/occurrences) use version guards.
  Rules use a stable client-assigned UUID plus version 0 for exact create retries.
- Multi-query financial reports, forecasts and exports use consistent
  repeatable-read snapshots. Same-book writes remain serialized by the book lock.
- CSV mapping never guesses dates or decimal precision. Grouping removal is
  explicit and validates Western/Indian grouping; original columns are retained.
- Approved rule proposals are pinned at staging, before review, not reevaluated
  silently at commit. Conflicting matching rules leave the row unclassified.
- Complete JSON exports retain deleted entries, sources and audit history;
  filtered CSV is spreadsheet-formula-safe and retains exact decimal amounts.

All approved delivery checklist items have implementation and concrete
verification evidence. Deferred features above are not silently represented as
implemented; in particular, unchanged MCP access is not safe for publicly
exposing private finances. Finance implementation is complete locally.
