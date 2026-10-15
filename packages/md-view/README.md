# @reader/md-view

A standalone React Markdown viewer with GFM, syntax highlighting and code copying, KaTeX mathematics, D2 and Mermaid diagrams, fullscreen diagram navigation, images, media, callouts and details. React 18.3+ or 19 is a peer dependency.

```tsx
import { MarkdownRenderer } from '@reader/md-view';
import '@reader/md-view/md-view.css';

export function Article({ source }: { source: string }) {
  return <MarkdownRenderer markdown={source} />;
}
```

`markdown` is the only required prop. There are no required theme objects, Reader services, storage adapters, authentication providers or API endpoints. Diagram engines load on demand. Diagrams render on the client; server rendering supports the remaining Markdown content.

## Appearance

The CSS import is optional and includes syntax and math styles plus local KaTeX fonts. You can instead supply your own stylesheet or import `@reader/md-view/math.css` independently. No CDN is required.

```css
.my-article {
  --md-font-family-prose: Georgia, serif;
  --md-font-size-paragraph: 18px;
  --md-color-body: #243044;
  --md-color-surfaceBg: #ffffff;
  --md-mermaid-primaryColor: #315bd6;
}
.my-article .md-heading-2 { font-weight: 600; }
```

Use `className`, `style` or `components` for host customizations. Diagram colors read the viewer's CSS properties and respond to ancestor theme/class/style changes. The optional `markdownStyle` helper and legacy theme types convert existing Reader-style preferences to CSS; they are not required by the renderer.

## Source identity and selection

Supply a persisted `MarkdownDocument` from `@reader/md-ast` through `document` to render stable `data-md-block-id` attributes. Its source must match `markdown`. Without metadata the IDs are render-local, including during server hydration; never persist them as comment targets.

`onBlockClick` and `renderBlockActions` expose the original source block to the host. `sourceRange` displays intersecting blocks while parsing the complete source, retaining reference definitions outside the displayed section.

`selectionToAnchor(viewerRoot, document, browserRange)` maps a DOM selection to precise source segments across one or more blocks. Pass the `.md-view` element and the same persisted document used to render it. The result is `attached` with an anchor, `empty`, `outside`, or `unmapped` with a reason and available block IDs. Never silently save an unmapped result as a precise text attachment; offer explicit whole-block commenting instead.

`anchorToRanges(viewerRoot, document, anchor)` maps persisted anchors back to DOM ranges for CSS Highlights, scrolling or a host overlay. It returns only visible targets, so it also works with `sourceRange`. Apply content changes with the core's annotation transaction and persist content, block metadata and anchors atomically under a revision check. The library does not save comments or manage a database.

Mapping handles Markdown formatting, links, character escapes/entities, Unicode, Windows line endings, lists, tables, inline code and highlighted code. Equations, diagrams, media and embedded widgets are whole-object targets. Toolbars and copy buttons are excluded. Generated metadata is added after raw HTML sanitization; imported content cannot forge it. Host component overrides must preserve supplied children and source attributes to retain text mapping. Changed or unsupported custom output is reported as unmapped rather than guessed. A selection exceeding the core's 1,000-segment limit returns `selection-too-large`; offer a smaller selection or whole-block commenting.

## Links, media and embedded components

`baseUrl` resolves relative content links and media URLs. Dangerous URL protocols, scripts and event handlers are stripped. Author-provided raw HTML styles are removed before math-generated styles are added. Iframes are sandboxed without same-origin access; applications needing a trusted integration can supply an `iframe` component override. Host components are trusted application code and are responsible for their own safety.

`onLinkClick` receives internal, external and fragment link events.

`onCopyText(text)` optionally supplies an asynchronous clipboard bridge for restricted hosts such as sandboxed extension pages. Resolve only after copying succeeds; reject to show failure. Without this callback, code controls use the browser clipboard with a selection-based fallback.

Data-only component fences allow application-owned page/quiz widgets without coupling the library to Reader:

````md
```reader-component
{"type":"quiz","id":"quiz-123"}
```
````

Pass `embeds={{ quiz: ({ value }) => <YourQuiz id={value.id} /> }}`. The host owns loading and permissions. Unknown or malformed embeds display their original source. The library never evaluates Markdown as JavaScript or MDX.

## Mathematics and diagrams

Inline `$...$` and display `$$...$$` math preserve source and render using KaTeX's supported TeX math syntax, including accessible MathML. This is not a complete LaTeX document compiler. Unsupported math stays readable with an error. Trust is disabled and expansion/size limits are enforced.

Fenced `d2`, `d2lang` and `mermaid` blocks render diagrams. `D2Diagram` is also available independently. D2 worker requests are serialized and time out after 60 seconds; failures do not poison subsequent requests. Generated SVG is sanitized before display. D2 currently uses a blob worker and dynamic code initialization: hosts with restrictive CSP, including extension pages, need an isolated rendering context. Do not enable unrestricted script execution on a privileged extension page.

## Distribution

Run `npm run build:markdown`, then `npm pack --workspace @reader/md-view`. Install the parser and viewer tarballs together when using local distribution. `npm run verify:markdown` installs both tarballs in separate projects outside the repository and checks React 18.3 and 19 consumers, declarations, server rendering, source edits, fonts and browser bundling. Public registry publication is a separate release step.
