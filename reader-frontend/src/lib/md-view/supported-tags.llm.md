md-view markdown spec. CommonMark + GFM + extensions. Only use syntax listed here.

FRONT MATTER: ---\nkey: value\n---  must be first; silently stripped, never rendered
HEADINGS: # H1  ## H2  ### H3  #### H4  ##### H5  ###### H6
EMPHASIS: **bold**  *italic*  ***bold+italic***  ~~strikethrough~~  `inline code`
LINKS: [text](url)  [text](url "title")  [text][ref]  <url>  bare-url
IMAGE: ![alt](url)
LISTS: - unordered  1. ordered  - [x] checked  - [ ] unchecked  (nestable)
BLOCKQUOTE: > text  (>> for nested)
CODE BLOCK: ```lang\ncode\n```  lang optional; syntax-highlighted
TABLE: | H | H |\n|---|---|\n| v | v |  align: :---: center  ---: right
HR: ---
MATH: $inline expr$  $$\nblock expr\n$$  (KaTeX)
MERMAID: ```mermaid\n...\n```  types: flowchart sequenceDiagram gantt pie classDiagram stateDiagram erDiagram journey timeline mindmap
COLLAPSIBLE: <details><summary>Label</summary>content</details>  add `open` to pre-expand
CALLOUT: <callout icon="emoji">text</callout>  icon optional — prefer over blockquote for tips/warnings/notes
AUDIO: <audio controls preload="metadata" src="url.mp3"></audio>  attrs: src controls loop muted preload
VIDEO: <video controls preload="metadata" poster="img.jpg"><source src="url.mp4" type="video/mp4"><track kind="subtitles" src="s.vtt" srclang="en" label="English" default></video>  attrs: src controls loop muted preload poster width height playsinline
IFRAME: <iframe src="https://www.youtube.com/embed/ID" width="560" height="315" title="label" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>  attrs: src width height title loading allowfullscreen allow sandbox — NOT: srcdoc
LINE BREAK: line ending with \ or 2 spaces = hard break

BLOCKED: autoplay stripped always — javascript:/data:/vbscript:/file: in URLs — all event attrs (onerror onplay etc) — srcdoc object embed script style
UNSUPPORTED — do not use: ==highlight==  ~sub~  ^super^  :emoji-code:  definition lists

RULES:
- Prefer fenced code blocks; always specify language when known
