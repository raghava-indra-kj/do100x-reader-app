# Calendar and Tasks work record

Calendar operations are also exposed through 17 MCP tools. See [MCP feature coverage](mcp-features.md) for scheduling, recurrence, task/habit integration, imports/exports and verification.

The requested outcome is a complete calendar integrated with Tasks and Habits, plus an evidence-led audit and repair of existing task workflows. Work is in progress; this document is not a release-completion claim.

## Product requirements and verification gates

- Day, week, month, year and agenda navigation; today/date controls; compact responsive layouts and existing themes; keyboard-accessible controls and custom tooltips.
- Events with title, notes, location, color, all-day or timed duration, timezone, reminders, and recurrence. Day/week/month/year repeat rules, end/count limits, individual occurrence changes and series changes must preserve history.
- Tasks shown on their due dates, an unscheduled task tray, direct task creation from a time slot, drag to schedule/move/resize, an equivalent explicit editor for keyboard/touch use, completion/reopening and direct task details. Task dates and calendar schedules must stay consistent.
- Habit visibility and optional time reservations, tied to the original habit and date without duplicating or overwriting check-ins. Focus records can be shown as historical context.
- Filters by list, type and completion, understandable overlap layout, current-time indicator, working hours and planned/busy time. Save preferences per account.
- Import/export and calendar subscription behavior must be investigated against TickTick and implemented with clear ownership and timezone rules. No accidental external writes or calendar invitations.
- Fix verified Tasks bugs across list/navigation, dates, hierarchy, creation/editing, completion, ordering, timers, time reports, mobile layout, failures and multi-tab changes. Audit the MCP paths as well as HTTP/UI paths.
- Persistence: scoped authorization, bounded validation, transactions, conflict handling, additive migrations, upgrade-preservation tests on disposable MySQL, and no production migration or deployment without the separately required authorization.
- End-to-end browser verification with real isolated persistence, automated regression tests, desktop/phone/theme screenshots, clean production builds, and a final requirement-by-requirement audit before completion. Commit and push the finished release.

## Reference research

