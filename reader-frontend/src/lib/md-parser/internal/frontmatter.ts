import { load, dump, JSON_SCHEMA } from "js-yaml";
import type { Root } from "mdast";
import { MdParseError, type MdFrontmatter } from "../types";

/** mdast yaml node shape from remark-frontmatter */
type YamlNode = { type: "yaml"; value: string; position?: { end: { offset?: number } } };

/**
 * Finds the yaml frontmatter node in the remark AST root, or returns null.
 * remark-frontmatter places it as the first child with type "yaml" when a `---` block is present.
 */
function findYaml(tree: Root): YamlNode | null {
    const node = tree.children.find((c) => (c as { type: string }).type === "yaml");
    return (node as YamlNode | undefined) ?? null;
}

/**
 * Parses the YAML frontmatter block from the remark AST into a plain object.
 * Returns null if no frontmatter block is present or the block is empty.
 * Throws MdParseError if the YAML is malformed or not a key-value mapping.
 *
 * Uses JSON_SCHEMA to prevent type coercion surprises — dates stay as strings,
 * no implicit booleans like `yes` / `no`, values stay JSON-safe.
 *
 * Example:
 * ```yaml
 * ---
 * title: My Post
 * tags: [a, b]
 * ---
 * ```
 * → `{ title: "My Post", tags: ["a", "b"] }`
 */
export function extractFrontmatter(tree: Root): MdFrontmatter | null {
    const node = findYaml(tree);
    if (!node || !node.value.trim()) return null;

    let parsed: unknown;
    try {
        parsed = load(node.value, { schema: JSON_SCHEMA });
    } catch (error) {
        throw new MdParseError("Invalid YAML in front matter", { cause: error });
    }

    if (parsed == null) return null;
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
        const kind = Array.isArray(parsed) ? "array" : typeof parsed;
        throw new MdParseError(`Front matter must be a mapping, got ${kind}`);
    }
    return parsed as MdFrontmatter;
}

/**
 * Returns the byte offset in the source string where the document body begins.
 * This is the position immediately after the closing `---` of the frontmatter block.
 * Returns 0 if no frontmatter is present, meaning the body starts at the beginning.
 *
 * Example: for a source with a 20-byte frontmatter block → returns 20.
 */
export function bodyStartOffset(tree: Root): number {
    return findYaml(tree)?.position?.end?.offset ?? 0;
}

/**
 * Serializes a frontmatter object back into a `--- ... ---` YAML block string.
 * Returns an empty string if frontmatter is null or an empty object.
 * Throws MdParseError if the value is not a plain object (e.g. an array).
 *
 * Uses JSON_SCHEMA and lineWidth -1 to prevent line-wrapping in the output.
 *
 * Example: `{ title: "My Post", tags: ["a", "b"] }`
 * →
 * ```
 * ---
 * title: My Post
 * tags:
 *   - a
 *   - b
 * ---
 * ```
 */
export function dumpFrontmatter(frontmatter: unknown): string {
    if (frontmatter == null) return "";
    if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
        throw new MdParseError("Front matter must be an object to serialize");
    }
    if (Object.keys(frontmatter).length === 0) return "";

    let body: string;
    try {
        body = dump(frontmatter, { schema: JSON_SCHEMA, lineWidth: -1 }).trimEnd();
    } catch (error) {
        throw new MdParseError("Front matter contains values that cannot be serialized to YAML", { cause: error });
    }
    return `---\n${body}\n---`;
}
