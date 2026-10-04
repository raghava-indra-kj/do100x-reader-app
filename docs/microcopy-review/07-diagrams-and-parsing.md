# Code blocks, diagrams and content parsing

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes code-copy controls, D2 and Mermaid fullscreen controls and product-owned parsing diagnostics. No new fullscreen or error-copy capability is implied by this wording review. External engine messages are not fixed microcopy.

35 entries: 28 rewrite, 0 remove, 7 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| D001 | Open in new tab | Open in new tab | Keep | [F009:45](D:/PersonalProjects/reader/packages/md-view/src/components/blocks/iframe.tsx:45) |
| D002 | Code copied | Code copied | Keep | [F010:53](D:/PersonalProjects/reader/packages/md-view/src/components/code/code-block.tsx:53) |
| D003 | Could not copy code. Try again. | Couldn’t copy the code. Try again. | Rewrite | [F010:55](D:/PersonalProjects/reader/packages/md-view/src/components/code/code-block.tsx:55) |
| D004 | Copy code | Copy code | Keep | [F010:56](D:/PersonalProjects/reader/packages/md-view/src/components/code/code-block.tsx:56) |
| D005 | Language: ${language} | Language: ${language} | Keep | [F010:60](D:/PersonalProjects/reader/packages/md-view/src/components/code/code-block.tsx:60) |
| D006 | Failed to render D2 diagram | Couldn’t render this D2 diagram. | Rewrite | [F011:76](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-block.tsx:76), [F012:86](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx:86) |
| D007 | D2 Diagram Error | D2 diagram error | Rewrite | [F011:91](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-block.tsx:91) |
| D008 | View diagram in full screen | Open diagram fullscreen | Rewrite | [F011:111](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-block.tsx:111), [F012:123](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx:123) |
| D009 | View D2 diagram in full screen | Open D2 diagram fullscreen | Rewrite | [F011:112](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-block.tsx:112), [F012:124](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx:124) |
| D010 | Invalid D2 diagram | Invalid D2 diagram | Keep | [F012:110](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx:110) |
| D011 | D2 Diagram Fullscreen | D2 diagram | Rewrite | [F013:26](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:26) |
| D012 | Zoom Out (-) | Zoom out (-) | Rewrite | [F013:257](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:257), [F015:256](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:256) |
| D013 | Zoom Out | Zoom out | Rewrite | [F013:258](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:258), [F015:257](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:257) |
| D014 | Current Zoom | Zoom | Rewrite | [F013:263](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:263), [F015:262](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:262) |
| D015 | Zoom In (+) | Zoom in (+) | Rewrite | [F013:269](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:269), [F015:268](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:268) |
| D016 | Zoom In | Zoom in | Rewrite | [F013:270](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:270), [F015:269](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:269) |
| D017 | Fit to Screen (0) | Fit to screen (0) | Rewrite | [F013:279](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:279), [F015:278](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:278) |
| D018 | Fit to Screen | Fit to screen | Rewrite | [F013:280](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:280), [F015:279](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:279) |
| D019 | Fit | Fit | Keep | [F013:283](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:283), [F015:282](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:282) |
| D020 | Close Fullscreen (Esc) | Close fullscreen (Esc) | Rewrite | [F013:292](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:292), [F015:291](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:291) |
| D021 | Close Fullscreen | Close fullscreen | Rewrite | [F013:293](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:293), [F015:292](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:292) |
| D022 | View in full screen | Open fullscreen | Rewrite | [F014:135](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-block.tsx:135) |
| D023 | View Mermaid diagram in full screen | Open Mermaid diagram fullscreen | Rewrite | [F014:136](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-block.tsx:136) |
| D024 | Mind Map Fullscreen | Mermaid diagram | Rewrite | [F015:248](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:248) |
| D025 | Invalid YAML in front matter | Check the YAML in the page’s front matter. | Rewrite | [F005:26](D:/PersonalProjects/reader/packages/md-ast/src/internal/frontmatter.ts:26) |
| D026 | Front matter must be a mapping, got ${kind} | Front matter must contain key-value pairs, not ${kind}. | Rewrite | [F005:32](D:/PersonalProjects/reader/packages/md-ast/src/internal/frontmatter.ts:32) |
| D027 | Invalid md-ast document: ${result.error.message} | Invalid md-ast document: ${result.error.message} | Keep | [F006:19](D:/PersonalProjects/reader/packages/md-ast/src/json.ts:19) |
| D028 | Failed to parse markdown | Couldn’t read this Markdown. Check its formatting. | Rewrite | [F007:14](D:/PersonalProjects/reader/packages/md-ast/src/parse-markdown.ts:14), [F062:34](D:/PersonalProjects/reader/reader-frontend/src/lib/md-parser/parse-markdown.ts:34) |
| D029 | Unclosed HTML &lt;${node.tagName}&gt; could affect other sections. Close it inside this section or use full-page editing. | An unclosed &lt;${node.tagName}&gt; tag could affect other sections. Close it within this section or use page editing. | Rewrite | [F008:106](D:/PersonalProjects/reader/packages/md-ast/src/section-edit.ts:106) |
| D030 | Section changed before this edit could be applied | This section has changed. Reload before saving. | Rewrite | [F008:126](D:/PersonalProjects/reader/packages/md-ast/src/section-edit.ts:126) |
| D031 | This edit changes the page's heading structure; use full-page editing for structural changes | This changes the page’s headings. Use page editing instead. | Rewrite | [F008:151](D:/PersonalProjects/reader/packages/md-ast/src/section-edit.ts:151) |
| D032 | Frontmatter, reference and footnote definitions affect other sections; use full-page editing to change them | Front matter, link references and footnotes can affect other sections. Change them in page editing. | Rewrite | [F008:160](D:/PersonalProjects/reader/packages/md-ast/src/section-edit.ts:160) |
| D033 | Invalid YAML front matter | Check the YAML in the page’s front matter. | Rewrite | [F061:42](D:/PersonalProjects/reader/reader-frontend/src/lib/md-parser/internal/frontmatter.ts:42) |
| D034 | Front matter must be a key-value mapping | Front matter must contain key-value pairs. | Rewrite | [F061:47](D:/PersonalProjects/reader/reader-frontend/src/lib/md-parser/internal/frontmatter.ts:47) |
| D035 | Drag canvas to move • Scroll to zoom • Double-click to fit • Press Esc to close | Drag to move · Scroll to zoom · Double-click to fit · Esc to close | Rewrite | [F013:324](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx:324), [F015:323](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx:323)<br>Rendered message assembled from text and dynamic values. |
