import { createDocument, type MarkdownBlock, type MarkdownDocument } from './document';
import { editAnnotatedDocument, validateAnchor, type AnnotationAnchor } from './annotations';
import { MdAstError } from './types';

function fail(message: string): never { throw new MdAstError({ message }); }
function selection(document: MarkdownDocument, blockIds: readonly string[], beforeId: string | null) {
    const ids = new Set(blockIds);
    const blocks = document.blocks.filter(block => ids.has(block.id));
    if (!ids.size || ids.size !== blockIds.length || blocks.length !== ids.size) fail('Select existing blocks once each.');
    if (blocks.some(block => block.kind === 'yaml')) fail('Front matter must stay at the beginning of the document.');
    const before = beforeId === null ? null : document.blocks.find(block => block.id === beforeId);
    if (before === undefined) fail('The destination block no longer exists.');
    if (before?.kind === 'yaml') fail('Content cannot be placed before front matter.');
    return { ids, blocks, before };
}
function sameStructure(actual: readonly MarkdownBlock[], expected: readonly MarkdownBlock[]) {
    return actual.length === expected.length && actual.every((block, index) => block.kind === expected[index].kind && block.source === expected[index].source);
}

/** Move top-level source blocks by identity, including indistinguishable duplicates.
 * Separators retain their original slots; no source text is normalized. Reject a
 * move that changes Markdown structure (for example moving an unclosed fence). */
export function moveAnnotatedBlocks(document: MarkdownDocument, blockIds: readonly string[], beforeId: string | null, anchors: readonly AnnotationAnchor[]) {
    const { ids, blocks } = selection(document, blockIds, beforeId);
    const checked = anchors.map(anchor => validateAnchor(document, anchor));
    if (beforeId !== null && ids.has(beforeId)) fail('Choose a destination outside the selected blocks.');
    const order = document.blocks.filter(block => !ids.has(block.id));
    order.splice(beforeId === null ? order.length : order.findIndex(block => block.id === beforeId), 0, ...blocks);
    if (order.every((block, index) => block.id === document.blocks[index].id)) return { document, anchors: checked };
    let source = document.source.slice(0, document.blocks[0].start);
    for (let index = 0; index < order.length; index++) {
        const old = document.blocks[index];
        source += order[index].source + document.source.slice(old.end, document.blocks[index + 1]?.start ?? document.source.length);
    }
    const next = createDocument(source);
    if (!sameStructure(next.blocks, order)) fail('This move would change Markdown block boundaries. Close open syntax or edit the source explicitly.');
    next.blocks.forEach((block, index) => { block.id = order[index].id; });
    const positions = new Map(next.blocks.map(block => [block.id, block.start]));
    return { document: next, anchors: checked.map(anchor => validateAnchor(next, { ...anchor,
        segments: [...anchor.segments].sort((a, b) => positions.get(a.blockId)! + a.start - positions.get(b.blockId)! - b.start),
    })) };
}

/** Copy source into fresh blocks. Existing attachments stay on their originals;
 * discussions are never cloned implicitly. `beforeId: null` appends at the end. */
export function copyAnnotatedBlocks(document: MarkdownDocument, blockIds: readonly string[], beforeId: string | null, anchors: readonly AnnotationAnchor[]) {
    const { blocks, before } = selection(document, blockIds, beforeId);
    const newline = document.source.includes('\r\n') ? '\r\n' : '\n';
    const separator = newline + newline;
    const at = before?.start ?? document.source.length;
    const text = blocks.map(block => block.source).join(separator);
    const insert = before ? text + separator : separator + text;
    const result = editAnnotatedDocument(document, [{ start: at, end: at, expected: '', insert }], anchors);
    const order = [...document.blocks];
    order.splice(before ? order.indexOf(before) : order.length, 0, ...blocks);
    if (!sameStructure(result.document.blocks, order)) fail('This copy would change Markdown block boundaries. Close open syntax or edit the source explicitly.');
    return result;
}
