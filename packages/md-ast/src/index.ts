/* Types export */
export { MdAstError } from "./types";
export type {
    Block,
    BlockType,
    HeadingBlock, HeadingLevel, MdAstDocument, MdAstFrontmatter, ParseErr, ParseOk, ParseOptions,
    ParseResult, SerializeOk, SerializeResult, UnknownBlock
} from "./types";

/* Parse markdown to MdAstDocument */
export { parseMarkdown, safeParseMarkdown } from "./parse-markdown";

/* Convert MdAstDocument to markdown */
export { safeToMarkdown, toMarkdown } from "./to-markdown";

/* Convert MdAstDocument to and from JSON */
export { fromJson, safeFromJson, toJson } from "./json";
export { reuseIds } from "./reuse-ids";

/* Exact source ranges for safe, section-scoped editing. */
export { editableSectionBody, locateSections, parseSourceTree, replaceSectionBody, sectionBodyTarget } from "./section-edit";
export type { MarkdownSectionRange, SectionBodyTarget } from "./section-edit";

