import type { Block, MdAstDocument } from "./types";

/** Produces a string key that uniquely identifies a block by its type and exact content. */
function blockKey(block: Block): string {
    return `${block.type} ${block.markdown}`;
}

/**
 * Carries ids from a previous document onto a freshly parsed one.
 * Blocks with the same type and markdown keep their old id; changed blocks get a fresh id.
 * Returns a new document — neither input is mutated.
 */
export function reuseIds(previous: MdAstDocument, next: MdAstDocument): MdAstDocument {
    const buckets = new Map<string, string[]>();
    for (const block of previous.blocks) {
        const key = blockKey(block);
        const ids = buckets.get(key);
        if (ids) ids.push(block.id);
        else buckets.set(key, [block.id]);
    }

    const blocks = next.blocks.map((block): Block => {
        const ids = buckets.get(blockKey(block));
        const reused = ids?.shift();
        return reused ? { ...block, id: reused } : block;
    });

    return { ...next, blocks };
}
