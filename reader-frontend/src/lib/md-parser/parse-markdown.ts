import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MdParseError, type MdDocument, type ParseResult } from "./types";
import { extractFrontmatter } from "./internal/frontmatter";
import { buildSections } from "./internal/sections";

/**
 * Reader Markdown parser. Its syntax profile intentionally mirrors
 * @reader/md-ast and the rendering pipeline: CommonMark, YAML frontmatter,
 * GitHub Flavored Markdown, and inline/display math.
 * Created once at module level — safe to reuse across calls since parse() is stateless.
 */
const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).use(remarkMath);

/**
 * Parses a markdown string into a structured MdDocument.
 * Extracts YAML frontmatter and builds a nested section tree from headings.
 * Throws MdParseError if the source cannot be parsed or frontmatter is malformed.
 *
 * Example:
 * ```
 * parseMarkdown(`
 * ---
 * title: My Post
 * ---
 * ## Intro
 * Hello world.
 * `)
 * ```
 * →
 * ```json
 * {
 *   "frontmatter": { "title": "My Post" },
 *   "sections": [{ "title": "Intro", "level": 2, "content": "Hello world.", ... }]
 * }
 * ```
 */
export function parseMarkdown(source: string): MdDocument {
    let tree;
    try {
        tree = processor.parse(source);
    } catch (error) {
        throw new MdParseError("Failed to parse markdown", { cause: error });
    }

    return {
        frontmatter: extractFrontmatter(tree),
        sections: buildSections(tree, source),
    };
}

/**
 * Safe variant of parseMarkdown — never throws.
 * Returns `{ ok: true, data }` on success or `{ ok: false, error }` on failure.
 * Use this when the input is untrusted and you want to handle errors without try/catch.
 *
 * Example:
 * ```
 * const result = safeParseMarkdown(source);
 * if (result.ok) console.log(result.data.sections);
 * else console.error(result.error.message);
 * ```
 */
export function safeParseMarkdown(source: string): ParseResult {
    try {
        return { ok: true, data: parseMarkdown(source) };
    } catch (error) {
        return { ok: false, error: error as MdParseError };
    }
}
