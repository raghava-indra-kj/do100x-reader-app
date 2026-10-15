import { describe, expect, it } from 'vitest';
import { createDocument, documentMetadata } from './document';
import { createTextAnchor, editAnnotatedDocument } from './annotations';
import { createAnnotationChange, restoreAnnotationChange, type AnnotationState } from './annotation-history';

function fixture() {
    const document = createDocument('First thought.\n\nKeep this.');
    const anchor = createTextAnchor(document, { start: 0, end: 14 });
    const result = editAnnotatedDocument(document, [{ start: 0, end: 16, expected: 'First thought.\n\n', insert: '' }], [anchor]);
    const before: AnnotationState = { document, annotations: [{ id: 'note', anchor }] };
    const after: AnnotationState = { document: result.document, annotations: [{ id: 'note', anchor: result.anchors[0] }] };
    return { before, after, change: createAnnotationChange(before, after) };
}

describe('annotation content history', () => {
    it('round trips deletion and restores original IDs, source and removed attachments', () => {
        const { before, after, change } = fixture();
        expect(after.annotations[0].anchor.status).toBe('source-removed');
        const restored = restoreAnnotationChange(after, JSON.parse(JSON.stringify(change)), 'undo');
        expect(restored.state).toEqual(before);
        expect(restoreAnnotationChange(restored.state, restored.change, 'redo').state).toEqual(after);
    });
    it('does not resurrect an explicitly deleted comment', () => {
        const { before, after, change } = fixture();
        expect(restoreAnnotationChange({ ...after, annotations: [] }, change, 'undo').state).toEqual({ ...before, annotations: [] });
    });
    it('retains comments created after the edit and moves them with surviving text', () => {
        const { before, after, change } = fixture();
        const later = { id: 'later', anchor: createTextAnchor(after.document, { start: 0, end: 9 }) };
        const restored = restoreAnnotationChange({ ...after, annotations: [...after.annotations, later] }, change, 'undo');
        expect(restored.state.annotations[0]).toEqual(before.annotations[0]);
        expect(restored.state.annotations[1].anchor.segments).toEqual([{ blockId: before.document.blocks[1].id, start: 0, end: 9 }]);
        expect(restoreAnnotationChange(restored.state, restored.change, 'redo').state.annotations[1]).toEqual(later);
    });
    it('respects a manual reattachment instead of replacing it with the old target', () => {
        const { before, after, change } = fixture();
        const manual = { id: 'note', anchor: createTextAnchor(after.document, { start: 0, end: 9 }) };
        const restored = restoreAnnotationChange({ ...after, annotations: [manual] }, change, 'undo');
        expect(restored.state.annotations[0].anchor.segments[0].blockId).toBe(before.document.blocks[1].id);
        expect(restored.state.annotations[0].anchor.quote).toBe('Keep this');
    });
    it('keeps a newer note on inserted text through undo, redo and another undo', () => {
        const before: AnnotationState = { document: createDocument('Existing.'), annotations: [] };
        const next = editAnnotatedDocument(before.document, [{ start: 9, end: 9, expected: '', insert: '\n\nInserted.' }], []);
        const after: AnnotationState = { document: next.document, annotations: [] };
        const original = { ...after, annotations: [{ id: 'later', anchor: createTextAnchor(after.document, { start: 11, end: 20 }) }] };
        const undone = restoreAnnotationChange(original, createAnnotationChange(before, after), 'undo');
        expect(undone.state.annotations[0].anchor.status).toBe('source-removed');
        const redone = restoreAnnotationChange(undone.state, undone.change, 'redo');
        expect(redone.state).toEqual(original);
        expect(restoreAnnotationChange(redone.state, redone.change, 'undo').state).toEqual(undone.state);
    });
    it('rejects a stale source or identity index instead of overwriting newer edits', () => {
        const { after, change } = fixture();
        expect(() => restoreAnnotationChange({ ...after, document: createDocument('Another edit.') }, change, 'undo')).toThrow('document changed');
        expect(() => restoreAnnotationChange({ ...after, document: createDocument(after.document.source) }, change, 'undo')).toThrow('document changed');
    });
    it('copies snapshots and validates persisted history without accepting comment lifecycle changes', () => {
        const { before, after, change } = fixture();
        const metadata = documentMetadata(change.before.document);
        before.document.blocks[0].id = 'mutated';
        before.annotations[0].anchor.segments[0].end = 2;
        expect(documentMetadata(change.before.document)).toEqual(metadata);
        expect(change.before.annotations[0].anchor.segments[0].end).toBe(14);
        expect(() => createAnnotationChange(change.before, { ...after, annotations: [] })).toThrow('same comment IDs');
        expect(() => restoreAnnotationChange(after, { ...change, version: 9 }, 'undo')).toThrow('Unsupported');
        expect(() => createAnnotationChange({ ...after, annotations: [...after.annotations, ...after.annotations] }, after)).toThrow('unique comment IDs');
    });
});
