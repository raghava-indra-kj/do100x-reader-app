/** Front matter */
export type MdFrontmatter = Record<string, unknown>;

/** A document section */
export interface MdSection {
    id: string;
    title: string | null;
    rawTitle: string | null;
    level: number;
    content: string | null;
    children: MdSection[];
}

/** Parsed document */
export interface MdDocument {
    frontmatter: MdFrontmatter | null;
    sections: MdSection[];
}

/** Successful parse result */
export type ParseOk = { ok: true; data: MdDocument };

/** Failed parse result */
export type ParseErr = { ok: false; error: MdParseError };

/** Result returned by safeParseMarkdown */
export type ParseResult = ParseOk | ParseErr;

/** Successful serialize result */
export type SerializeOk = { ok: true; data: string };

/** Result returned by safeSerializeMarkdown */
export type SerializeResult = SerializeOk | ParseErr;

/** Parse or serialize error */
export class MdParseError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "MdParseError";
        Object.setPrototypeOf(this, MdParseError.prototype);
    }
}
