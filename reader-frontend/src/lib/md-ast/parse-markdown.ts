import { MdAstError, type MdAstDocument, type ParseOptions, type ParseResult } from "./types";
import { processor } from "./internal/processor";
import { extractFrontmatter } from "./internal/frontmatter";
import { buildBlocks } from "./internal/blocks";

/** Parses a markdown string into an MdAstDocument. Throws MdAstError on failure. */
export function parseMarkdown(source: string, options?: ParseOptions): MdAstDocument {
    const generateId = options?.generateId ?? (() => crypto.randomUUID());

    let tree: ReturnType<typeof processor.parse>;
    try {
        tree = processor.parse(source);
    } catch (error) {
        throw new MdAstError("Failed to parse markdown", { cause: error });
    }

    return {
        frontmatter: extractFrontmatter(tree),
        blocks: buildBlocks(tree, source, generateId),
    };
}

/** Non-throwing variant — returns { ok: true, data } on success or { ok: false, error } on failure. */
export function safeParseMarkdown(source: string, options?: ParseOptions): ParseResult {
    try {
        return { ok: true, data: parseMarkdown(source, options) };
    } catch (error) {
        return { ok: false, error: error as MdAstError };
    }
}
