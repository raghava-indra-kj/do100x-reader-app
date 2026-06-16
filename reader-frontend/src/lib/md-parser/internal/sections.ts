import { toString } from "mdast-util-to-string";
import type { Root, Heading } from "mdast";
import type { MdSection } from "../types";

/** A child node of the remark root */
type AstNode = Root["children"][number];

/**
 * Extracts plain text from a heading node by collapsing all inline nodes.
 * Inline markdown is stripped — bold, italic, code, links all become plain text.
 *
 * Example: `## My **Bold** _Heading_` → `"My Bold Heading"`
 */
function headingTitle(node: Heading): string {
    return toString(node);
}

/**
 * Extracts the raw markdown text of a heading, preserving inline formatting.
 * Slices the source span of the heading's inline children — not the whole node —
 * so that ATX markers (`##`), ATX closing sequences (`## Title ##`), and Setext
 * underlines (`===` / `---`) are all excluded without any string surgery.
 *
 * Example: `## My **Bold** _Heading_` → `"My **Bold** _Heading_"`
 * Example: `Title\n=====` (Setext)      → `"Title"`
 * Example: `## Title ##`               → `"Title"`
 *
 * Falls back to plain text when the heading has no children or they lack positions
 * (e.g. an empty `##` heading, or synthetically constructed nodes).
 */
function headingRawTitle(node: Heading, source: string): string {
    const kids = node.children;
    if (kids.length === 0) return toString(node);
    const start = kids[0].position?.start.offset;
    const end = kids[kids.length - 1].position?.end.offset;
    if (start == null || end == null) return toString(node);
    return source.slice(start, end);
}

/**
 * Slices the source string from the start of the first node to the end of the last node.
 * Returns null if the span is empty or all whitespace — never returns an empty string.
 *
 * Example: nodes covering `"Some text\n\nMore text"` → `"Some text\n\nMore text"`
 */
function sliceContent(nodes: AstNode[], source: string): string | null {
    if (nodes.length === 0) return null;
    const start = nodes[0].position?.start.offset;
    const end = nodes[nodes.length - 1].position?.end.offset;
    if (start == null || end == null) return null;
    const text = source.slice(start, end).trim();
    return text || null;
}

/**
 * Creates a synthetic preamble section for content that appears before the first heading.
 * Has level 0 and null title/rawTitle to distinguish it from real heading-based sections.
 *
 * Example: a markdown file that starts with a paragraph before any `#` heading.
 */
function makePreamble(nodes: AstNode[], source: string): MdSection {
    return {
        id: crypto.randomUUID(),
        title: null,
        rawTitle: null,
        level: 0,
        content: sliceContent(nodes, source),
        children: [],
    };
}

/**
 * Builds a nested section tree from the remark AST and original source string.
 *
 * Every heading becomes an MdSection. Sub-headings nest as children.
 * Content between two headings belongs to the earlier heading's section.
 * Content before the first heading becomes a preamble section (level 0, title null).
 *
 * The nesting is managed with a stack. When a new heading arrives:
 *  1. Flush the buffered content nodes to the current section.
 *  2. Pop the stack until the top has a lower level than the new heading.
 *  3. Attach the new section as a child of the new stack top (or as a root if stack is empty).
 *
 * Example input:
 * ```
 * ## Intro          → root section (level 2)
 * ### Details       → child of Intro (level 3)
 * ## Conclusion     → root section (level 2)
 * ```
 * Result: `[Intro(children:[Details]), Conclusion]`
 */
export function buildSections(tree: Root, source: string): MdSection[] {
    const roots: MdSection[] = [];
    const stack: MdSection[] = [];
    let buffer: AstNode[] = [];

    for (const node of tree.children) {
        if ((node as { type: string }).type === "yaml") continue;

        if (node.type !== "heading") {
            buffer.push(node);
            continue;
        }

        const heading = node as Heading;

        // flush buffer to preamble or current section
        if (stack.length === 0) {
            if (buffer.length > 0) roots.push(makePreamble(buffer, source));
        } else {
            stack[stack.length - 1].content = sliceContent(buffer, source);
        }
        buffer = [];

        // pop until we find a parent with lower level
        while (stack.length > 0 && stack[stack.length - 1].level >= heading.depth) {
            stack.pop();
        }

        const section: MdSection = {
            id: crypto.randomUUID(),
            title: headingTitle(heading),
            rawTitle: headingRawTitle(heading, source),
            level: heading.depth,
            content: null,
            children: [],
        };

        if (stack.length === 0) roots.push(section);
        else stack[stack.length - 1].children.push(section);

        stack.push(section);
    }

    // flush any trailing content after the last heading
    if (buffer.length > 0) {
        if (stack.length === 0) roots.push(makePreamble(buffer, source));
        else stack[stack.length - 1].content = sliceContent(buffer, source);
    }

    return roots;
}
