/* Types export */
export type {
    MdAstFrontmatter,
    HeadingLevel,
    Block,
    BlockType,
    HeadingBlock,
    UnknownBlock,
    MdAstDocument,
    ParseOptions,
    ParseResult,
    ParseOk,
    ParseErr,
    SerializeResult,
    SerializeOk,
} from "./types";
export { MdAstError } from "./types";

/* Parse markdown to MdAstDocument */
export { parseMarkdown, safeParseMarkdown } from "./parse-markdown";

/* Convert MdAstDocument to markdown */
export { toMarkdown, safeToMarkdown } from "./to-markdown";

/* Convert MdAstDocument to and from JSON */
export { toJson, fromJson, safeFromJson } from "./json";
export { reuseIds } from "./reuse-ids";
