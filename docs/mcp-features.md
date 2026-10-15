# Habits, Calendar and temporary captures over MCP

The existing authenticated Reader MCP server now registers 34 additional tools: 12 for Habits, 17 for Calendar and 5 for temporary captures. Reconnect or refresh the client's tool list after deploying the updated backend. These adapters introduce no new endpoint, token type, dependency or database migration.

Every tool is bound to the authenticated account and does not accept a user ID. Strict schemas reuse application validation; writes use the existing services, account transactions, ownership checks, version preconditions and retry rules. Results are JSON in MCP text content. Domain failures return `isError: true` with a JSON `status` and `message`; invalid inputs may instead use the SDK's validation error text. ORM diagnostics and secrets are not returned.

## Habits

| Tool | Coverage |
| --- | --- |
| `reader_list_habits` | Manual order, active/archived habits, plans, pauses and check-ins for an inclusive date range (up to 366 days). |
| `reader_get_habit` | Full owned habit and history, including metadata, versions, reminders and historical plans. |
| `reader_get_habit_progress` | Daily status and weekly progress for a range; streaks, completion rate and quantity totals through the earlier of `range.to` and today in the habit's timezone. Uses the UI's shared rules. |
| `reader_create_habit` | Check-off/count goals; daily, weekdays, flexible weekly targets and intervals; icons, colors, sections, timezones and reminders. UUID `requestKey` makes exact retries safe. |
| `reader_update_habit` | Metadata, goals, schedule and reminders with `expectedVersion`. Timezone/original start date stay fixed; schedule revisions preserve history under the existing next-day/next-week rules. |
| `reader_record_habit` | Record/backfill/edit counts, notes and mood; skip or clear a day. Requires `habitVersion` and the log's `expectedVersion` (zero for a new log). No future check-ins. |
| `reader_complete_habits` | Atomic multi-habit completion with per-habit/log versions, preserving notes, mood and above-target amounts. |
| `reader_archive_habit`, `reader_restore_habit` | Pause/restore future tracking without erasing history, using `expectedVersion`. |
| `reader_reorder_habits` | Complete active-habit ID ordering, excluding archived habits. Reload versions afterward. |
| `reader_export_habits` | Full JSON export, including archived habits, plans, pauses and logs. |
| `reader_delete_habit` | Permanent deletion of the habit and check-ins with a version check. Archive preserves history. |

For a check-in, first get the habit and find the date's log version. Use `RECORDED` for an amount, `SKIPPED` with zero value to excuse the day, or `NONE` with zero value, empty note and null mood to clear it. Clearing retains a versioned record so stale retries cannot restore old data. Date strings are `YYYY-MM-DD` in the habit's own timezone.

## Calendar

| Tool | Coverage |
| --- | --- |
| `reader_get_calendar` | Range data for day/week/month/year/agenda use: native series, expanded occurrences, due tasks, lists, habits, focus history, external events and preferences. Optional task-list filter (`inbox` or UUID). |
| `reader_get_calendar_event` | Full owned event/series, versions and occurrence overrides. |
| `reader_create_calendar_event` | Timed/all-day events, timezones, recurrence, reminders and links to a task or habit. `newTask` atomically creates a task and schedule. Exact UUID `requestKey` retries are deduplicated. |
| `reader_update_calendar_event` | Edit/move/resize the whole series or split this-and-following occurrences while preserving history. |
| `reader_save_calendar_occurrence` | Move/resize, complete/reopen or cancel/restore one original occurrence. Task completion and due dates stay synchronized. |
| `reader_delete_calendar_event` | Remove the whole event/series without deleting the linked task or habit. |
| `reader_list_unscheduled_tasks` | Search, list filtering and cursor pagination for tasks without a due date or schedule. |
| `reader_get_task_schedules` | Read a task and its linked series/overrides before editing. |
| `reader_get_calendar_preferences`, `reader_save_calendar_preferences` | Timezone, week start, default view, working hours/days, duration, coloring and visibility. Saves require the returned version (zero before first save). |
| `reader_list_calendar_sources` | Imports/subscriptions, visibility, versions and refresh health; subscription URLs are not exposed. |
| `reader_add_calendar_source` | Import raw ICS `content` or subscribe by `url` (exactly one). Same ten-source cap, account deduplication, bounded parser and SSRF-protected fetch as HTTP. |
| `reader_update_calendar_source` | Name, color, timezone and enabled state, with `expectedVersion`. |
| `reader_refresh_calendar_source` | Refresh subscriptions with the five-minute cooldown, retaining the previous copy on failure. File imports return existing metadata. |
| `reader_remove_calendar_source` | Remove the local source with a version check; never changes the remote calendar. |
| `reader_export_calendar` | Native scheduled occurrences in a range as ICS text, matching the app export; excludes imported sources. |
| `reader_export_calendar_source` | Original imported/subscribed ICS text, preserving source fields and recurrence. |

