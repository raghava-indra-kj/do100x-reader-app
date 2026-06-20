/** YAML frontmatter as a plain key-value object. */
export type MdAstFrontmatter = Record<string, unknown>;

/** Heading depth. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Fields every block carries regardless of type. */
interface BlockBase {
    id: string;
    markdown: string;
}

export interface HeadingBlock extends BlockBase {
    type: "heading";
    level: HeadingLevel;
}

export interface UnknownBlock extends BlockBase {
    type: "unknown";
    nodeType: string;
}

/** Union of every possible block. Discriminated by the `type` field. */
export type Block = HeadingBlock | UnknownBlock;

/** The string value of a block's `type` field. */
export type BlockType = Block["type"];

/** A fully parsed document. */
export interface MdAstDocument {
    frontmatter: MdAstFrontmatter | null;
    blocks: Block[];
}

/** Options accepted by parseMarkdown. */
export interface ParseOptions {
    generateId?: () => string;
}

/** Error thrown or wrapped by every md-ast operation. */
export class MdAstError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "MdAstError";
        Object.setPrototypeOf(this, MdAstError.prototype);
    }
}

/** Returned when parsing or fromJson succeeds. */
export type ParseOk = { ok: true; data: MdAstDocument };

/** Returned when any operation fails. */
export type ParseErr = { ok: false; error: MdAstError };

/** Result type for safeParseMarkdown and safeFromJson. */
export type ParseResult = ParseOk | ParseErr;

/** Returned when toMarkdown succeeds. */
export type SerializeOk = { ok: true; data: string };

/** Result type for safeToMarkdown. */
export type SerializeResult = SerializeOk | ParseErr;
