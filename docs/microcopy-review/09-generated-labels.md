# Generated labels and composed display patterns

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

These rows cover text assembled from counts, field names, enums or runtime data. They supplement the literal-copy tables; they are not additional application features. Internal enum values, response fields and stored data must remain unchanged. Descriptive placeholders such as ${count} illustrate the display pattern rather than prescribe an API field name.

| ID | Context | Current display | Proposed display | Decision | Source / constraints |
| --- | --- | --- | --- | --- | --- |
| G001 | Finance import checks | rowCount | Row count | Rewrite | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>Display label only; keep the response key rowCount. |
| G002 | Finance import checks | credits | Credits | Rewrite | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>Display label only. |
| G003 | Finance import checks | debits | Debits | Rewrite | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>Display label only. |
| G004 | Finance import checks | balance | Balance | Rewrite | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>Display label only. |
| G005 | Finance import statuses | Draft | Draft | Keep | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>DRAFT remains the stored status. |
| G006 | Finance import statuses | Committed | Imported | Rewrite | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>COMMITTED remains the stored status. |
| G007 | Finance import statuses | Cancelled | Cancelled | Keep | [F079:40](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:40)<br>CANCELLED remains the stored status. |
| G008 | Finance import decisions | Unresolved | Needs review | Rewrite | [F079:41](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:41)<br>UNRESOLVED remains the stored decision. |
| G009 | Finance import decisions | New | Add | Rewrite | [F079:41](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:41)<br>NEW remains the stored decision. |
| G010 | Finance import decisions | Match | Match | Keep | [F079:41](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:41)<br>MATCH remains the stored decision. |
| G011 | Finance import decisions | Skip | Skip | Keep | [F079:41](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:41)<br>SKIP remains the stored decision. |
| G012 | Finance transaction kinds | Adjustment | Balance correction | Rewrite | [F080:27](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/ledger-panels.tsx:27)<br>ADJUSTMENT remains the stored kind; use the term already used by the entry form. |
| G013 | Finance transaction kinds | Refund | Expense refund | Rewrite | [F080:27](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/ledger-panels.tsx:27)<br>REFUND remains the stored kind. |
| G014 | Finance recurring frequency | Once | Once | Keep | [F082:39](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/plan-panels.tsx:39)<br>Keep DAILY/WEEKLY/MONTHLY/YEARLY as Daily/Weekly/Monthly/Yearly; do not change recurrence calculations. |
| G015 | Finance amount ranges | Low amount | Low estimate | Rewrite | [F082:13](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/plan-panels.tsx:13)<br>Estimated amounts, not guaranteed minimums. |
| G016 | Finance amount ranges | Expected amount | Expected estimate | Rewrite | [F082:13](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/plan-panels.tsx:13)<br>Estimated amounts, not guaranteed payments. |
| G017 | Finance amount ranges | High amount | High estimate | Rewrite | [F082:13](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/plan-panels.tsx:13)<br>Estimated amounts, not guaranteed maximums. |
| G018 | Finance CSV mapping | Date column | Date column | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep the required input mapping unchanged. |
| G019 | Finance CSV mapping | Description column | Description column | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep. |
| G020 | Finance CSV mapping | Amount column | Amount column | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep. |
| G021 | Finance CSV mapping | Credit column | Credit column | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep. |
| G022 | Finance CSV mapping | Debit column | Debit column | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep. |
| G023 | Finance CSV mapping | Externalid column (optional) | Bank transaction ID column (optional) | Rewrite | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep key externalId; this must be a reliably unique ID, not an arbitrary bank reference. |
| G024 | Finance CSV mapping | Merchant column (optional) | Merchant column (optional) | Keep | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep. |
| G025 | Finance CSV mapping | Paymentmethod column (optional) | Payment method column (optional) | Rewrite | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep key paymentMethod. |
| G026 | Finance CSV mapping | Bankreference column (optional) | Bank reference column (optional) | Rewrite | [F079:24](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx:24)<br>Keep key bankReference. |
| G027 | Quiz result | PARTIAL | Partly correct | Rewrite | [F119:95](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:95)<br>Human-readable result, not an enum rename. |
| G028 | Quiz AI feedback | partial | Partly correct | Rewrite | [F119:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:98)<br>Keep the AI attribution. |
| G029 | Quiz AI feedback | needs review | Needs review | Rewrite | [F119:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:98)<br>The question result may separately say Awaiting feedback; do not imply this answer is incorrect. |
| G030 | Quiz AI feedback | correct / incorrect / unanswered | Correct / Incorrect / Unanswered | Rewrite | [F119:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:98)<br>Apply the same readable labels in feedback history. |
| G031 | Task time-entry count | ${count} session(s) | ${count} time entry / ${count} time entries | Rewrite | [F140:285](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:285)<br>Choose singular/plural from the count; keep the count unchanged. |
| G032 | Task counts | ${pendingCount} pending • ${completedCount} completed | ${pendingCount} pending · ${completedCount} completed | Rewrite | [F141:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:51)<br>Display pattern; preserve the actual state counts. Variable names here are descriptive placeholders. |
| G033 | App bar identity | ${accountLabel} (visible name) | — | Remove | [F071:55](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:55)<br>Avatar remains visible. Keep account identity in account settings and in the accessible avatar label; do not remove identity data. |
| G034 | Home app links | Open ${name} | Open ${name} | Keep | [F090:23](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:23)<br>Reader / Finance / Tasks come from the shared catalog. |
| G035 | Quote counters | Quote #${number} | Quote #${number} | Keep | [F074:468](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:468)<br>Keep the existing counter label, quote text and attribution. |
| G036 | Breathing counters | Cycle #${number} | Cycle #${number} | Keep | [F073:238](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:238)<br>Keep the existing counter label, cycle values and timing. |
| G037 | Relative times | ${minutes}m ago / ${hours}h ago / ${days}d ago | ${minutes}m ago / ${hours}h ago / ${days}d ago | Keep | [F093:21](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:21)<br>Keep the existing compact relative-time format; also used by saved words. |
| G038 | Finance audit actions | Raw action values (e.g. STAGE, CREATE, UPDATE) | Readable action labels, e.g. Prepared import, Created, Updated | Rewrite | [F081:43](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/manage-panels.tsx:43)<br>Change presentation only; retain action codes and audit data. Do not invent actions that do not exist. |
| G039 | Schema validation details | Library-generated validation issues and paths | Friendly message for the field; retain technical details when needed | Rewrite | [F022:88](D:/PersonalProjects/reader/reader-backend/src/finance/contract.ts:88)<br>Built-in validation text is generated rather than a fixed product string. Add display wording only; preserve the validator rules. |
| G040 | External runtime messages | Provider, network, dictionary and diagram-engine error details | Keep diagnostic detail behind a concise product-owned error heading | Rewrite | [F012:76](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx:76)<br>Exact strings vary by provider and engine version. Never hide useful error detail or fabricate an error cause. |
| G041 | Time perspective | Target: ${config.lifespanYears} yrs (Born ${config.dob}) | Estimate: ${config.lifespanYears} years · Born ${config.dob} | Rewrite | [F075:181](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:181)<br>A user-entered lifespan assumption, not a medical prediction. |
| G042 | Time perspective | ${stats.lifeProgressPercent.toFixed(1)}% lived | ${stats.lifeProgressPercent.toFixed(1)}% of estimate | Rewrite | [F075:207](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:207)<br>Keep the percentage calculation; clarify its basis. |
| G043 | Time perspective | 0 yrs / ${config.lifespanYears} yrs | 0 years / ${config.lifespanYears} years | Rewrite | [F075:206](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:206)<br>Unit wording only; values stay unchanged. |

