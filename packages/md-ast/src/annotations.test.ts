import { describe, expect, it } from 'vitest';
import { createDocument, reconcileDocument } from './document';
import { createBlocksAnchor, createTextAnchor, editAnnotatedDocument, reconcileAnchor, validateAnchor } from './annotations';

describe('text and block annotation transactions', () => {
    const setup = () => {
        const document = createDocument('# Title\n\nA blue bird flies.\n\nSecond paragraph.');
        const start = document.source.indexOf('blue'), end = document.source.indexOf(' flies');
        return { document, start, end, anchor: createTextAnchor(document, { start, end }) };
    };
    const selected = (result: ReturnType<typeof editAnnotatedDocument>) => result.anchors[0].segments.map(segment => result.document.blocks.find(b => b.id === segment.blockId)!.source.slice(segment.start, segment.end)).join('|');
    it('follows insertions before a range, excluding text inserted exactly at its edges', () => {
        for (const edge of ['before', 'start', 'end'] as const) {
            const { document, start, end, anchor } = setup();
            const at = edge === 'before' ? 0 : edge === 'start' ? start : end;
            const result = editAnnotatedDocument(document, [{ start: at, end: at, expected: '', insert: edge === 'before' ? '# New\n\n' : 'new ' }], [anchor]);
            expect(selected(result)).toBe('blue bird');
            expect(result.anchors[0].status).toBe('attached');
        }
    });
    it('keeps a word correction inside the selection while retaining the original quote', () => {
        const { document, start, anchor } = setup();
        const result = editAnnotatedDocument(document, [{ start, end: start + 4, expected: 'blue', insert: 'green' }], [anchor]);
        expect(selected(result)).toBe('green bird');
        expect(result.anchors[0]).toMatchObject({ quote: 'blue bird', status: 'changed' });
    });
    it('shrinks a partially deleted target', () => {
        const { document, start, anchor } = setup();
        const result = editAnnotatedDocument(document, [{ start, end: start + 5, expected: 'blue ', insert: '' }], [anchor]);
        expect(selected(result)).toBe('bird');
        expect(result.anchors[0].status).toBe('partial');
    });
    it('never attaches a completely replaced sentence to unrelated replacement text', () => {
        const { document, start, end, anchor } = setup();
        const result = editAnnotatedDocument(document, [{ start, end, expected: 'blue bird', insert: 'red car' }], [anchor]);
        expect(result.anchors[0]).toMatchObject({ segments: [], status: 'ambiguous', quote: 'blue bird' });
        expect(validateAnchor(result.document, result.anchors[0])).toEqual(result.anchors[0]);
    });
    it('keeps a whole-block comment when that block is intentionally rewritten', () => {
        const { document } = setup(), block = document.blocks[1];
        const anchor = createBlocksAnchor(document, [block.id]);
        const result = editAnnotatedDocument(document, [{ start: block.start, end: block.end, expected: block.source, insert: 'A revised explanation.' }], [anchor]);
        expect(selected(result)).toBe('A revised explanation.');
        expect(result.anchors[0].status).toBe('changed');
    });
    it('keeps one comment across a paragraph split and join', () => {
        const document = createDocument('Alpha beta gamma');
        const anchor = createTextAnchor(document, { start: 0, end: document.source.length });
        const split = editAnnotatedDocument(document, [{ start: 6, end: 6, expected: '', insert: '\n\n' }], [anchor]);
        expect(split.anchors[0].segments).toHaveLength(2);
        const joined = editAnnotatedDocument(split.document, [{ start: 6, end: 8, expected: '\n\n', insert: '' }], split.anchors);
        expect(selected(joined)).toBe(document.source);
        expect(joined.anchors[0].segments).toHaveLength(1);
    });
    it('keeps remaining blocks after deleting part of a multi-block selection', () => {
        const document = createDocument('First\n\nSecond\n\nThird');
        const anchor = createTextAnchor(document, { start: 0, end: document.source.length });
        const result = editAnnotatedDocument(document, [{ start: 0, end: 7, expected: 'First\n\n', insert: '' }], [anchor]);
        expect(selected(result)).toBe('Second|Third');
        expect(result.anchors[0].status).toBe('partial');
    });
    it('marks duplicate content ambiguous after an external rewrite', () => {
        const document = createDocument('Same\n\nSame');
        const anchor = createTextAnchor(document, { start: 0, end: 4 });
        const next = reconcileDocument(document, 'New\n\nSame\n\nSame');
        expect(reconcileAnchor(document, next, anchor).status).toBe('ambiguous');
    });
    it('handles emoji, combining characters and CRLF without changing surrounding source', () => {
        const document = createDocument('😀 café\r\n\r\nTail');
        const anchor = createTextAnchor(document, { start: 3, end: 8 });
        const result = editAnnotatedDocument(document, [{ start: 0, end: 2, expected: '😀', insert: '🌳🌳' }], [anchor]);
        expect(selected(result)).toBe('café');
        expect(result.document.source).toBe('🌳🌳 café\r\n\r\nTail');
    });
    it('rejects stale text and invalid target IDs before writing', () => {
        const { document, anchor } = setup();
        expect(() => editAnnotatedDocument(document, [{ start: 0, end: 1, expected: 'stale', insert: '' }], [anchor])).toThrow();
        expect(() => validateAnchor(document, { ...anchor, segments: [{ blockId: 'missing', start: 0, end: 1 }] })).toThrow();
    });
    it('distinguishes fully removed content from replacement content', () => {
        const { document, start, end, anchor } = setup();
        const result = editAnnotatedDocument(document, [{ start, end, expected: 'blue bird', insert: '' }], [anchor]);
        expect(result.anchors[0]).toMatchObject({ segments: [], status: 'source-removed', quote: 'blue bird' });
        expect(validateAnchor(result.document, result.anchors[0])).toEqual(result.anchors[0]);
    });
    it('rejects reversed multi-block targets and partial ranges pretending to be block comments', () => {
        const { document } = setup();
        const anchor = createBlocksAnchor(document, [document.blocks[0].id, document.blocks[1].id]);
        expect(() => validateAnchor(document, { ...anchor, segments: [...anchor.segments].reverse() })).toThrow('ordered');
        expect(() => validateAnchor(document, { ...anchor, segments: [{ ...anchor.segments[0], start: 1 }] })).toThrow('complete blocks');
        expect(() => validateAnchor(document, { ...anchor, status: 'source-removed' })).toThrow('active targets');
    });
    it('does not expand a block comment into unrelated text after a merge', () => {
        const document = createDocument('First\n\nSecond');
        const anchor = createBlocksAnchor(document, [document.blocks[1].id]);
        const merged = editAnnotatedDocument(document, [{ start: 5, end: 7, expected: '\n\n', insert: ' ' }], [anchor]);
        expect(selected(merged)).toBe('Second');
        expect(merged.anchors[0].kind).toBe('text');
        expect(validateAnchor(merged.document, merged.anchors[0])).toEqual(merged.anchors[0]);
        const revised = editAnnotatedDocument(merged.document, [{ start: 0, end: 5, expected: 'First', insert: 'Other' }], merged.anchors);
        expect(selected(revised)).toBe('Second');
    });
});
