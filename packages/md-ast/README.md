# @reader/md-ast

Markdown source documents, exact edits, section ranges and annotation anchors. No React, DOM, database, theme or application services are required.

```ts
import { createDocument, createTextAnchor, editAnnotatedDocument, serializeDocument } from '@reader/md-ast';

const document = createDocument('A useful idea.');
const comment = createTextAnchor(document, { start: 2, end: 13 });
const next = editAnnotatedDocument(document, [
  { start: 2, end: 8, expected: 'useful', insert: 'practical' },
], [comment]);
console.log(serializeDocument(next.document)); // A practical idea.
```

## Source and persistence

The original source string is authoritative. `serializeDocument` returns it unchanged; parsing and rendering never regenerate Markdown. `applySourceEdits` verifies the expected text and applies non-overlapping edits atomically. `replaceBlock` is a convenience for a whole-block replacement. Section APIs (`locateSections`, `sectionBodyTarget`, `replaceSectionBody`) support existing Markdown source editors.

Persist the document metadata along with its source to preserve block IDs. Validate a saved JSON document with `hydrateDocument` before using it. IDs are generated once, not derived from text, line numbers or headings. All offsets are **UTF-16 source offsets**, not rendered-text offsets; edits and anchors reject boundaries inside a surrogate pair. Convert coordinate units when exchanging annotations with systems using Unicode code points.

Untouched source, including front matter, comments, unknown syntax, line endings, math and diagram fences, is retained. Supported parsing includes CommonMark, GFM, YAML front matter and math. Unknown syntax can remain source even when it has no specialized renderer.

## Comments

- `createTextAnchor(document, range, readableQuote?)`: one source range, represented as per-block segments.
- `createBlocksAnchor(document, ids)`: one or several whole blocks.
- `validateAnchor(document, value)`: validate untrusted persisted targets.
- `editAnnotatedDocument(document, edits, anchors)`: update source and attachments together.
- `reconcileDocument(previous, newSource)` and `reconcileAnchor`: conservative recovery when exact edit operations are unavailable.
- `moveAnnotatedBlocks(document, ids, beforeId, anchors)`: move a group by identity, including duplicate paragraphs. Use `null` to move to the end. Original block source and separator slots are retained; moves that would change Markdown parsing boundaries are rejected atomically.
- `copyAnnotatedBlocks(document, ids, beforeId, anchors)`: insert copies with fresh identities, leaving comments on their original blocks. Neither operation copies discussion records. These operations are within one document; cross-page transfers require host ownership and revision checks.

Attachment states are `attached`, `changed`, `partial`, `source-removed`, and `ambiguous`. Deleting a complete text target produces `source-removed`; replacing it with other text produces `ambiguous` so the host can offer reattachment. Both remove the active highlight. A whole-block comment follows the block when its identity survives. If merging adds unselected content to that block, the comment becomes a precise text target instead of expanding into unrelated content. Removed attachments preserve the original quote; the library never deletes discussion records. Discussion states such as open/resolved belong to the host application.

The host must save content, identities and anchors in one transaction guarded by a document revision. Undo must restore the prior content **and** metadata together. Full-source replacement without operation history only preserves proven unchanged identities; ambiguous duplicate text is not guessed. A plain `.md` export cannot carry all comment metadata: export an accompanying JSON document when identity and annotations must survive transfer.

`createAnnotationChange(before, after)` snapshots a content transaction as `{ document, annotations: [{ id, anchor }] }` states. `restoreAnnotationChange(current, change, 'undo' | 'redo')` returns `{ state, change }`, restoring source, identities and attachments together. Keep the returned `change` for the next undo/redo: it includes newer notes whose source was removed by undo and must return on redo. Deleted comments are not resurrected; comments added or manually reattached since the edit follow surviving source conservatively. Comment bodies, resolution and permissions stay with the host and are never rolled back by this helper. Bind history entries to their page and revision, validate authorization, and persist the returned state atomically. A stale source or identity index is rejected; this helper does not rebase concurrent content edits or supply an editor UI/history stack.

## Compatibility

The older `parseMarkdown` / `toMarkdown` / `toJson` APIs remain available for their structured-block format. That serializer can normalize Markdown. Use the source-document APIs above for lossless editing; do not convert between the two formats as a save pipeline. `createBlockAnchor` / `resolveBlockAnchor` are the older whole-block snapshot API; new applications should use `AnnotationAnchor`.

## Building and distribution

From the repository: `npm run build:markdown`, then `npm pack --workspace @reader/md-ast`. The tarball contains compiled ESM, source maps and TypeScript declarations. No repository aliases are required in a consumer. `npm run verify:markdown` installs the tarballs into a separate project and checks rendering, types and browser bundling.
