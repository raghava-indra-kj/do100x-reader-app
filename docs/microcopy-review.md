# Application microcopy review

Approved copy review · Source snapshot: 4 October 2026 · Branch: stable

The tables below preserve the original review snapshot. See [implementation progress](D:/PersonalProjects/reader/docs/microcopy-implementation.md) for applied changes and remaining steps.

## Goal

Make do100x, Reader, Tasks and Finance feel like one clear, consistent product. This document proposes wording only. Review the complete current → proposed tables before authorizing any interface implementation.

## Inventory

**1,667 grouped copy entries** across **144 source files**, covering **1,969 source occurrences**. Of those grouped entries, **963 are proposed rewrites**, **30 proposed removals**, and **674 explicitly retained**. A further **43 display-pattern rows** cover generated labels, count formatting and runtime-copy boundaries. Counts are catalog entries, not screens; the same wording can appear in several places.

| Area | Complete current → proposed table | Entries | Rewrite | Remove | Keep |
| --- | --- | ---: | ---: | ---: | ---: |
| Navigation, home, sign-in and breaks | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | 137 | 75 | 17 | 45 |
| Reader: pages, sections and reading tools | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/02-reader.md) | 323 | 171 | 5 | 147 |
| Quizzes: editing, attempts and feedback | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/03-quizzes.md) | 126 | 52 | 2 | 72 |
| Tasks: lists, priorities, timers and time reports | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/04-tasks.md) | 168 | 109 | 2 | 57 |
| Finance: books, transactions, plans, imports and reports | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/05-finance.md) | 414 | 154 | 3 | 257 |
| Account settings, preferences, AI models and MCP | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | 87 | 60 | 1 | 26 |
| Code blocks, diagrams and content parsing | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/07-diagrams-and-parsing.md) | 35 | 28 | 0 | 7 |
| API messages, validation and default labels | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/08-errors-and-validation.md) | 377 | 314 | 0 | 63 |
| Generated labels and display patterns | [Open table](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) | 43 | — | — | — |