## Formatting we should retain

- App names, user-entered names, page titles, account names, category names and question content.
- Objective / Subjective, Single select / Multi-select, Short answer / Long answer. These remain separate choices with the same behavior.
- Finance Income / Expense / Transfer, Posted / Pending, and Daily / Weekly / Monthly / Yearly. Values already shown clearly need no stylistic rename.
- Currency symbols, amounts, locale dates, time units, percentages and keyboard shortcuts. The time-perspective “life” values must remain labelled as estimates, not predictions.
- AI feedback attribution, model identifiers and feedback history dates. Never turn AI feedback into an unqualified authoritative result.
- CSV export column names and JSON keys; these are data formats, not interface copy.
- Raw before/after audit JSON and source statement fields. Add readable surrounding labels; never rewrite recorded values.
- Browser-native required-field messages and the Google-rendered sign-in button. Those are controlled by the browser/Google, not by our fixed text catalog.

## Validation and external errors

The catalog includes the product-owned fallback headings and explicit validation messages. Exact messages created by Google, AI providers, dictionary services, Mermaid/D2 engines, network libraries and generic schema validators vary at runtime; a static inventory cannot enumerate them all. Friendly headings should identify the failed action without inventing a cause. Preserve useful diagnostics and existing field paths. Adding a new error-mapping framework is not approved by this review.
