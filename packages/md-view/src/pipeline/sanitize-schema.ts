import { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";

/** Cloned copy of the default schema to extend without mutation. */
const base = structuredClone(defaultSchema);

/** KaTeX MathML and SVG tags allowed through sanitization. */
const KATEX_TAGS = [
  "math", "semantics", "annotation", "mrow", "mi", "mo", "mn", "ms", "mtext",
  "mspace", "msup", "msub", "msubsup", "mfrac", "msqrt", "mroot", "mtable",
  "mtr", "mtd", "munder", "mover", "munderover", "mpadded", "mphantom",
  "menclose", "mstyle", "merror",
  "svg", "path", "line", "g", "use", "defs", "rect",
];

/** Extended sanitize schema allowing callout, KaTeX, GFM task checkboxes, and safe media. */
export const mdSanitizeSchema: SanitizeSchema = {
  ...base,
  tagNames: [
    ...(base.tagNames ?? []),
    "callout",
    "input",
    "audio",
    "video",
    "track",
    "source",
    "iframe",
    ...KATEX_TAGS,
  ],
  attributes: {
    ...base.attributes,
    "*": [
      ...(base.attributes?.["*"] ?? []),
      "className",
      "style",
      "ariaHidden",
      "ariaLabel",
    ],
    callout: ["icon"],
    div: ['dataMdBlockId', 'dataMdSourceStart', 'dataMdSourceEnd', 'dataMdAtomicStart', 'dataMdAtomicEnd', 'dataMdAtomicKind'],
    input: ["type", "checked", "disabled"],
    span: ["className", "style", 'dataMdTextMap', 'dataMdAtomicStart', 'dataMdAtomicEnd', 'dataMdAtomicKind'],
    code: ['className', 'dataMdTextMap'],
    details: ["open"],
    img: [...(base.attributes?.img ?? []), "src", "alt", "title"],
    a: [...(base.attributes?.a ?? []), "href", "target", "rel"],
    audio: ["src", "controls", "loop", "muted", "preload"],
    video: ["src", "controls", "loop", "muted", "preload", "poster", "width", "height", "playsinline"],
    track: ["src", "kind", "srclang", "label", "default"],
    source: [...(base.attributes?.source ?? []), "src", "type", "media", "srcset", "sizes"],
    iframe: ["src", "width", "height", "title", "loading", "allowfullscreen", "allow", "sandbox", "dataHideFrame"],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
    svg: ["xmlns", "width", "height", "viewBox", "preserveAspectRatio", "style", "ariaHidden"],
    path: ["d", "style"],
    line: ["x1", "x2", "y1", "y2", "style"],
  },
  protocols: {
    ...(base.protocols ?? {}),
    poster: ["http", "https"],
  },
};

// Strip author-supplied CSS before KaTeX generates the inline styles it requires.
// Component overrides and the viewer's CSS remain the host's customization API.
export const rawMarkdownSchema: SanitizeSchema = {
  ...mdSanitizeSchema,
  attributes: Object.fromEntries(Object.entries(mdSanitizeSchema.attributes ?? {}).map(([tag, attributes]) =>
    [tag, attributes.filter(attribute => {
      const name = Array.isArray(attribute) ? attribute[0] : attribute;
      return name !== 'style' && !name.startsWith('dataMd');
    })],
  )),
};
