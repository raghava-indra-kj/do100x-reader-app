import type { Root, Heading, RootContent } from "mdast";
import type { Block, HeadingLevel } from "../types";

/** Returns the exact source text of a node by slicing the original markdown using mdast position offsets. */
function sliceRaw({ node, source }: { node: RootContent; source: string }): string {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start == null || end == null) return "";
    return source.slice(start, end).trimEnd();
}

/** Converts one mdast node into a Block. Headings get their level; everything else becomes an UnknownBlock. */
export function toBlock({ node, source, id }: { node: RootContent; source: string; id: string }): Block {
    const markdown = sliceRaw({ node, source });

    if (node.type === "heading") {
        const heading = node as Heading;
        return { id, type: "heading", level: heading.depth as HeadingLevel, markdown };
    }

    return { id, type: "unknown", nodeType: node.type, markdown };
}

/** Walks the mdast root and returns one Block per top-level node, skipping the frontmatter node and any node with no position data. */
export function buildBlocks({ tree, source, generateId }: { tree: Root; source: string; generateId: () => string }): Block[] {
    const blocks: Block[] = [];
    for (const node of tree.children) {
        if ((node as { type: string }).type === "yaml") continue;
        const block = toBlock({ node, source, id: generateId() });
        if (block.markdown.length === 0) continue;
        blocks.push(block);
    }
    return blocks;
}
