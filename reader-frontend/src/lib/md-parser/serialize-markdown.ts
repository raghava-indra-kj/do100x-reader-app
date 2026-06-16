import { MdParseError, type MdDocument, type MdSection, type SerializeResult } from "./types";
import { dumpFrontmatter } from "./internal/frontmatter";

/**
 * Serializes a single section back into markdown text.
 * Recursively serializes children after the section's own content.
 *
 * - Preamble sections (level 0) emit only their content — no heading line.
 * - Heading sections emit `## rawTitle` (falling back to plain title if rawTitle is null).
 * - Null content is skipped — no blank line is emitted for empty sections.
 *
 * Example:
 * ```
 * { level: 2, rawTitle: "My **Bold** Section", content: "Body text.", children: [] }
 * ```
 * → `"## My **Bold** Section\n\nBody text."`
 */
function serializeSection(section: MdSection): string {
    const parts: string[] = [];

    if (section.level > 0) {
        const marker = "#".repeat(section.level);
        const heading = section.rawTitle ?? section.title ?? "";
        parts.push(`${marker} ${heading}`);
    }

    if (section.content != null) {
        parts.push(section.content);
    }

    for (const child of section.children) {
        const serialized = serializeSection(child);
        if (serialized) parts.push(serialized);
    }

    return parts.join("\n\n");
}

/**
 * Serializes an MdDocument back into a markdown string.
 * This is the inverse of parseMarkdown — the round-trip is semantically faithful,
 * not byte-identical: heading style normalizes to ATX (`##`), frontmatter YAML
 * formatting may reflow, and blank-line counts between sections collapse to one.
 *
 * Throws MdParseError if the frontmatter cannot be serialized to YAML.
 * Use safeSerializeMarkdown to avoid try/catch.
 *
 * Example:
 * ```
 * serializeMarkdown({
 *   frontmatter: { title: "My Post" },
 *   sections: [{ level: 2, rawTitle: "Intro", content: "Hello.", children: [] }]
 * })
 * ```
 * →
 * ```
 * ---
 * title: My Post
 * ---
 *
 * ## Intro
 *
 * Hello.
 * ```
 */
export function serializeMarkdown(doc: MdDocument): string {
    const parts: string[] = [];

    const fm = dumpFrontmatter(doc.frontmatter);
    if (fm) parts.push(fm);

    for (const section of doc.sections) {
        const serialized = serializeSection(section);
        if (serialized) parts.push(serialized);
    }

    return parts.join("\n\n") + "\n";
}

/**
 * Safe variant of serializeMarkdown — never throws.
 * Returns `{ ok: true, data }` on success or `{ ok: false, error }` on failure.
 * Serialization can fail when frontmatter holds values YAML cannot represent.
 *
 * Example:
 * ```
 * const result = safeSerializeMarkdown(doc);
 * if (result.ok) write(result.data);
 * else console.error(result.error.message);
 * ```
 */
export function safeSerializeMarkdown(doc: MdDocument): SerializeResult {
    try {
        return { ok: true, data: serializeMarkdown(doc) };
    } catch (error) {
        return { ok: false, error: error as MdParseError };
    }
}
