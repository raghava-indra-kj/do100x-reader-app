---
title: md-parser Test File
author: Internal QA
version: 1
tags: [markdown, parser, test]
date: 2024-01-15
nested:
  key: value
  count: 42
---

This is preamble content — it appears before the first heading.
It has no title and gets level 0 in the parsed output.

Multiple paragraphs are allowed in the preamble.

# 1. ATX Headings

All six ATX heading levels.

## 1.1 H2 Section

Content under H2.

### 1.1.1 H3 Sub-section

Content under H3.

#### H4 Topic

Content under H4.

##### H5 Detail

Content under H5.

###### H6 Fine Print

Content under H6 — deepest level.

# 2. Setext Headings

Setext headings use underline syntax. The rawTitle must NOT include the underline.

Level One Setext
================

This heading used `===` underline syntax. rawTitle should be `Level One Setext`.

Level Two Setext
----------------

This heading used `---` underline syntax. rawTitle should be `Level Two Setext`.

# 3. ATX Closing Sequence

ATX headings can have optional closing `#` markers. They must be stripped from rawTitle.

## Clean Title ##

rawTitle should be `Clean Title` — no trailing `##`.

### Another ### With ### Hashes ###

rawTitle should be `Another ### With ### Hashes` — only trailing sequence stripped.

# 4. Inline Formatting in Headings

rawTitle preserves markdown. title is always plain text.

## Heading with **bold** text

rawTitle → `Heading with **bold** text`
title    → `Heading with bold text`

## Heading with _italic_ text

rawTitle → `Heading with _italic_ text`
title    → `Heading with italic text`

## Heading with `inline code`

rawTitle → `Heading with \`inline code\``
title    → `Heading with inline code`

## Heading with **bold and _nested italic_**

rawTitle → `Heading with **bold and _nested italic_**`
title    → `Heading with bold and nested italic`

## Heading with [a link](https://example.com)

rawTitle → `Heading with [a link](https://example.com)`
title    → `Heading with a link`

# 5. Section Content

Content in a section is everything between this heading and the next.
It is sliced directly from the source — verbatim, not re-serialized.

Paragraphs, lists, code blocks, and blockquotes all belong to this section's content.

- List item one
- List item two
  - Nested list item

> Blockquote inside section content.

```typescript
// Code block inside section content
const x = parseMarkdown(source);
```

## 5.1 Content Isolation

This sub-section has its own content.
The paragraph above belongs to section 5, not here.

### 5.1.1 Deep Content

This content belongs to 5.1.1 only.

## 5.2 Null Content Section

The next heading immediately follows — this section has content.

## 5.3 Empty Section

## 5.4 After Empty

Content resumes here under 5.4.

# 6. Level Skipping

## 6.1 Skip from H2 to H4

#### Skipped H3 entirely

H4 nests under H2 directly (no H3 in between).

## 6.2 Jump Back Up

After H4, a new H2 appears. It should be a sibling of 6.1, not a child of H4.

# 7. Repeated Headings

## Notes

Content under first Notes.

## Notes

Content under second Notes — different section, same title.

## Notes

Content under third Notes.

# 8. Edge Cases

## Empty heading content follows

##

## After the empty heading

The `##` above has no text — empty heading.

## Heading    with    extra    spaces

Extra spaces in ATX headings are normalised by the parser.

## 日本語の見出し

Non-ASCII heading — Unicode title preserved in both title and rawTitle.

## Heading — with em-dash and "quotes"

Special characters in headings.

# 9. Links

[External link](https://example.com) — type: `external`

[Anchor link](#1-atx-headings) — type: `anchor`

[Email link](mailto:hello@example.com) — type: `email`

[Relative link](/about) — type: `relative`

[Another relative](./docs/intro) — type: `relative`

# 10. Iframes

## 10.1 Framed iframe (default)

No `data-hide-frame` — renders with the URL label bar above the iframe.

<iframe src="https://www.wikipedia.org" width="100%" height="300" title="Wikipedia"></iframe>

## 10.2 Bare iframe (data-hide-frame)

`data-hide-frame` present — renders the raw iframe with no wrapper.

<iframe src="https://www.wikipedia.org" width="100%" height="300" title="Wikipedia (hidden frame)" data-hide-frame></iframe>
