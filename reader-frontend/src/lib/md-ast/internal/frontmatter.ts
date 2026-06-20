import { load, dump, JSON_SCHEMA } from "js-yaml";
import type { Root } from "mdast";
import { MdAstError, type MdAstFrontmatter } from "../types";

/** Shape of the yaml node that remark-frontmatter adds to the mdast root. */
type YamlNode = { type: "yaml"; value: string };

/** Finds the yaml frontmatter node in the mdast root, or returns null if there is none. */
function findYaml(tree: Root): YamlNode | null {
    const node = tree.children.find((c) => (c as { type: string }).type === "yaml");
    return (node as YamlNode | undefined) ?? null;
}

/**
 * Parses the YAML frontmatter node into a plain object.
 * Returns null if absent or empty. Throws MdAstError if the YAML is invalid or not a mapping.
 */
export function extractFrontmatter(tree: Root): MdAstFrontmatter | null {
    const node = findYaml(tree);
    if (!node || !node.value.trim()) return null;

    let parsed: unknown;
    try {
        parsed = load(node.value, { schema: JSON_SCHEMA });
    } catch (error) {
        throw new MdAstError("Invalid YAML in front matter", { cause: error });
    }

    if (parsed == null) return null;
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
        const kind = Array.isArray(parsed) ? "array" : typeof parsed;
        throw new MdAstError(`Front matter must be a mapping, got ${kind}`);
    }
    return parsed as MdAstFrontmatter;
}

/**
 * Serializes a frontmatter object into a `--- ... ---` YAML block string.
 * Returns an empty string if frontmatter is null or empty. Throws MdAstError if it cannot be serialized.
 */
export function dumpFrontmatter(frontmatter: unknown): string {
    if (frontmatter == null) return "";
    if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
        throw new MdAstError("Front matter must be an object to serialize");
    }
    if (Object.keys(frontmatter).length === 0) return "";

    let body: string;
    try {
        body = dump(frontmatter, { schema: JSON_SCHEMA, lineWidth: -1 }).trimEnd();
    } catch (error) {
        throw new MdAstError("Front matter contains values that cannot be serialized to YAML", { cause: error });
    }
    return `---\n${body}\n---`;
}
