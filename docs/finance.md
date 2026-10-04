# Personal Finance

Finance is a separate private app at `/finance`. Use the Finance button in the
shared app bar after Google sign-in. Reader and Tasks are unchanged; a finance
book is not a Reader page and has no relationship to the Reader home page.

## Start

From the repository root run `npm run prod`. It installs dependencies, generates
Prisma, applies pending additive migrations, builds the frontend/backend and
starts the unified server. Finance uses the already configured `DATABASE_URL`
(locally `reader_google`); do not create a replacement database for each feature.
No reset or seed is part of startup. Back up the database before deployment.

If setup is already complete, `npm start` starts the built application.
Existing Google/session/origin environment configuration is reused. There are
no bank credentials, new service API keys or separate Finance MCP credentials.

## First book

1. Create a book with its currency and timezone. Currency precision is fixed at
   creation. Separate books can use different currencies; no exchange is guessed.
2. Add freely named accounts: bank, wallet, cash at home, money owed, anything.
   Opening balances are auditable corrections, not income. Debt balances are
   negative. Only accounts marked as available cash enter the cash forecast.
3. Record income, expenses, transfers and refunds. Transfers move money between
   accounts and never count as earnings/spending. Optional category splits allow
   several categories; any remainder stays explicitly uncategorized.
4. Advanced signed movements support principal/interest separation, for example
   bank `-5500`, debt `+5000`, interest expense category `500`.
5. Pending transactions are separate from posted actuals. Cleared means checked
   against a statement or confirmed cash; it does not mean reconciled/locked.

Transaction details show stable transaction/movement IDs, original statement
descriptions and Markdown notes. One edit icon opens the whole transaction draft.
Edits use current versions; a conflict preserves the draft and requires review.
Deleted transactions can be restored, and history/provenance are retained.
Accounts, categories and books archive instead of discarding history.

## Upcoming expenses and cash

Plans support once/daily/weekly/monthly/yearly with intervals and optional end
dates. A monthly rule starting on the 31st clamps for February and returns to the
31st in March. Every 28 days is different from monthly. Month-end is explicit.

Enter low/expected/high amounts, e.g. electricity `200 / 300 / 400`, or the same
value three times for a fixed bill. A plan is not a posted expense. Confirm/change
one bill without changing its recurring rule, skip a bill, or link an actual
posted account movement. Partial payments are supported. Unlinking preserves the
transaction. Saved occurrences/payment history survive later rule edits.

Manage separates monthly budget targets from reviewed discretionary estimates.
Targets never enter forecasts. Estimates should exclude bills already covered by
plans. History suggestions include six complete months and zero-spend months;
approve assumptions only after considering missing statements.

Overview shows actuals for the chosen date range and daily/month-end cash
forecast scenarios from today in the book timezone. Known future/pending money,
unpaid/overdue obligations and estimates are shown with coverage warnings.
Unassigned plans/estimates affect total cash but are not silently assigned to a
bank account. Low/high are assumptions, not probability guarantees.

## Statements and reconciliation

1. Stage CSV with explicit columns, separators and date format. Choose signed
   amount **or** separate credit/debit columns. Thousands-grouping removal is
   explicit and validated. Maximum batch: 2 MB / 1,000 transactions.
2. Supply source period, opening/closing balances, credit/debit totals and row
   count when available. Agreement does not prove extraction is complete.
3. Review rows. Reliable bank transaction IDs support exact matches. Same
   date/amount is only a possible duplicate: match, skip, or explicitly approve
   a legitimate new repeated payment. Original extracted fields remain intact.
4. Mark transfers with a counterpart account. Importing the other account later
   should match its existing opposite movement, not create a second transfer.
5. Commit the reviewed batch. All rows commit together or roll back together;
   exact retries cannot post the batch twice. Unverified completeness requires
   explicit acceptance. Cancelled drafts retain sources and may be restaged.
6. Under History, reconcile the cleared posted closing balance against the real
   statement. A mismatch never invents a balancing expense. Review missing,
   duplicate and uncleared movements first. A matched manual payment remains
   explicitly clearable without changing its imported amount/date/account.

Reconciliation locks the account period. Reopening requires a reason, reopens
dependent later statements, and records history. Imported money cannot be
rewritten: use an auditable correction. Deleted imported transactions are not
silently recreated by another overlapping statement.

CSV export covers the selected register dates with exact decimal strings and
spreadsheet-safe text. Complete JSON includes archived/deleted records, original
sources and history. Store exported financial files privately.

## One existing MCP

Use the same connection shown in Settings → MCP Server. Finance adds 41
`finance_*` tools to that server; Reader/Tasks tools and access remain unchanged.
Tools use the same book-scoped services as the UI. Money inputs are decimal
strings; response money is signed integer minor-unit strings. Creates need a
stable UUID `requestKey`; edits require the current `expectedVersion`.

Typical statement workflow:

1. `finance_list_books`, `finance_get_catalog`, `finance_list_transactions`.
2. Extract the bank PDF in your AI client (no server-side PDF/OCR adapter yet).
3. `finance_stage_import` or `finance_stage_csv_import` with original descriptions,
   source fields and statement completeness metadata.
4. `finance_get_import`, `finance_resolve_import`, then `finance_commit_import`.
5. `finance_report`, `finance_forecast`, `finance_get_suggestions` for answers
   grounded in recorded data, with missing-coverage warnings.

AI does not require an in-app model configuration for this workflow: your MCP
client performs extraction/reasoning, while the server validates persistence.
No automatic bank connection or payment execution is provided.

**Deployment caveat:** the existing MCP uses an internal user ID as its access
identifier and existing public Reader responses expose that ID. This access
model is intentionally unchanged at your request. Do not treat its URL as a
secure secret or publicly expose personal Finance until that deferred access
redesign is addressed. HTTP Finance remains session- and owner-scoped; public
Reader pages do not grant HTTP Finance access.

## Verification and isolated browser QA

Run the normal frontend/backend/shared package test scripts. Real backend DB
tests require `RUN_DATABASE_TESTS=1` against an appropriate test database.
Finance tests use rolled-back fixtures; the atomic-commit test removes only its
own exact UUID-scoped temporary identity.

For manual browser QA, build the frontend, then from `reader-backend`:

```powershell
$env:RUN_FINANCE_BROWSER_QA='1'
node scripts/finance-browser-qa.js
```

The separate opt-in runner binds only `127.0.0.1:4318`, uses a temporary Google
identity/session, and serves the real Finance router/production frontend. It is
not mounted or bundled in the normal server and refuses production mode. Open
`http://127.0.0.1:4318/__qa/start`. The complete browser fixture rolls back when
the runner ends (25-minute timeout); no real user's finances are edited.

Implementation contracts, invariants and delivery evidence:
[Finance implementation](finance-implementation.md).
