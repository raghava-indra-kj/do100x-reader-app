# md-parser

Parses markdown into structured data and serializes it back. Standalone — no app dependencies.

## API

```typescript
import { parseMarkdown, safeParseMarkdown, serializeMarkdown } from "@/lib/md-parser";
```

### `parseMarkdown(source: string): MdDocument`

Parses a markdown string. Throws `MdParseError` on failure.

```typescript
const doc = parseMarkdown(`
---
title: My Post
---

## Introduction

Hello world.

### Details

More content.
`);

doc.frontmatter // { title: "My Post" }
doc.sections    // [{ title: "Introduction", level: 2, children: [{ title: "Details", ... }] }]
```

### `safeParseMarkdown(source: string): ParseResult`

Same as `parseMarkdown` but never throws. Returns `{ ok, data }` or `{ ok, error }`.

```typescript
const result = safeParseMarkdown(source);
if (result.ok) console.log(result.data.sections);
else console.error(result.error.message);
```

### `serializeMarkdown(doc: MdDocument): string`

Converts an `MdDocument` back into a markdown string. Round-trip is semantically faithful — heading style normalizes to ATX (`##`) and blank lines between sections collapse to one.

```typescript
const markdown = serializeMarkdown(doc);
```

## Types

```typescript
type MdFrontmatter = Record<string, unknown>;

interface MdSection {
    id: string;           // uuid, unique per parse
    title: string | null; // plain text, null for preamble
    rawTitle: string | null; // raw markdown (preserves bold, italic etc.)
    level: number;        // heading depth (1–6), 0 for preamble
    content: string | null;  // body between this heading and the next
    children: MdSection[];
}

interface MdDocument {
    frontmatter: MdFrontmatter | null;
    sections: MdSection[];
}
```

## Notes

- Content before the first heading becomes a **preamble** section with `level: 0` and `title: null`.
- Every heading at every depth becomes a section — sub-headings nest as `children`.
- `id` is a UUID generated per parse — not stable across parses.
- Frontmatter is parsed with `JSON_SCHEMA` — no date coercion, values stay JSON-safe.
