import { describe, expect, it } from 'vitest';
import { createDocument, hydrateDocument } from './document';
import { createBlocksAnchor, createTextAnchor, validateAnchor } from './annotations';
import { moveAnnotatedBlocks, copyAnnotatedBlocks } from './block-operations';

describe('explicit block operations', () => {
    it('moves the chosen duplicate and both comments keep their actual identity', () => {
        const original = createDocument('Same paragraph\n\nMiddle\n\nSame paragraph');
        const [first, middle, last] = original.blocks;
        const anchors = [createTextAnchor(original, { start:first.start, end:first.end }), createBlocksAnchor(original, [last.id])];
        const result = moveAnnotatedBlocks(original, [last.id], first.id, anchors);
        expect(result.document.source).toBe('Same paragraph\n\nSame paragraph\n\nMiddle');
        expect(result.document.blocks.map(block => block.id)).toEqual([last.id, first.id, middle.id]);
        expect(result.anchors).toEqual(anchors);
        expect(hydrateDocument(result.document)).toEqual(result.document);
        expect(original.blocks[0].id).toBe(first.id);
    });
    it('moves a disjoint group in source order, preserving CRLF, math, code and original quotations', () => {
        const original = createDocument('# Title\r\n\r\nA paragraph\r\n\r\n$$\r\nE=mc^2\r\n$$\r\n\r\n```ts\r\nconst x = 1;\r\n```\r\n');
        const [heading, paragraph, math, code] = original.blocks;
        const anchor = createBlocksAnchor(original, [paragraph.id, math.id, code.id]);
        const result = moveAnnotatedBlocks(original, [code.id, paragraph.id], heading.id, [anchor]);
        expect(result.document.blocks.map(block => block.id)).toEqual([paragraph.id, code.id, heading.id, math.id]);
        expect(result.document.source).toBe(`${paragraph.source}\r\n\r\n${code.source}\r\n\r\n${heading.source}\r\n\r\n${math.source}\r\n`);
        expect(result.anchors[0].segments.map(segment => segment.blockId)).toEqual([paragraph.id, code.id, math.id]);
        expect(result.anchors[0].quote).toBe(anchor.quote);
        expect(validateAnchor(result.document, result.anchors[0])).toEqual(result.anchors[0]);
    });
    it('copies with new identities and keeps comments only on the original, before it and at EOF', () => {
        for (const append of [false, true]) {
            const original = createDocument('First\n\nSecond');
            const first = original.blocks[0];
            const anchor = createBlocksAnchor(original, [first.id]);
            const result = copyAnnotatedBlocks(original, [first.id], append ? null : first.id, [anchor]);
            expect(result.document.source).toBe(append ? 'First\n\nSecond\n\nFirst' : 'First\n\nFirst\n\nSecond');
            expect(result.document.blocks[append ? 0 : 1].id).toBe(first.id);
            expect(result.document.blocks[append ? 2 : 0].id).not.toBe(first.id);
            expect(result.anchors).toEqual([anchor]);
        }
    });
    it('rejects structurally unsafe moves/copies without changing the source', () => {
        const original = createDocument('Paragraph\n\n```ts\nconst x = 1;');
        const snapshot = JSON.stringify(original);
        expect(() => moveAnnotatedBlocks(original, [original.blocks[1].id], original.blocks[0].id, [])).toThrow(/block boundaries/);
        expect(() => copyAnnotatedBlocks(original, [original.blocks[1].id], original.blocks[0].id, [])).toThrow(/block boundaries/);
        expect(JSON.stringify(original)).toBe(snapshot);
    });
    it('keeps front matter fixed and rejects missing or duplicated IDs', () => {
        const original = createDocument('---\ntitle: Doc\n---\n\nText\n\nTail');
        const [yaml, text, tail] = original.blocks;
        expect(() => moveAnnotatedBlocks(original, [yaml.id], null, [])).toThrow(/Front matter/);
        expect(() => moveAnnotatedBlocks(original, [tail.id], yaml.id, [])).toThrow(/front matter/);
        expect(() => copyAnnotatedBlocks(original, ['missing'], null, [])).toThrow(/existing blocks/);
        expect(() => moveAnnotatedBlocks(original, [text.id, text.id], null, [])).toThrow(/once each/);
        expect(() => moveAnnotatedBlocks(original, [text.id], text.id, [])).toThrow(/outside/);
        expect(() => moveAnnotatedBlocks(original, [text.id], 'missing', [])).toThrow(/destination/);
        expect(moveAnnotatedBlocks(original, [tail.id], null, []).document).toBe(original);
    });
});
