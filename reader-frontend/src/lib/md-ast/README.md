# md-ast

Block-level markdown AST. Parses markdown into an ordered list of typed **blocks**, each with a
stable `id`, and round-trips losslessly to/from JSON. Standalone — no app dependencies.

Where [`md-parser`](../md-parser) splits a document into **heading sections** (each body a single
opaque string), `md-ast` addresses **individual blocks** (paragraph, heading, code, list, …) so the
app can track the current block and anchor comments to a `blockId`.

## Why it is reliable

Every block's `markdown` field is the **verbatim source slice** of that node (taken from mdast
position offsets) — markdown is never re-rendered, so nothing is lost. Any node type not modelled
below degrades to an `unknown` block that *still carries its raw source*. The parser can never drop
content.

The remark plugin set mirrors the renderer (`md-view`): frontmatter + GFM + math, so block
boundaries match what the user sees.

## Conversions

```typescript
import { parseMarkdown, toMarkdown, toJson, fromJson } from "@lib/md-ast";

const doc = parseMarkdown(markdown); //  md   → ast
const md = toMarkdown(doc); //              ast  → md   (joins verbatim slices)
const json = toJson(doc); //                ast  → json (detached, JSON-safe clone)
const back = fromJson(json); //             json → ast  (zod-validated)
```

Each has a non-throwing variant: `safeParseMarkdown`, `safeToMarkdown`, `safeFromJson`, returning
`{ ok: true, data } | { ok: false, error: MdAstError }`.

## Types

```typescript
interface MdAstDocument {
    frontmatter: Record<string, unknown> | null; // parsed YAML (JSON-safe values)
    blocks: Block[];
}

type Block =
    | { id: string; markdown: string; type: "paragraph" }
    | { id: string; markdown: string; type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
    | { id: string; markdown: string; type: "code"; lang: string | null }
    | { id: string; markdown: string; type: "list" }
    | { id: string; markdown: string; type: "unknown"; nodeType: string };
```

The in-memory AST and the stored JSON are the **same shape** — `MdAstDocument` is directly
`JSON.stringify`-able.

## Block ids & source of truth

Ids are UUIDs assigned at parse time and **persisted inside the stored JSON** — so the stored JSON,
not the markdown, is canonical.

- **Import once:** `parseMarkdown(md)` assigns fresh UUIDs.
- **Store / load:** `JSON.stringify(toJson(doc))` → DB; `fromJson(JSON.parse(row))` back.
- **Edit (recommended):** mutate blocks in place, keeping each `id`. This keeps a comment attached to
  its block even after the block's text is edited.
- **Re-parse raw markdown (best-effort):** `reuseIds(previous, next)` carries ids onto blocks whose
  `type` + `markdown` are unchanged. Edited blocks get fresh ids.

Override id generation (e.g. deterministic ids in tests): `parseMarkdown(md, { generateId })`.

## Notes

- Block-level only — inline formatting stays inside each block's `markdown`.
- A list (incl. nested) is **one** block; its raw includes the nested items.
- Round-trip is semantic, not byte-identical: blank-line runs collapse to one and frontmatter YAML
  may reflow — the same caveat as `md-parser`.
- Frontmatter is parsed with `js-yaml` `JSON_SCHEMA` (no Date / yes-no coercion).
