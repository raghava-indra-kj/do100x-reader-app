# Approved microcopy implementation

Approved on 4 October 2026. The [copy review](D:/PersonalProjects/reader/docs/microcopy-review.md) remains the original current → proposed snapshot, not a description of today's rendered interface.

## Goal and boundaries

Apply the approved wording in small, independently reviewable steps. Preserve routes, authentication, stored preferences, user content, API/MCP contracts, financial rules and quiz behavior. No new copy framework, dependencies or navigation redesign is included.

On 4 October 2026, the user explicitly requested: “Implement all remaining copy changes; leave verification for later.” This authorizes completing the remaining copy steps together without further per-step approval. Tests, builds, linting, type checks and browser checks remain deferred. The plan-first workflow is being used to preserve the approved copy and scope boundaries.

| Step | Scope | Status |
| --- | --- | --- |
| 1A | Shared navigation, home, Google sign-in, theme labels and browser metadata: N001–N050, N134, N136–N137 | Implemented; runtime verification deferred |
| 1B | Quotes, breathing breaks and time perspective: remaining N entries and related generated display labels | Implemented; verification deferred |
| 2 | Reader pages, reading tools and section/page editing copy | Implemented; verification deferred |
| 3 | Quiz authoring, attempts, submission and feedback copy | Implemented; verification deferred |
| 4 | Tasks lists, priorities, timers and time reports; remove Beta badge | Implemented; verification deferred |
| 5 | Finance books, transactions, plans, imports, reports and related display labels | Implemented; verification deferred |
| 6 | Account settings, preferences, AI models and MCP interface copy | Implemented; verification deferred |
| 7 | Code blocks, diagrams and content parsing copy | Implemented; verification deferred |
| 8 | Shared API messages, validation and default labels | Implemented; verification deferred |

## Step 1A

Replace the home heading with “Your apps.” Keep one practical description per app, and remove duplicate slogans, card taglines, detail chips and the promotional footer. Remove the corresponding obsolete catalog fields and only their unused styles; keep the existing card links, icons and responsive layout.

Use Apps / Switch apps / Home in the shared app switcher. Update accessible account labels, sign-out wording, sign-in headings/messages, not-found copy, Forest dark display name and browser metadata. Step 1A retained the account avatar/name layout. The subsequent approval of all remaining copy includes G033: remove the visible account-name text while retaining the avatar, settings link, tooltip and accessible account identity. Other navigation redesign remains outside this copy task.

Update existing tests' wording expectations and add focused assertions for the approved removals and retained links. Do not run tests or builds until approved. Inspect the scoped changes against the approved copy and check for remaining obsolete wording and references.

## Verification record

### Step 1A — 4 October 2026

Applied the approved copy to the suite home and shared catalog, app switcher, shared app bar account/break labels, sign-out confirmation, Google sign-in messages, sign-in guard, not-found page, theme display name and browser metadata. Removed obsolete tagline/detail catalog fields and their unused rendering/styles. The mobile card's old first-child hiding rule was removed so its retained Open action is not hidden after the detail chip is removed.

Updated home, not-found, app catalog, app switcher and shared account-label expectations. Updated the Reader navigation test's shared-switcher mock to the new accessible label without changing Reader behavior. Added sign-in copy assertions for anonymous, loading and error states. These tests have not been run.

Reviewed source changes against the approved first-step copy and inspected remaining references. Existing app routes, active-app detection, auth flow, nonce handling, retry controls, account identity and saved theme values remain unchanged. This is source inspection only, not evidence of passing tests or rendered UI behavior.

The user selected **Leave verification for later**. No automated tests, production builds, linting, type checks, migrations or browser checks were run for this step. Runtime verification remains outstanding. No commit or push was made. Existing unrelated uncommitted changes were preserved.

## Remaining steps — 4 October 2026

All remaining reviewed rewrites and removals have been applied. This includes Reader reading tools, saved words, questions, comments and editing; quiz authoring, attempts and feedback; Tasks lists, timers and time reports; Finance forms, imports, plans, reports and history; account settings and model/MCP configuration; diagram controls, parser diagnostics, and user-facing API messages.

Removed the reviewed redundant captions and the Tasks Beta badge. Removed the shared app bar's visible account name as specified by G033, while retaining account identity in its accessible label and settings destination. Quote text, attribution, quote/cycle counters and timing remain unchanged. Markdown terminology remains where it identifies an actual editing or input format, not in home-page marketing.

Added explicit presentation labels to the existing Finance formatting module for transaction kinds, import decisions/statuses/checks, amount estimates, CSV mapping fields and audit actions/entities/sources. Stored enum values, CSV export headers, request keys, response keys and audit JSON remain unchanged. Quiz feedback shows “Partly correct” and “Needs review” while preserving AI attribution and history. Time-entry counts use the correct singular/plural; time-perspective copy identifies the user's estimate rather than a lifespan prediction.

Finance validation now names the affected field and retains the validator's original detail and flattened field errors. Validation rules and status codes are unchanged. External provider and diagram-engine diagnostics remain intact under product-owned headings; no global error-mapping framework was introduced.

Corrected one draft wording typo, F231: “Recorded account” became “Recorded spending in,” matching the recorded-history context. The review table records this correction; its original-source column remains unchanged.

Updated affected account-avatar, section-edit, sharing and uncertain-bill test expectations. Added Finance label assertions and an invalid-field/detail assertion. No tests were executed. Existing unrelated working-tree changes were preserved, and no dependencies, database changes, authentication changes or API/MCP contract changes were made by this copy pass.

### Deferred verification

Per the user's explicit instruction, no tests, production builds, linting, formatting, compilation, type checks, migrations or browser checks were run. Implementation status is not a claim of passing verification or validated rendered layout. A later verification pass should cover the updated test expectations, all app themes, long labels and narrow screens, public/private Reader views, quiz feedback, and Finance validation/import/audit displays. No commit or push was made.
