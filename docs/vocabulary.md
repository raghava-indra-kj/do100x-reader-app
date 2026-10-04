# Personal vocabulary

Vocabulary is a private Reader learning list at `/reader/vocabulary`. A word has
no page ID, page title, source sentence or source relation. Save it while reading,
add it directly, or add up to 50 words through the existing MCP server.

## Storage and migration

One `vocabulary` table holds the term, case-sensitive trimmed duplicate key,
Markdown explanation, difficulty, usage frequency, learning status, practice
sentence, last review, timestamps and version. Words/phrases and different case
variants remain distinct; no stemming or dictionary lookup is used to merge them.

The forward migration removes `pageId`, keeps the earliest copy of each exact
trimmed word for each user, and initializes learning fields. No old API parameters,
compatibility aliases or fallback data structures are retained. It does not reset
the database or change Reader pages, quizzes, Finance or Tasks. The migration must
be deployed before running the new backend. Prisma generation must also run.

The existing root `npm run prod` performs installation, Prisma generation,
migration deployment and the application builds before starting the server.
These operations were **not run** as part of this implementation. Back up a
populated database before deploying any schema migration. Use migrations, not
`db push`: the explicit binary collation on `normalizedTerm` is essential.

## Shared operations

REST and MCP call `reader-backend/src/vocabulary-service.ts`. All reads and
writes are restricted to the session/MCP owner. No new MCP server, credentials,
revocation mechanism or permission model is introduced.

| REST | MCP | Purpose |
| --- | --- | --- |
| GET `/backend-api/vocabulary` | `reader_get_vocabulary` | Filtered, paginated list |
| POST `/backend-api/vocabulary/read` | `reader_read_vocabulary` | Read exact IDs and current versions |
| POST `/backend-api/vocabulary` | `reader_add_vocabulary` | Save words/phrases, preserving duplicates |
| PUT `/backend-api/vocabulary/explanations` | `reader_write_vocabulary_explanations` | Batch Markdown explanation updates |
| PATCH `/backend-api/vocabulary/:id` | `reader_update_vocabulary` | Labels, practice, status and review time |
| DELETE `/backend-api/vocabulary/:id` | `reader_delete_vocabulary` | Version-checked deletion |

List inputs: `search`, `savedFrom`, `savedBefore`, `difficulty`, `usageFrequency`,
`learningStatus`, `missingExplanation`, `sort`, `offset`, `limit`. Maximum page
size is 50. Output: `{ items, total, nextOffset }`. List items are lightweight
metadata with `hasExplanation`; use the read tool for complete Markdown and
practice text. Inaccessible read IDs return
`{ id, word: null }`, without revealing whether another user's word exists.
The `reader://vocabulary` resource returns the first page; use the list tool for
remaining pages. Offsets are for an active list, not an immutable snapshot;
restart a scan if other clients add/delete/reclassify words during it.

Date boundaries are ISO instants: start inclusive, end exclusive. The browser
calculates local calendar boundaries (Monday starts the week) and sends UTC
instants, so midnight and daylight-saving transitions are not treated as fixed
24-hour periods. MCP clients do the same conversion for the user's timezone.
Date filtering means first saved, not explained/reviewed. Repeated saves do not
change dates, explanations, labels or practice.

Default priority order: learning before learned, difficult before medium/easy/
unrated, then frequent before occasional/rare/unrated, then newest, then ID.
Classifications are personal judgments, not measured linguistic frequency.
The browser keeps its review queue stable after an individual update; Refresh
reapplies ordering and filters.

## Batch learning workflow

1. List words with `missingExplanation: true` (or a user-selected filter).
2. Read the required word IDs and versions.
3. Generate general learning explanations in the AI client: clear meanings,
   natural examples, common phrases, confusing words, mistakes and practice.
4. Call `reader_write_vocabulary_explanations` with:

```json
{
  "words": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "expectedVersion": 1,
      "explanationMarkdown": "## Meaning\nA clear explanation with examples."
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "expectedVersion": 3,
      "explanationMarkdown": "## Meaning\nAnother explanation."
    }
  ]
}
```

At most 50 unique IDs, 20,000 characters per explanation and 500 KB of UTF-8 JSON
per batch. Invalid structure, duplicate IDs or oversized input rejects the whole
request **before any writes**. Valid requests produce independent per-word
results: `saved`, `conflict`, `not_found`, `failed`. MCP save results contain the
new version, not a repeated copy of the explanation; REST results include the
updated word for the editor. MCP add results contain ID, term, version and whether
the word was newly created.
Each successful write is its own transaction. Failed items never roll back other
successes. A stale version never overwrites newer content. Read failed items
again before retrying; a retry of a previously committed item will conflict rather
than overwrite it. Explanations never update practice, labels or learning status.
Labels are only changed on the user's instruction. AI generation is external;
no new in-app generation model/button or job queue is included.

Metadata writes also require `expectedVersion`. `reviewed: true` records the
review time. Deletion requires the current version, including from MCP. Maximum
practice length is 5,000 characters. Empty practice can be saved; explanations
must contain non-whitespace content.

## UI and draft protection

The Reader saved-words panel links to Vocabulary and shows recent personal words.
Page-specific saved explanations remain a separate collection in that panel.
Vocabulary uses the shared app bar and Markdown renderer (including existing
Markdown extensions), with responsive list/detail views and previous/next arrows.
Keyboard arrows do not interfere with forms, links, buttons or dialogs.

User-triggered word/filter/app-link navigation asks before discarding unsaved
explanation/practice edits. Closing the explanation editor does not discard an
unsaved practice sentence. Browser unload uses the standard existing warning.
Drafts are saved to per-user/per-word session storage, so browser-history
navigation or an expired session does not erase them. Return to the word to
restore its draft and original version; concurrent changes still conflict.
Draft storage is local to the tab and is cleared when saved/discarded. It is not
a server backup. If storage is unavailable, a warning asks the user to save
before leaving. No automatic spaced repetition, audio, grading or gamification.

## Verification status

Tests have been authored but not run. No builds, type checks, migrations, client
generation or browser checks have been performed for this feature. Before release,
verify the migration on a disposable database, including exact duplicates and
case variants; owner isolation; stale/conflicting writes; partial batch results;
pagination and date boundaries; themed Markdown; keyboard/mobile navigation;
unsaved drafts and generation failures. Confirm the production build after
generating the updated Prisma client.
