import type { Root, RootContent, Element } from 'hast';
import type { MarkdownDocument, SourceRange } from '@reader/md-ast';

/** Runs after sanitization: imported HTML cannot forge source IDs or application anchors. */
export function sourceBlocks(options: { document: MarkdownDocument; range?: SourceRange }) {
    return (tree: Root) => {
        const { document, range } = options;
        const children: RootContent[] = [];
        const findBlock = (offset: number) => {
            let low = 0, high = document.blocks.length - 1;
            while (low <= high) {
                const middle = (low + high) >>> 1;
                const block = document.blocks[middle];
                if (offset < block.start) high = middle - 1;
                else if (offset >= block.end) low = middle + 1;
                else return block;
            }
            return undefined;
        };
        for (const child of tree.children) {
            const offset = child.position?.start.offset;
            const block = offset === undefined ? undefined : findBlock(offset);
            if (range && block && (block.end <= range.start || block.start >= range.end)) continue;
            if (!block || child.type !== 'element') { children.push(child); continue; }
            const previous = children[children.length - 1];
            if (previous?.type === 'element' && previous.properties.dataMdBlockId === block.id) previous.children.push(child);
            else children.push({ type: 'element', tagName: 'div', properties: {
                className: ['md-source-block'], dataMdBlockId: block.id, dataMdSourceStart: block.start, dataMdSourceEnd: block.end,
            }, children: [child] } as Element);
        }
        tree.children = children;
    };
}
