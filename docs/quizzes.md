# Quizzes: authoring, attempts, and AI feedback

Quizzes are separate records attached to a Reader page, not embedded in its Markdown. A page may have any number of quizzes. Each quiz is one question paper containing one or more objective or subjective questions. All prose remains Markdown source and uses the Reader's existing renderer.

## Data and revision behavior

The schema has eight additive tables: `quiz`, `quiz_revision`, `quiz_question`, `quiz_option`, `quiz_attempt`, `quiz_attempt_answer`, `quiz_answer_selection`, and `quiz_answer_evaluation`. The full schema contract and one-time SQL application procedure are in [quiz-step-1.md](quiz-step-1.md).

Each save publishes a complete immutable `quiz_revision`. Question and option rows are new for each revision. Editing, regenerating, reordering, or removing a question requires the question ID from the *expected* revision and a matching `expectedRevisionNo`. A stale edit returns HTTP 409 / MCP error 409 and changes nothing. Archiving a quiz hides it from new starts, but does not delete revisions, answers, evaluations, or earlier submissions.

An attempt stores the revision ID when started. Its answers use pinned question and option IDs. It can be submitted once; duplicate start and submit requests are idempotent. Objective grading uses exact-set matching, including multi-select. Blank answers are unanswered. AI feedback is append-only and cannot change deterministic objective verdicts or scores. Subjective answers have a clear reference answer and a separate detailed explanation. AI evaluation is performed by an MCP client; submission does not make a hidden model call or require another model setting.

## UI

Open a Reader page and select the Quizzes icon in the left rail (`Alt+Q`). The list is paginated. Owners can create, edit, reorder, and archive quizzes. The full-screen editor supports Markdown prompts, 2–10 Markdown choices, a single/multiple choice mode, short/long subjective answers, explanations, previews, and older revision inspection. A conflict leaves the unsaved draft visible for review. Everyone allowed to read the page can preview quiz questions without answer keys. Signed-in readers can start or resume attempts, save answers, submit, and inspect per-question results and feedback history. Anonymous visitors cannot save attempts. After archival, owners see all archived quizzes; other signed-in readers see only archived quizzes they attempted, so they can still find their own history.

## HTTP API

All paths have prefix `/backend-api/quizzes`. Mutations use the existing signed session and origin checks. Owner reads/writes require page ownership; attempts are readable only by their respondent.

| Method | Path | Purpose |
|---|---|---|
| GET | `/?pageId=...&cursor=...&take=...` | Active quiz page; `archivedOnly=true` shows all to owners and only attempted quizzes to other signed-in readers. |
| POST | `/` | Create `{pageId, quiz}`. |
| GET | `/:quizId?view=author&revisionNo=...` | Owner view, including prior revisions; default learner view omits keys. |
| PATCH | `/:quizId` | `{expectedRevisionNo, operations}` to publish a revision. |
| POST | `/:quizId/swap` | Swap order with `{otherQuizId}`. |
| POST | `/:quizId/archive` | Archive with `{expectedRevisionNo}`. |
| POST | `/:quizId/attempts` | Start with UUID `{startRequestKey}`. |
| GET | `/:quizId/attempts` | Paginated respondent attempt history. |
| GET | `/attempts/:attemptId` | Pinned attempt; keys only after submission. |
| PUT | `/attempts/:attemptId/answers` | Replace one answer using question/option IDs or Markdown. |
| POST | `/attempts/:attemptId/submit` | Submit and grade once. |
| GET | `/attempts/:attemptId/evaluations` | Full feedback history. |

Change operations are `setMetadata`, `addQuestion` (optionally `beforeQuestionId` or `afterQuestionId`), `replaceQuestion`, `removeQuestion`, and `moveQuestion`. All operations in one request run in order and commit atomically. Learner responses before submission never contain `isCorrect`, reference answers, or explanations. API errors use 404 for inaccessible/missing records, 409 for stale or frozen state, and 422 for invalid input.

## MCP tools

The existing MCP authentication and SSE transport are unchanged. The quiz tool module calls the same domain services as HTTP:

`reader_list_quizzes`, `reader_get_quiz`, `reader_create_quiz`, `reader_apply_quiz_changes`, `reader_archive_quiz`, `reader_swap_quiz_order`, `reader_start_quiz_attempt`, `reader_save_quiz_answer`, `reader_submit_quiz_attempt`, `reader_get_quiz_attempt`, `reader_list_quiz_attempts`, `reader_get_quiz_evaluation_context`, `reader_record_quiz_evaluations`, and `reader_get_quiz_evaluation_history`.

To evaluate, an agent reads a *submitted* attempt's context, then records a batch with UUID `requestKey`, one or more pinned `questionId`s, verdicts, optional 0–100 scores, and Markdown feedback. It may include `modelId` and `promptVersion`. A whole batch succeeds or fails; an exact retry with the same key returns the stored result. A different payload with that key is rejected. Feedback never overwrites an earlier record. For an objective question, the verdict and any supplied score must match the server's deterministic grade.

## Deployment and verification

Back up the target database and review the schema diff before applying the one-time additive SQL; do not run `migrate reset`, `--force-reset`, or `--accept-data-loss`. A fresh database can be created by the normal `npm run db:push` workflow. Generate the Prisma client and build before starting the updated server. On Windows, a running Reader backend may lock the Prisma engine DLL: stop it during a planned restart before `npm run db:generate`, then start the new build. Do not run the SQL file a second time.

From the repository root:

```powershell
npm run db:generate
npm run build
npm test --workspace reader-frontend -- src/modules/page/quizzes/quiz-draft.test.ts
$env:RUN_DATABASE_TESTS='1'
npm test --workspace reader-backend
Remove-Item Env:RUN_DATABASE_TESTS
```

The database tests use transaction rollback and leave the configured database rows unchanged. The separate fresh-database verification command is `node scripts/verify-quiz-empty-db.js` from `reader-backend`; it creates and removes only a randomly named disposable database. The full frontend suite and production build pass. The YAML parser now rejects malformed or non-mapping front matter as its documented contract and tests require.