Primary references inspected: [TickTick calendar](https://help.ticktick.com/articles/7055782166172532736), [view options](https://help.ticktick.com/articles/7055782085826445312), [task details](https://help.ticktick.com/articles/7055782408586526720), and [calendar quickstart](https://blog.ticktick.com/2020/11/30/ticktick-calendar-quickstart/). Its documentation covers multiple views, time blocking, repeat cycles, list filters, habits/focus overlays, subscriptions and batch postponement. These are product references, not instructions to access the user's third-party accounts.

## Audit evidence and implementation progress

The deployed Tasks interface was inspected read-only in Chrome. It wastes an empty detail column, compresses task names when a detail is open, exposes unnamed icon buttons, and uses several custom menus without the shared accessibility primitives. A baseline screenshot is saved in the ignored `releases/tasks-before-calendar.png`.

Code audit found: server-local smart-date filters versus calendar dates stored at UTC midnight; UTC-based quick-add dates; invalid task/list input accepted or silently ignored; Completed hiding nested tasks; timer/session writes without transactions; timer history start reset by resume; deleting a task permanently deleting logged history; stale detail reads; initialization side effects during React render; duplicate quick-add submission; missing reorder rollback; timer disappearing on a transient network error; misleading empty state after load failures; and time-report counts/date boundaries inconsistent with filters.

### Implemented Calendar behavior

- Day/week time grids, month/year overview and agenda, with today/date navigation, current-time indicator, working hours, overlap columns, planned/busy totals, account preferences and list/type/completion filters. Calendar is linked from Tasks, Habits and the app switcher.
- Private timed/all-day events, notes, location, color, timezone and reminders. Daily/weekly/monthly/yearly recurrence supports interval, weekday and end/count rules. Exceptions support moving, resizing, cancelling, completing and reopening an occurrence. Series and “this and following” edits retain completed history. One-time event editing exposes its title and metadata directly.
- Task deadlines are shown without inventing a duration. Scheduling an undated task creates a time block; explicit dialogs provide an alternative to dragging/resizing. Task names/dates and linked schedules synchronize transactionally. Completing a repeated task advances the next instance; reopening restores the most recent completed instance. Clearing its date removes the schedule without deleting the task.
- A new Calendar item can be an event or a new task with reserved time. Task list and priority are chosen in the same form. Creation uses one transaction and idempotency receipt for the task and its reservation; concurrent retries create one pair, and invalid destinations leave neither record behind.
- Habits appear on their own scheduled dates. Optional time reservations use the habit timezone; check-ins use the existing habit progress editor, keeping quantities, notes and moods independent from calendar movement. Focus history is read-only context.
- iCalendar file imports and HTTPS/webcal subscriptions remain separate, read-only calendars; users can copy an imported occurrence into an editable event. Original imports can be exported unchanged. Native calendar export is a portable snapshot of occurrences in the selected date range, without invitations or external writes.
- Subscriptions refresh while Calendar is open, preserving the last successful copy on failure. Remote requests validate protocols, ports, DNS results and every redirect; DNS pinning prevents a second resolution from reaching a private address. Private feed URLs never appear in response metadata/errors.
- Browser reminders are opt-in and operate while Calendar is open. They do not promise delivery after the browser or page closes. Subscriptions also do not have a background server scheduler in this release.

### Implemented Tasks repairs

- HTTP and MCP mutations now share strict input/ownership checks, hierarchy handling and transactional task/calendar/timer services. Local-day filters include nested completed tasks; stale task versions are rejected.
- Timer start/pause/resume/switch/stop preserve the original run, serialize concurrent actions and deduplicate retries. Deleting a task retains saved focus history and finishes its active timer. Manual time entries preserve exact seconds and timestamps when editing notes, validate ranges and detect stale edits.
- Store request sequencing prevents old list/detail/report responses from replacing newer views. Repeated submissions are guarded; failed timer refreshes retain the visible timer; acknowledged task changes remain visible even if a subsequent refresh fails. Same-task refreshes preserve the text editor and its drafts.
- Task details use one readable pane for notes, date/time, priority, list, subtasks and all time entries. On small screens the detail replaces the underlying task list, including its keyboard focus targets. Dialogs use the shared focus/Escape behavior; action controls have accessible names and custom tooltips.
- Reports use caller-local dates and consistent list/session filters. Durations retain seconds rather than rounding short work to zero hours. Deleted tasks keep their original title/time and are labelled as retained history rather than offering a broken link.

### Persistence and bounded processing

`20261016000000_calendar` and `20261017000000_calendar_sources` are additive migrations prepared locally. No production migration or deployment has been run. Repository startup wrappers apply migrations automatically and must not be used for production review.

Calendar writes serialize by account and use optimistic versions. Occurrence and linked-task changes also advance the event version so a stale full-event edit cannot overwrite newer scheduling work. All Calendar HTTP responses are private and non-cacheable.

Import parsing runs in a bounded worker (64 MB, six-second deadline, at most two workers). Each source is at most 1 MiB and 2,000 definitions; expansion and combined-range results have explicit count/size limits. Accounts have at most ten imported/subscribed sources and 2,000 active native series. Requests reject oversized ranges rather than returning a silently incomplete calendar. These limits are product constraints to revisit using actual usage evidence.

### Verification checkpoint — 15 October 2026, 02:52 IST

- Full frontend: **311 tests passed in 43 files** (`releases/calendar-full-frontend-tests.log`). The backend unit checkpoint is **160 passed** (`releases/calendar-full-backend-tests.log`); database cases are intentionally skipped in that command and run separately below. Shared suites passed: Calendar **17** (`releases/calendar-core-tests.log`), Habits **13**, Finance **26**, Markdown AST **63** (`releases/calendar-shared-tests.log`).
- Guarded MySQL run: **36 Calendar/timer tests plus six auth/Finance/quiz contracts passed** (`releases/calendar-database-tests.log`). The helper installed the previous schema, seeded representative records, upgraded, asserted unchanged account/Reader/Finance/Tasks/focus/Habits/check-in records before and after testing, then dropped only its newly generated database.
- Frontend production build, backend bundle, and **full strict backend TypeScript check all pass**. The old TypeScript heap failure was traced to generic SDK/Zod inference; typed MCP registration adapters retain runtime validation and have real transport tests. The backend config now matches its existing ESM-aware bundler/test workflow. Database tests validate response shapes rather than treating unknown JSON as typed data. Logs: `releases/calendar-build.log`, `releases/calendar-build-frontend.log`, `releases/calendar-backend-typecheck.log`.
- Browser checks with real isolated persistence verified task scheduling, due-time synchronization, completion/reopening, notes, subtasks, exact-second time entries, keyboard ordering, reports, drag/move/resize, habit quantity edits, and recurrence splitting. A three-instance repeat split leaves one original and two updated events. Saving five minutes from an open report updates both report and detail from 25 to 30 minutes immediately (`releases/tasks-report-refresh.png`).
- Phone week columns now remain readable through horizontal scrolling, with pinned dates/all-day rows and time labels. Desktop Forest dark and phone views were inspected. A 23:58–00:03 event stays inside both day grids; its displayed hit target does not inflate actual planned minutes (`releases/calendar-midnight-boundary.png`). Other evidence: `releases/calendar-week-mobile-dark.png`, `releases/calendar-week-forest-desktop.png`, `releases/calendar-year-mobile-dark.png`, `releases/tasks-detail-mobile.png`, and `releases/tasks-report-mobile.png`.
- Runtime dependency audit: **zero known findings** (`releases/calendar-runtime-audit.json`). Mermaid is 11.17.2, AI SDK 6.0.306, Vitest 4.1.11, and KaTeX 0.18.2. KaTeX is deliberately overridden across the shared Markdown/diagram pipeline to include its [trust-inheritance fix](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7); real sanitized inline/display math and unsafe-link regression checks pass. npm 11's updater failed on optional Vitest peers; a temporary npm 12 runner completed the update without changing the globally installed npm. npm 11 `ls` misreports overridden KaTeX transitive ranges, while npm 12 recognizes the override and the packaged npm 11 locked runtime installation passes.
- Full dependency audit retains **three high findings in the development-only nodemon → chokidar → braces chain**, with no patched braces version currently offered. The development watcher takes fixed, repository-owned paths rather than untrusted patterns; production installs omit it. No forced downgrade was applied. The large existing diagram-browser chunk warning remains.
- A private ZIP was built and extracted for a fresh install. Its production profile was replaced with a random disposable-local-database profile **before any startup code ran**. The extracted package passed production-mode startup, bundled frontend asset loading, session/origin enforcement, linked task scheduling/completion, the separately packaged iCalendar worker, and original file export (`releases/calendar-package-build.log`, `releases/calendar-package-check.log`). Existing seeded records remained unchanged; the verification process exited and its database was removed. This is local Windows artifact verification, not deployment or a Linux hosting certification.
- Actual file-picker import remains unverified: the installed automation extension does not permit local file uploads. The earlier browser download event timed out. Parser, worker, HTTP, database and packaged file export checks pass; they do not prove the browser download UI. Browser security/settings were not changed to bypass these limits.

### Additional failure and history repairs

Reports refresh on focus, after time-entry/timer/task mutations, and at a local-day boundary. A list removed in another tab returns its task view to Inbox and resets stale quick-add/report filters. Failed list refreshes retain the previous destination. Navigation invalidates outstanding detail reads and clears hierarchy trails; report request sequencing rejects old responses after a filter changes.

Calendar list filtering now happens before task pagination and range limits, including Inbox and retained focus from deleted tasks. Regression data includes 101 tasks before a matching task in another list and over 5,000 unrelated focus records. An aborted/old response cannot replace a newly selected list. Feed refresh continues after an individual feed fails; the last saved data remains available. Task deep-link failures can be retried after network recovery; this was verified by blocking only the local schedule request and restoring it.

Direct Calendar creation was checked in the browser: “Prepare the weekly review” appeared in Tasks with Work, P2, notes, and the selected 14:00 due time. The extracted production artifact also verifies atomic task creation and idempotent retries. Task deep links now select the matching list or Completed view and clear an unrelated search; navigating elsewhere while the detail request is pending prevents a late response from changing the user's view.

Calendar preferences synchronize from successful range refreshes. An open settings draft keeps its own revision, so a newer background response cannot make that old draft overwrite another tab's settings. A two-tab browser test rejected the stale save, preserved the draft, loaded the latest settings explicitly, and then saved and refreshed successfully (`releases/calendar-settings-conflict.png`). Initial preference retries no longer trigger an extra initialization that resets the selected view.

Converting a moved one-time event into a repeat no longer leaves a ghost occurrence at its old time. Changing a repeat rule removes obsolete pending exceptions while retaining completed history. Following-series edits preserve the remaining count and apply the new start time even when the selected occurrence was previously moved; collisions roll back atomically. Editing a completed task's due time moves its completed block, and reopening/rescheduling together updates that same block.

The shared recurrence-membership check now distinguishes retained completed history from the current repeat rule. A completed occurrence outside a shortened rule remains editable, but does not offer an invalid “This and following” action. Browser verification completed an October 15 occurrence, shortened the series to one occurrence starting October 12, and confirmed the October 15 history remained visible with only the valid edit scopes.

### Reproducing isolated artifact verification

After building a private ZIP, extract it under `releases/calendar-release-check-<UUID>` and run:

```powershell
node scripts/habits-test-db.cjs --calendar --release-dir <absolute-extracted-directory>
```

The command accepts only that guarded path and creates its own randomly named local database. It overwrites the extracted profile with disposable settings, exercises the normal hosting preparation and compiled server, checks old records, and removes its database afterward. It never uses the ZIP's production database settings. The original ZIP remains private because it contains production credentials.

### Release audit

| Requirement | Evidence inspected | Current conclusion |
| --- | --- | --- |
| Calendar navigation, layouts, colors and time display | `views.tsx`, `model.test.ts`, desktop/month/year/phone screenshots, real preview navigation | Implemented and exercised; existing large diagram bundle is unrelated to Calendar. |
| Events, recurrence and history | Shared core tests, 36 Calendar/timer database tests, browser split and shortened-rule history checks | Implemented; invalid splits do not appear and completed history is preserved. |
| Tasks ↔ Calendar | Transaction services, pagination/range regressions, browser schedule/move/resize and direct-create checks, packaged HTTP smoke | Implemented. The rebuilt task deep link opens Work beside its selected task (`releases/calendar-created-task.png`). |
| Habits and focus | Original check-in editor, habit-date tests, database preservation, browser quantity update, retained/deleted-task time tests | Implemented without duplicating check-ins or deleting focus history. |
| Filters and account preferences | Query filters before pagination/limits, source refresh tests, two-tab settings conflict/recovery | Implemented and exercised with isolated persistence. |
| Tasks audit | Store sequencing tests, timer transactions, HTTP/MCP validation and registration transport tests, browser notes/subtasks/reports/order/mobile checks | Verified repairs cover the identified failures. Further findings remain actionable; this is not a claim that unknown bugs are impossible. |
| Subscriptions and file exchange | SSRF/DNS pinning/redirect unit tests; iCalendar timezone, exception and boundary tests; packaged worker/export smoke | Service path verified. Actual browser file-picker import and download completion remain unverified because of the automation restrictions recorded above. |
| Reminders | Due-time/receipt/retry tests, explicit opt-in UI, saved reminder fields | Open-page behavior implemented; OS notification delivery was not exercised because notification permission was not granted. |
| Existing data and production safety | Disposable upgrades and before/after snapshots, additive SQL inspection, production profile replacement in package smoke | Local upgrades preserve representative records. No production migration/deployment has run. |
| Release artifact | Fresh extracted production-mode install/startup and API/assets/import checks | Final code package passed after the task deep-link fix (`releases/calendar-final-package-check.log`). Destination Linux hosting remains unverified. |

### Outstanding release gates

The implementation is committed and pushed as `373ce22` on `codex/calendar-tasks`. It remains a development checkpoint, not a production release. Finish browser file import/download verification and the notification delivery check; resolve any findings and rebuild if application code changes. A separate full-workspace clean-install attempt was rejected by automatic approval review before execution, with no reason beyond “blocked by policy”; it was not retried through another mechanism. The isolated production runtime installation did pass. Production migration/deployment still requires the separate authorization recorded above.

### Final code package — 15 October 2026, 02:57 IST

`releases/do100x-20261014T212600742Z-77651f09.zip` contains the application code from `373ce22`, including the task deep-link context fix. Its SHA-256 is `fadbc70be86b0e016243be88dc558cf395659596449ef27bd57d5639b91dfe40`. The ZIP is private because it contains production configuration. Do not attach it to a public release.

The package built successfully (`releases/calendar-final-package-build.log`) and passed the extracted production-mode installation and startup checks (`releases/calendar-final-package-check.log`). This run verified frontend assets, authentication and origin checks, linked-task completion, atomic task creation with retry, the import worker and export response. Existing seeded records stayed unchanged, and the disposable verification database was removed. No production connection or migration was used.

### Browser checks requiring a person

The local preview is available at `http://127.0.0.1:5184/calendar` while `node scripts/habits-test-db.cjs --calendar --preview --seed` is running. It uses a separate disposable database; changes there do not affect the user's actual records. Its current browser tab is left on **Calendars & files** (`releases/calendar-release-handoff.png`).

1. Import `D:\PersonalProjects\reader\releases\calendar-review.ics` through the file chooser. Confirm **Reading club** appears on October 15, 22, 29 and November 5, 2026, from 15:30 to 16:30 in Asia/Kolkata.
2. Export that imported calendar and confirm the browser saves a readable `.ics` file. Also use **Download .ics** to export native events for a selected range and confirm the saved file contains those events.
3. Close the file dialog, enable reminders through the visible button and personally handle the browser permission prompt. Create a disposable event a few minutes ahead with **At start time**, keep Calendar open, and confirm a desktop notification arrives once.

The actual file chooser remains unavailable to automation under the installed extension permissions. The browser download UI and OS notification delivery cannot be inferred from successful service/unit tests. Browser security settings have not been modified to bypass these limits. Record pass/fail results for these steps before claiming release completion.
