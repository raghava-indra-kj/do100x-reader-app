# Markdown Format Guide (md-view)

Supported: CommonMark + GFM + math + limited raw HTML (sanitized). Anything else is stripped or shown literally.

## Core

| Feature | Syntax |
|---|---|
| Frontmatter | `---\nkey: val\n---` at file top; stripped, not rendered. Parsed as strict YAML — malformed YAML silently drops the *entire* frontmatter (title/category included). **Always double-quote string values**: `title: "Module 2 — Memory Model: How Objects Live and Die"`. Required whenever the value contains `: ` (colon+space), or starts with `- ? : , [ ] { } # & * ! \| > ' " % @` \`, or could be misread as a number/bool/null (`"3"`, `"true"`, `"no"`) |
| Headings | `#`…`######` (ATX) or `===`/`---` underline (setext H1/H2). **No auto-id/anchor** — add `<h2 id="x">` manually if you need `#x` links |
| Paragraph break | blank line |
| Hard line break | trailing `\` or 2 trailing spaces |
| Bold / italic / strike / code | `**b**` `*i*`/`_i_` `~~s~~` `` `c` `` |
| Lists | `-`/`*`/`+` bullets, `1.` ordered (start honored), nested via indent; task list `- [ ]`/`- [x]` |
| Blockquote | `> text` |
| HR | `---` / `***` / `___` |
| Link / image | `[t](url "title")` `![alt](url "title")`. `javascript:`/`data:`/`vbscript:`/`file:` URLs stripped. `https?:` links open new tab; bare URLs/`<email@x.com>` autolink |
| Table | GFM pipe tables, `:--`/`:-:`/`--:` alignment, scrolls horizontally |
| Code fence | ` ```lang ` → highlighted; ` ```mermaid ` → rendered as live diagram, not text |
| Math | inline `$x^2$`, block `$$...$$`; a paragraph that's *only* one `$...$` auto-promotes to block |
| Footnotes | `[^1]`/`[^1]: text` parse but render unstyled |

## Raw HTML (sanitized allowlist — unknown tags/attrs/`<script>`/handlers dropped)

**Blank-line rule (critical):** for `<callout>` and `<details>`, put a blank line right after the opening tag and right before the closing tag. Without it, the parser treats the inside as a raw HTML block and does NOT reparse it as markdown (no bold/links/lists render).

```html
<callout icon="💡">

Markdown **content** here.

</callout>

<details open>
<summary>One-line label</summary>

Markdown **content** here.

</details>
```
- `callout`: only attr `icon` (emoji/string, optional).
- `details`: optional boolean attr `open`. `<summary>` stays on its own single line, no blank line needed around it.

```html
<iframe src="url" width height title loading allow sandbox allowfullscreen data-hide-frame></iframe>
```
`data-hide-frame` (no value) removes the URL-label wrapper.

```html
<video src controls loop muted preload poster width height playsinline></video>
<audio src controls loop muted preload></audio>
<source src type media srcset sizes><track src kind srclang label default>
```

Other default-safe HTML (`sub`, `sup`, `kbd`, `span[class,style]`, `a[id]`, etc.) passes through. No `script`/`style`/`form`/event handlers/dangerous-protocol links.

## Not supported

`[[wiki links]]`, custom tags beyond `callout`/`details`/`summary`, auto heading anchors/TOC.

## Checklist

1. ATX headings, no reliance on auto anchors.
2. Blank line before/after content in every `<callout>`/`<details>`.
3. Mermaid → fence only, never inside raw-HTML blocks.
4. No `javascript:`/`data:` URLs, no `<script>`.
5. Frontmatter string values double-quoted, especially `title:` — an unquoted colon inside the value breaks YAML parsing and drops the whole frontmatter block.
