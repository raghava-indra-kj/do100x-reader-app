import { describe, expect, it } from 'vitest';
import { createDocument, documentFromMetadata, documentMetadata } from './document';
import { createBlocksAnchor, createTextAnchor, editAnnotatedDocument, validateAnchor } from './annotations';
import { replaceAnnotatedSource, sourceReplacementEdits } from './source-replacement';

const selected = (source: string, text: string) => {
    const document = createDocument(source);
    return { document, anchor: createTextAnchor(document, { start: source.indexOf(text), end: source.indexOf(text) + text.length }) };
};
function target(result: ReturnType<typeof replaceAnnotatedSource>, index = 0) {
    return result.anchors[index].segments.map(part => result.document.blocks.find(block => block.id === part.blockId)!.source.slice(part.start, part.end)).join('|');
}

describe('compact document persistence', () => {
    it('round trips IDs without storing source twice', () => {
        const document = createDocument('---\r\ntitle: Test\r\n---\r\n\r\n# 😀\r\n\r\n$x^2$\r\n');
        const metadata = documentMetadata(document);
        expect(documentFromMetadata(document.source, JSON.parse(JSON.stringify(metadata)))).toEqual(document);
        expect(JSON.stringify(metadata)).not.toContain('title: Test');
    });
    it('rejects malformed, duplicated and structurally stale metadata', () => {
        const document = createDocument('# Title\n\nText');
        expect(() => documentFromMetadata(document.source, {})).toThrow();
        const metadata = documentMetadata(document);
        metadata.blocks[1].id = metadata.blocks[0].id;
        expect(() => documentFromMetadata(document.source, metadata)).toThrow();
        expect(() => documentFromMetadata('# Title\n\nLonger text', documentMetadata(document))).toThrow();
    });
});

describe('whole-source editing', () => {
    it('distinguishes a proven character correction from replacing an entire selected word', () => {
        const f = selected('Fix this anotation here.', 'anotation');
        const source = f.document.source.replace('anotation', 'annotation');
        expect(replaceAnnotatedSource(f.document, source, [f.anchor]).anchors[0]).toMatchObject({ status: 'ambiguous', segments: [] });
        const at = f.document.source.indexOf('anotation') + 2;
        const precise = editAnnotatedDocument(f.document, [{ start: at, end: at, expected: '', insert: 'n' }], [f.anchor]);
        expect(precise.document.source).toBe(source);
        expect(target(precise)).toBe('annotation');
        expect(precise.anchors[0]).toMatchObject({ status: 'changed', quote: 'anotation' });
    });
    it('keeps a sentence through a one-word correction and retains its original quote', () => {
        const f = selected('## Start\r\n\r\nA useful idea stays here.\r\n\r\nLast.\r\n', 'A useful idea stays here.');
        const source = f.document.source.replace('useful', 'practical');
        const result = replaceAnnotatedSource(f.document, source, [f.anchor]);
        expect(result.document.source).toBe(source);
        expect(target(result)).toBe('A practical idea stays here.');
        expect(result.anchors[0]).toMatchObject({ status: 'changed', quote: f.anchor.quote });
        expect(result.anchors[0].segments[0].blockId).toBe(f.anchor.segments[0].blockId);
    });
    it('preserves a selection between two independent edits in one paragraph', () => {
        const f = selected('First word and keep this with last word.', 'keep this');
        const result = replaceAnnotatedSource(f.document, 'New word and keep this with final word.', [f.anchor]);
        expect(target(result)).toBe('keep this');
        expect(result.anchors[0].status).toBe('attached');
    });
    it('does not mistake shared spaces or punctuation for surviving text', () => {
        const f = selected('Cats eat fish.', 'Cats eat fish.');
        const result = replaceAnnotatedSource(f.document, 'Birds fly south.', [f.anchor]);
        expect(result.anchors[0]).toMatchObject({ status: 'ambiguous', segments: [] });
    });
    it('keeps whole-block comments when a same-block rewrite is unambiguous', () => {
        const document = createDocument('Cats eat fish.');
        const result = replaceAnnotatedSource(document, 'Birds fly south.', [createBlocksAnchor(document, [document.blocks[0].id])]);
        expect(target(result)).toBe('Birds fly south.');
        expect(result.anchors[0].status).toBe('changed');
    });
    it('retains unique block identities and ranges after reordering', () => {
        const f = selected('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.', 'First paragraph.');
        const result = replaceAnnotatedSource(f.document, 'Second paragraph.\n\nThird paragraph.\n\nFirst paragraph.', [f.anchor]);
        expect(target(result)).toBe(f.anchor.quote);
        expect(result.anchors[0].segments).toEqual(f.anchor.segments);
        expect(new Set(result.document.blocks.map(b => b.id)).size).toBe(result.document.blocks.length);
    });
    it('sorts a multiblock comment in the new document order', () => {
        const document = createDocument('First.\n\nSecond.\n\nThird.');
        const anchor = createBlocksAnchor(document, document.blocks.map(b => b.id));
        const result = replaceAnnotatedSource(document, 'Third.\n\nFirst.\n\nSecond.', [anchor]);
        expect(target(result)).toBe('Third.|First.|Second.');
        expect(() => validateAnchor(result.document, result.anchors[0])).not.toThrow();
    });
    it('does not guess which duplicate was deleted or modified', () => {
        const document = createDocument('Same.\n\nSame.');
        const anchors = document.blocks.map(b => createBlocksAnchor(document, [b.id]));
        for (const source of ['Same.', 'Different.\n\nSame.']) {
            const result = replaceAnnotatedSource(document, source, anchors);
            expect(result.anchors.every(a => a.status === 'ambiguous' && a.segments.length === 0)).toBe(true);
        }
    });
    it('keeps duplicate selections when only unrelated source is inserted', () => {
        const document = createDocument('Same.\n\nSame.');
        const anchor = createBlocksAnchor(document, [document.blocks[1].id]);
        const result = replaceAnnotatedSource(document, '# New\n\nSame.\n\nSame.', [anchor]);
        expect(result.anchors[0].segments[0].blockId).toBe(document.blocks[1].id);
    });
    it('archives empty targets and retains the rest of a multiblock comment', () => {
        const document = createDocument('First.\n\nSecond.');
        const anchor = createBlocksAnchor(document, document.blocks.map(b => b.id));
        const partial = replaceAnnotatedSource(document, 'Second.', [anchor]);
        expect(partial.anchors[0].status).toBe('partial');
        expect(target(partial)).toBe('Second.');
        const empty = replaceAnnotatedSource(document, '', [anchor]);
        expect(empty.anchors[0]).toMatchObject({ status: 'source-removed', segments: [], quote: anchor.quote });
    });
    it('bounds expensive diffs and preserves proven unchanged blocks on fallback', () => {
        const f = selected('Keep this.\n\nRewrite everything below.', 'Keep this.');
        expect(sourceReplacementEdits('old', 'new', { maxEditLength: 0 })).toBeNull();
        const result = replaceAnnotatedSource(f.document, 'Keep this.\n\nEntirely different content.', [f.anchor], { maxEditLength: 0 });
        expect(target(result)).toBe('Keep this.');
    });
    it('does not corrupt Unicode, code, CRLF or math source', () => {
        const f = selected('😀 **keep** and $x^2$\r\n\r\n```js\r\nlet x = 1;\r\n```\r\n', '😀 **keep**');
        const source = f.document.source.replace('x^2', 'x^3').replace('1;', '2;');
        const result = replaceAnnotatedSource(f.document, source, [f.anchor]);
        expect(result.document.source).toBe(source);
        expect(target(result)).toBe(f.anchor.quote);
    });
});