Calendar ranges use inclusive `from`, exclusive `to`, a maximum of 370 days and an explicit IANA `timeZone`. Event `start`/`end` are local `YYYY-MM-DDTHH:mm`; an all-day end is exclusive. Range responses include source errors rather than treating failed sources as empty.

Use the event's current version for series edits/deletes. For an occurrence, use its original `date`, current `eventVersion` and exception `expectedVersion` (zero if absent). Null occurrence times retain an existing override, otherwise inherit the series. To reset a moved instance, explicitly supply its intended times. Following-series edits require `scope: "following"` and original `fromDate`; the returned event is the new series. Refetch after conflicts instead of blindly resending stale versions.

Habit reservations do not duplicate or complete check-ins: use the Habits tools. Existing Task/time-session tools handle task details, priorities, subtasks, timers and focus history. Imported events remain read-only. MCP exports return content to the client; they do not manipulate a browser file chooser or start a desktop download.

## Temporary captures

| Tool | Coverage |
| --- | --- |
| `reader_list_captures` | Active inbox ordered by expiry, source metadata, limits and optional title/source search. Excludes kept, discarded and expired captures. |
| `reader_get_capture` | Markdown, metadata, expiry and `contentVersion` for an active owned capture. |
| `reader_create_capture` | Provided text/Markdown saved privately for seven days; 512 KiB each, 100 active per account. Retry with the same `captureKey` without overwriting content or extending expiry. Source URL credentials/query/fragment are removed. Does not fetch a webpage. |
| `reader_keep_capture` | Retain the same page permanently under an owned saved destination, preserving its ID, comments and quizzes. Retry does not duplicate or move it again. Public destination accessibility applies after Keep. |
| `reader_discard_capture` | Make a temporary capture inaccessible immediately. Kept/permanent pages cannot be discarded through this tool. |

A capture ID is also a Reader page ID. Existing tools provide section reading/editing, full-content editing (`reader_update_page` with current `contentVersion`), comments/explanations, vocabulary and quizzes. These operations retain expiry; Keep removes it. Saved-page collections exclude temporary captures. Expired capture comments are excluded from both MCP tools and the `reader://pages/{pageId}/comments` resource.

There is no expiry override/extension tool. Account-wide cleanup is not exposed: the existing independently configured worker performs bounded physical deletion. MCP neither enables it nor changes its settings. Extension capture and clipboard interaction remain explicit browser actions; an MCP client supplies content itself.

## Boundaries and deployment

- Tools can configure reminder fields. OS delivery still requires the open application and browser permission; MCP does not grant permission or run a background notification service.
- These adapters introduce no schema change. Previously prepared Habits, Calendar and capture schemas must exist on the server. Missing tables/columns produce an MCP failure, never an automatic migration.
- No production migration or deployment was performed. Only randomly named disposable databases on loopback were migrated for verification, then removed. Representative existing Reader, Finance, Tasks, focus and Habit records remained unchanged.
- Do not use `prod`, `setup`, deployment wrappers or `start.sh` merely to release adapters: those paths apply pending migrations. Production schema installation remains a separate authorized operation.

## Verification

```powershell
npm run test --workspace=reader-backend
npm run typecheck --workspace=reader-backend
npm run build:backend
node scripts/habits-test-db.cjs --calendar --mcp
node scripts/habits-test-db.cjs
```

Unit checks cover production-server discovery, schemas, read/write/network annotations, invalid inputs before database access, and safe errors. The guarded MySQL suite connects an SDK client to the complete server through `InMemoryTransport` and successfully invokes every new tool. It covers account isolation, stale versions, deduplication, atomic batches, logs/progress, task/calendar synchronization, recurrence splitting/overrides, imports/exports, source refresh failures, preferences, pagination, captures' Reader integration, expiry, quotas, discard/Keep races, and HTTP/MCP persistence parity. Subscription network responses are fixtures; actual URL validation, bounded ICS parsing and persistence run, with existing feed-fetch tests covering SSRF/DNS/redirect protections.

Results on 15 October 2026: backend suite 187 passed (69 database-dependent checks skipped in that ordinary run); separate Calendar/timer/MCP suite 47 passed; separate Habits integration suite 10 passed. Strict backend type checking and production bundle build passed. These checks do not certify browser notification delivery or a deployed production MCP connection.

The updated private package also passed actual SSE transport checks against its compiled server after a fresh runtime installation. All 34 tools were discovered; habit progress/check-ins, linked task scheduling/completion, ICS source export, and the capture lifecycle were exercised with HTTP parity. This used the artifact's installed SDK and a disposable local database, not production. See the updated package entry in [Calendar verification](calendar.md) and `releases/calendar-mcp-package-check.log`.
