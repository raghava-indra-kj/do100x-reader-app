# Quiz foundation (Step 1)

This foundation adds storage, validation, and a shared backend service. HTTP,
UI, and MCP integration are described in [quizzes.md](quizzes.md). Quizzes are
independent of `page.content`. Existing page and user rows are not rewritten.

## Data contract

The eight new MySQL tables are `quiz`, `quiz_revision`, `quiz_question`,
`quiz_option`, `quiz_attempt`, `quiz_attempt_answer`, `quiz_answer_selection`,
and `quiz_answer_evaluation`. Only `quiz.pageId` relates quiz content to a page.
`quiz_attempt.userId` identifies the respondent; there are no quiz settings on
`appuser`. Foreign keys use `ON DELETE RESTRICT` to preserve historical attempts.

`quiz.currentRevisionNo` points to a complete immutable `quiz_revision`. Each
question and option in a new revision is a new row. No published revision is
updated in place. The attempt service saves `quiz_attempt.revisionId` when an
attempt starts and always reads that pinned revision. Normal delete is
`quiz.archivedAt`, or omission of one question in the next revision; hard
deletion is deliberately not part of the feature API.

`quiz_question.kind` has only `OBJECTIVE` and `SUBJECTIVE`. Objective questions
have `SINGLE`/`MULTIPLE` selection and 2–10 Markdown options; single-select has
exactly one correct option and multi-select at least one. Subjective questions
have `SHORT`/`LONG`, no options, a separate Markdown reference answer, and a
separate Markdown explanation. All Markdown source is retained verbatim rather
than normalized or serialized from a rendered AST.

## Shared service

Import from `reader-backend/src/quiz`. HTTP and MCP adapters use the same
domain services rather than writing quiz tables directly. Input is checked
with the exported Zod schemas; failures are
`QuizError` (404, 409, or 422).

`applyQuizChanges` requires the expected revision number and an ordered list of
ID-targeted operations: `setMetadata`, `addQuestion`, `replaceQuestion`,
`removeQuestion`, and `moveQuestion`. The caller uses question IDs returned by
the expected revision, not question titles or positions. Adds append unless
`beforeQuestionId` or `afterQuestionId` is supplied. Moves append unless
`beforeQuestionId` is supplied. Operations run in array order; a question may
be replaced and moved once in the same batch, but duplicate or incompatible
operations are rejected. The complete result is
validated before a compare-and-swap update and new-revision insert run in one
transaction. A concurrent change produces 409, not an implicit rebase.

`getQuizRevision` has author and learner views. Author view requires page
ownership and may read an archived or older revision. Learner view follows the
page's public/inherited-public reading rule and returns only the current active
revision. It omits `isCorrect`, reference answers, and explanations. Submitted
attempt reads expose the pinned revision and explanations.
`listQuizzesForPage` returns active quizzes in sort order, with cursor
pagination (default 50, maximum 100).

## Applying the schema

Quizzes are included in the checked-in Google-only migration baseline.
Configure a new empty database in `reader-backend/.env`, then run these commands
from the repository root:

```powershell
npm run db:generate
npm run db:migrate
```

This is a clean cutover, not an in-place migration of the old credentials
database. Leave the original database untouched. Startup uses `migrate deploy`,
not schema push, reset, or seed. Future schema changes must have a reviewed
migration. See [google-sign-in.md](google-sign-in.md).

On Windows, stop your running backend before generating the Prisma client
because it may lock the query-engine DLL. Do not terminate someone else's server.

## Verification

From the repository root:

```powershell
npm test --workspace reader-backend -- src/quiz/quiz-contract.test.ts
$env:RUN_DATABASE_TESTS='1'
npm test --workspace reader-backend -- src/quiz/quiz-service.database.test.ts
Remove-Item Env:RUN_DATABASE_TESTS
npm run build:backend
```

The database test creates its account, page, revisions, and quiz inside one
transaction and rolls them all back. The disposable fresh-database check is
`node scripts/verify-quiz-empty-db.js` from `reader-backend`; it creates a
randomly named temporary MySQL database, verifies a clean schema, and drops
only that database. It requires database-create permission. It does not touch
the configured database's rows.
