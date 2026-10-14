# Habits

Habits is the fourth app in do100x, available at `/habits` through Home and the app switcher. It uses the same Google sign-in, account, themes and application shell as Reader, Finance and Tasks. Habit data is private to its owner.

## Included workflows

- Twelve starting ideas or a custom habit, with a name, motivation, icon, color and editable section.
- Daily, selected weekdays, every N days, or a flexible number of days per Monday–Sunday week. Start/end dates and a fixed IANA timezone define calendar boundaries.
- Simple check-off goals or quantities with units and a configurable quick-add amount. Decimal amounts support three places. Check-ins can include a note and one of five moods.
- Today, weekly and monthly review; search, section/progress filters, previous dates, and manual ordering in All habits.
- A check-in editor for partial progress, completing the goal, skipping a day, clearing a record, and backfilling eligible past days. Future check-ins are rejected by the server.
- Complete remaining visible habits in one confirmed, atomic operation. Notes and moods are retained; skipped and completed habits are excluded.
- A habit detail panel with current/best streaks, completion rate, calendar, twelve-month heatmap, and a journal of check-ins and reflections.
- Archive and restore while retaining history; explicit permanent deletion; JSON export for one habit or the full account.
- Multiple reminder times and opt-in browser notifications **while Habits is open**. Notification eligibility follows each habit’s timezone and suppresses completed, skipped, paused and satisfied weekly goals. This release does not promise notifications after closing the tab or browser.

The implementation takes inspiration from TickTick’s [habit guide](https://help.ticktick.com/articles/7055781896457814016), [creation workflow](https://help.ticktick.com/articles/7055781878401335296), [check-ins](https://help.ticktick.com/articles/7055781805944733696), and [statistics](https://help.ticktick.com/articles/7055781785312952320). Native OS widgets and a separate mobile application are not part of this web app.

## History and statistics

Name, section, appearance and reminder edits take effect immediately. Schedule and goal edits begin tomorrow, or next Monday when either the old or new frequency is weekly. A habit that has not started yet keeps its original future start. Re-editing a pending plan replaces it rather than rewriting past goals.

The start date and timezone stay fixed after creation to avoid moving recorded days. Quantities with different historical units are reported separately. Daily streaks ignore rest/archived periods and excused days; excused days do not add to a streak. An unfinished current day or week does not break the current streak. Weekly goals count completed days, with the quota capped to the available scheduled days in partial start/end/archive weeks. A frequency change between daily-style and weekly tracking starts a new streak series. Completion rate counts finished periods and achieved goals, so an unfinished current period is not counted prematurely.

Archive pauses days starting tomorrow; restoring resumes today. Logs remain available. A cleared check-in keeps a versioned empty record so an old browser tab cannot resurrect it silently. Conflict responses leave the editor open, with an explicit reload action to review the latest saved version.

## Implementation and data safety

- `packages/habit-core`: pure date, scheduling, progress and statistics functions shared with the frontend and backend.
- `reader-backend/src/habits`: validated, session-protected HTTP routes with existing trusted-origin enforcement, owner-scoped reads, transactions and optimistic versions. Mutations serialize on the account row. Batch completion rolls back in full on a conflict.
- `reader-frontend/src/modules/habits`: responsive UI using existing dialogs, selectors, tooltips and themes.
- `20261015000000_habits/migration.sql`: adds only `habit` and `habit_log`, their indexes and owner constraints. It does not rewrite or delete Reader, Finance or Tasks data.

Creation requests have an idempotency key. An account can hold 250 habits including archived ones. The list API limits each requested date range to one year; individual history and export retrieve the complete owned history. There are no habits added to existing accounts automatically.

## Verification and local preview

Run the shared rules and UI/backend tests with the repository’s Vitest workspaces. For database verification:

```powershell
node scripts/habits-test-db.cjs
```

This requires local MySQL credentials in `reader-backend/.env` with permission to create a disposable database. The helper rejects remote hosts, generates a new `do100x_habits_test_<random>` database, installs the prior migrations, creates representative existing Reader/Finance/Tasks records, applies the Habits migration, and checks those records are unchanged before and after lifecycle tests. It drops only the exact database it created. It never migrates the database named in `.env` or reads `.env.prod`.

For a browser preview using real persistence and disposable sample history:

```powershell
npm run build:frontend
node scripts/habits-test-db.cjs --preview --seed
```

Open `http://127.0.0.1:5183/habits`. Omit `--seed` for the empty-state experience. The isolated preview supplies a test session, binds only to loopback and refuses any non-test database. It is not imported by the production app. Stop it to remove the disposable database. An abrupt OS termination may leave its random test database behind; never remove a configured development or production database as cleanup.

Browser verification covers create, quantity increments, notes/moods, backfill, batch completion, goal editing, stale-tab conflicts, archive/restore, ordering, reload persistence, calendar/review views, and responsive layouts. Automated verification includes signed-session and untrusted-origin checks, owner isolation, concurrent check-ins, clear/version conflicts, atomic batches, schedule transitions, timezone/DST boundaries, reminders and migration preservation.

Release checks: frontend build and backend build passed; frontend suite 244 passed; backend suite 134 passed (23 database-dependent tests skipped in the ordinary run); shared Habits rules 13 passed; the separate disposable-MySQL suite 10 passed. Browser checks used real persistence in the isolated preview, including a 390 px phone viewport without horizontal overflow. OS notification delivery and the browser download handoff were not verified; notification eligibility and authenticated export responses are covered by automated checks.

## Deployment

Production deployment is separate from local implementation. No production migration was run during this work.

1. Use a clean committed release, keep production configuration and session secret stable, and take a verified database backup. Check migration history against the existing production schema; never reset or reinitialize it.
2. Package with `npm run package` as described in [shared hosting](shared-hosting.md). Packaging builds code and generates Prisma without connecting to production. The ZIP includes production credentials and must stay private.
3. After explicit production migration authorization, deploy the backend and frontend together. `bash start.sh` installs dependencies, generates the server Prisma client and applies **all pending migrations**, including the separately prepared Reader capture migration if it is still pending. Do not use this wrapper for a UI-only release or without reviewing the pending SQL.
4. Keep Reader capture cleanup disabled unless separately approved. Habits has no automatic deletion job.
5. Verify sign-in, all four app links, habit create/check-in/refresh, history and export. Confirm existing Reader, Finance and Tasks records remain available. Retain new tables on an application rollback; do not drop habit history to roll back the UI.
