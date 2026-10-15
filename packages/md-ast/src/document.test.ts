import { describe, expect, it } from 'vitest';
import { applySourceEdits, createBlockAnchor, createDocument, hydrateDocument, reconcileDocument, replaceBlock, resolveBlockAnchor, serializeDocument } from './document';

describe('lossless Markdown documents', () => {
    const sources = [
        '', '  \r\n\r\n', '\uFEFF# A\r\n\r\ntext  \r\nnext\r\n',
        '---\r\n# keep this comment\r\ntitle: "Quoted"\r\n---\r\n\r\nTitle\r\n=====\r\n\r\nbody',
        '- [x] task\n  - nested\n\n> quote\n>\n> paragraph\n\n[a]: /target "Title"\n\n[a] and [^1]\n\n[^1]: note\n',
        '```d2\na -> b\n```\n\n$$\nx^2\n$$\n\n<details>\n<summary>A</summary>\n\n**text**\n</details>\n',
        '| A | B |\n| :- | -: |\n| a | b |\n\n![image](a.png)\n\n```reader-component\n{"type":"quiz","id":"q1"}\n```',
    ];
    for (const [i, source] of sources.entries()) it(`preserves fixture ${i} exactly across JSON persistence`, () => {
        const document = createDocument(source);
        expect(serializeDocument(hydrateDocument(JSON.parse(JSON.stringify(document))))).toBe(source);
    });
    it('rejects forged ranges and duplicate block IDs', () => {
        const document = createDocument('one\n\ntwo');
        expect(() => hydrateDocument({ ...document, blocks: document.blocks.map(block => ({ ...block, start: 0 })) })).toThrow();
        expect(() => createDocument('one\n\ntwo', { generateId: () => 'duplicate' })).toThrow();
    });
    it('changes one block, preserving formatting and identity of duplicate neighbors', () => {
        const document = createDocument('---\ntitle: "Keep"\n---\n\nSame\n\nSame\n\n# End\n');
        const target = document.blocks[2];
        const anchor = createBlockAnchor(document, [target.id]);
        const next = replaceBlock(document, target.id, target.source, 'Changed');
        expect(next.source).toBe(document.source.slice(0, target.start) + 'Changed' + document.source.slice(target.end));
        expect(next.blocks.map(b => b.id)).toEqual(document.blocks.map(b => b.id));
        expect(resolveBlockAnchor(next, anchor).status).toBe('changed');
    });
    it('keeps multi-block anchors through insertions before them', () => {
        const document = createDocument('# A\n\none\n\ntwo');
        const anchor = createBlockAnchor(document, document.blocks.slice(1).map(b => b.id));
        const next = applySourceEdits(document, [{ start: 0, end: 0, expected: '', insert: '# New\n\n' }]);
        expect(resolveBlockAnchor(next, anchor).status).toBe('attached');
    });
    it('reports deletion and split as unresolved instead of attaching to another block', () => {
        const document = createDocument('one\n\ntwo');
        const anchor = createBlockAnchor(document, document.blocks.map(b => b.id));
        const next = replaceBlock(document, document.blocks[0].id, 'one', 'part\n\nother');
        expect(resolveBlockAnchor(next, anchor).status).toBe('partial');
        expect(resolveBlockAnchor(createDocument(''), anchor).status).toBe('orphaned');
    });
    it('rejects stale, overlapping and out-of-range edits atomically', () => {
        const document = createDocument('hello');
        expect(() => applySourceEdits(document, [{ start: 0, end: 5, expected: 'stale', insert: 'new' }])).toThrow();
        expect(() => applySourceEdits(document, [{ start: -1, end: 5, expected: '', insert: '' }])).toThrow();
        expect(() => applySourceEdits(document, [{ start: 0, end: 2, expected: 'he', insert: '' }, { start: 1, end: 4, expected: 'ell', insert: '' }])).toThrow();
        expect(document.source).toBe('hello');
    });
    it('tracks unique moved blocks but refuses to guess duplicate identity on a full rewrite', () => {
        const document = createDocument('one\n\nsame\n\nsame\n\ntwo');
        const next = reconcileDocument(document, 'two\n\nsame\n\nsame\n\none');
        expect(next.blocks[0].id).toBe(document.blocks[3].id);
        expect(next.blocks[3].id).toBe(document.blocks[0].id);
        expect(next.blocks[1].id).not.toBe(document.blocks[1].id);
    });
    it('keeps identity when text is inserted at either edge of a paragraph', () => {
        const document = createDocument('hello');
        for (const [offset, insert] of [[0, 'Before '], [5, ' after'], [0, '# Earlier\n\n'], [5, '\n\nLater']] as const) {
            const next = applySourceEdits(document, [{ start: offset, end: offset, expected: '', insert }]);
            expect(next.blocks.find(block => block.source.includes('hello'))?.id).toBe(document.blocks[0].id);
        }
    });
    it('assigns a new identity when two paragraphs merge and rejects split surrogate pairs', () => {
        const document = createDocument('one\n\ntwo');
        const next = applySourceEdits(document, [{ start: 3, end: 5, expected: '\n\n', insert: ' ' }]);
        expect(document.blocks.map(block => block.id)).not.toContain(next.blocks[0].id);
        expect(() => applySourceEdits(createDocument('😀'), [{ start: 1, end: 1, expected: '', insert: 'x' }])).toThrow();
    });
});