[Source register and coverage boundaries](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Every table has the existing text, replacement, decision and source references. Repeated current/proposed pairs are grouped within an area. “Keep” is deliberate: clear labels such as Save, Cancel, Name, Account and Theme should not change merely to sound different. Some table rows are text fragments inside composed messages; the generated-label table records important full display patterns. Source links are tied to this snapshot.

## Proposed direction

1. **Plain, useful language.** Name the action or result. Cut slogans, filler, repeated reassurance and descriptions of internal architecture.
2. **Consistent terms.** Apps, Home, Settings, Reading settings, Question, Saved words, Time entry, Tracked time and Quiz version. Keep Reader / Tasks / Finance as product names.
3. **Sentence case.** For example, Account & preferences, AI models, Edit model and Add time entry. Keep proper names and acronyms such as Google, D2, Mermaid, API, URL, CSV and MCP.
4. **Helpful empty states.** A short status plus one useful next action. No long explanation of what the whole app does.
5. **Clear outcomes.** “Settings saved,” not congratulatory success messages. On failure, name the action; only suggest a cause when it is known.
6. **Honest warnings.** Preserve deletion effects, public-sharing scope, guest credential behavior, concurrent-edit protections, immutable quiz submissions, import review requirements and forecast uncertainty.
7. **Technical wording in the right place.** Remove Markdown from landing-page marketing. Keep it in source editing, authoring inputs and format references when it tells the user what the control accepts. Keep AI attribution on AI actions and feedback.
8. **No unsupported health or finance promises.** Breathing/rest instructions stay neutral. Forecast ranges are estimates, not guaranteed minimums or maximums.

## Selected changes at a glance

This is a preview, not the full inventory. The area tables above include the rest, including unchanged text.

| Area | Current | Proposed | Decision |
| --- | --- | --- | --- |
| [N134](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Do everything 100 times better. | Your apps | Rewrite |
| [N010](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | One Google account. All your tools. | — | Remove |
| [N011](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Built for your everyday. | — | Remove |
| [N023](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Read, organize and revisit your Markdown. Understand more, one section at a time. | Read and organize your pages. | Rewrite |
| [N027](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Track accounts and expenses. Plan upcoming bills and see what comes next. | Track spending and upcoming bills. | Rewrite |
| [N031](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Organize your priorities, focus on a task and keep track of your time. | Plan tasks and track your time. | Rewrite |
| [N035](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | All applications | Home | Rewrite |
| [N036](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Switch applications | Switch apps | Rewrite |
| [T139](D:/PersonalProjects/reader/docs/microcopy-review/04-tasks.md) | Beta | — | Remove |
| [N043](D:/PersonalProjects/reader/docs/microcopy-review/01-navigation-home-auth.md) | Bored? | Take a break | Rewrite |
| [S017](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | Enable motivations | Show quotes and breaks | Rewrite |
| [S040](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | Asking Doubts | Questions | Rewrite |
| [R175](D:/PersonalProjects/reader/docs/microcopy-review/02-reader.md) | Ask Doubt | Ask a question | Rewrite |
| [R128](D:/PersonalProjects/reader/docs/microcopy-review/02-reader.md) | Vocabulary | Saved words | Rewrite |
| [T049](D:/PersonalProjects/reader/docs/microcopy-review/04-tasks.md) | Record Focus Session | Save tracked time | Rewrite |
| [T119](D:/PersonalProjects/reader/docs/microcopy-review/04-tasks.md) | Time &amp; Focus Analytics | Time tracked | Rewrite |
| [T130](D:/PersonalProjects/reader/docs/microcopy-review/04-tasks.md) | Top Project | Most tracked list | Rewrite |
| [D024](D:/PersonalProjects/reader/docs/microcopy-review/07-diagrams-and-parsing.md) | Mind Map Fullscreen | Mermaid diagram | Rewrite |
| [D011](D:/PersonalProjects/reader/docs/microcopy-review/07-diagrams-and-parsing.md) | D2 Diagram Fullscreen | D2 diagram | Rewrite |
| [F102](D:/PersonalProjects/reader/docs/microcopy-review/05-finance.md) | Commit reviewed import | Confirm import | Rewrite |
| [F288](D:/PersonalProjects/reader/docs/microcopy-review/05-finance.md) | Bill occurrences | Upcoming bills and income | Rewrite |
| [S001](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | Account &amp; Preferences | Account &amp; preferences | Rewrite |
| [S025](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | Default Credentials | Default connection | Rewrite |
| [S083](D:/PersonalProjects/reader/docs/microcopy-review/06-settings.md) | AI configuration saved successfully | Settings saved | Rewrite |

## Important consistency decisions

| Topic | Proposed rule | Must stay unchanged |
| --- | --- | --- |
| Home | One heading, Your apps, and one practical description per app. Remove duplicated taglines, promotional footer and detail chips. | App names and destinations. |
| App switcher | Apps, Switch apps, and Home across the suite. | Routes and active-app behavior. |
| Account | Avatar only in the app bar; accessible label Account settings — ${accountLabel}. Name and email remain in account settings. | Google identity and account data. Avatar layout/direct navigation are separate UI work, not performed here. |
| Theme | Keep Theme and the existing theme choices; use Forest dark consistently. | Theme implementation and saved preferences. |
| Reader settings | Reading settings for the reading dialog; Settings for shared account settings. | Which setting changes reading versus the shared account. |
| Reader questions | Question / Ask a question instead of Doubt / Ask Doubt. | Existing stored requests and AI configuration keys. |
| Task time | Timer for an active timer; time entry for a saved duration; tracked time for totals. | Timing, duration calculations and recorded sessions. |
| Quizzes | Version rather than revision in display text; readable feedback labels such as Partly correct. | Revision IDs, snapshot behavior, answer scoring and attempt history. |
| Finance | Transactions for user-facing records; account entry when a specific account movement must be distinguished. Keep cleared distinct from reconciliation. | Money precision, account movements, reconciliation and posted/pending calculations. |
| Imports | Prepare → review → confirm import, not stage → commit. | Review decisions, atomic import, duplicate detection and retry guarantees. |
| Forecasts | Low / expected / high estimates. | Scenario calculations and the warning that ranges are not guarantees. |
| Data formats | Retain CSV export headers and JSON keys. | External/API data contracts. |

## Boundary of this task

This is a **source-based copy review**, not a code or visual redesign. It includes product-owned screen text, placeholders, accessible labels, tooltips, messages and explicit validation. It also covers default labels returned by the backend and documents generated labels separately.

It does not rewrite user content, attributed quotes, AI prompts/responses, complete technical guides, internal identifiers, developer logs or MCP tool contracts. Exact Google/provider/browser/diagram-engine messages are dynamic and cannot all be listed as fixed strings. See the source register for details.

**No application code, database, authentication, dependencies or MCP behavior was changed. No tests, builds, migrations or browser checks were run for this review.** Existing uncommitted implementation changes were preserved.

## Review checks

The saved tables were checked for row totals, decision totals, valid table structure and existing linked source files. All eight literal-copy tables match the summary counts. The only differing recommendation for an identical literal is intentional: Reading settings in the Reader dialog versus Settings on the shared account page. Generated counter labels also retain the same wording as their literal-copy entries.

These are documentation consistency checks, not application tests or browser verification. The scope and runtime limitations above still apply.

## Review before implementation

First review the proposed copy, especially the terminology and removal decisions. Then approve a bounded implementation task. After that, apply the approved wording area by area, preserve machine contracts, and verify the affected screens with separately approved checks. Navigation layout and icon consistency remain separate from this copy inventory; this review does not silently implement them.
