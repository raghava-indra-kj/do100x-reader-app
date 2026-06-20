import { MdAstError, type MdAstDocument, type SerializeResult } from "./types";
import { dumpFrontmatter } from "./internal/frontmatter";

/**
 * Serializes an MdAstDocument back to a markdown string by joining each block's verbatim source.
 * Throws MdAstError if the frontmatter cannot be dumped to YAML.
 */
export function toMarkdown(doc: MdAstDocument): string {
    const parts: string[] = [];

    const fm = dumpFrontmatter(doc.frontmatter);
    if (fm) parts.push(fm);

    for (const block of doc.blocks) {
        if (block.markdown) parts.push(block.markdown);
    }

    return parts.join("\n\n") + "\n";
}

/** Non-throwing variant — returns { ok: true, data } on success or { ok: false, error } on failure. */
export function safeToMarkdown(doc: MdAstDocument): SerializeResult {
    try {
        return { ok: true, data: toMarkdown(doc) };
    } catch (error) {
        return { ok: false, error: error as MdAstError };
    }
}
