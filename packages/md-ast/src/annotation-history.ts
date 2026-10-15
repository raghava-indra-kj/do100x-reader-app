import { documentMetadata, hydrateDocument, type MarkdownDocument } from './document';
import { validateAnchor, type AnnotationAnchor } from './annotations';
import { replaceAnnotatedSource } from './source-replacement';
import { MdAstError } from './types';

/** IDs belong to the host's comments; bodies, permissions and resolution are not history data. */
export interface IdentifiedAnnotation { id: string; anchor: AnnotationAnchor }
export interface AnnotationState { document: MarkdownDocument; annotations: IdentifiedAnnotation[] }
export interface AnnotationChange { version: 1; before: AnnotationState; after: AnnotationState }
export interface AnnotationRestoration {
    state: AnnotationState;
    /** Retain this updated entry for the next undo/redo, including newer attachments. */
    change: AnnotationChange;
}

function fail(message: string): never { throw new MdAstError({ message }); }
function state(value: AnnotationState): AnnotationState {
    if (!value || !Array.isArray(value.annotations)) fail('Invalid annotation history state.');
    const document = hydrateDocument(value.document);
    const ids = new Set<string>();
    const annotations = value.annotations.map(entry => {
        if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) fail('Annotation history requires unique comment IDs.');
        ids.add(entry.id);
        return { id: entry.id, anchor: validateAnchor(document, entry.anchor) };
    });
    return { document, annotations };
}
function sameDocument(a: MarkdownDocument, b: MarkdownDocument) {
    return a.source === b.source && JSON.stringify(documentMetadata(a)) === JSON.stringify(documentMetadata(b));
}
function sameAnchor(a: AnnotationAnchor, b: AnnotationAnchor) { return JSON.stringify(a) === JSON.stringify(b); }

/** Snapshot a content-only transaction. Persist this with the host's page ID and revision.
 * Do not include comment creation/deletion or resolution in the content undo stack. */
export function createAnnotationChange(before: AnnotationState, after: AnnotationState): AnnotationChange {
    const previous = state(before), next = state(after);
    const ids = new Set(previous.annotations.map(entry => entry.id));
    if (ids.size !== next.annotations.length || next.annotations.some(entry => !ids.has(entry.id))) fail('A content history change must keep the same comment IDs.');
    return { version: 1, before: previous, after: next };
}

/** Undo/redo one content transaction without resurrecting deleted comments or erasing
 * newer comments/manual reattachments. The caller must also check the page revision
 * and commit source, identities and returned attachments atomically. */
export function restoreAnnotationChange(current: AnnotationState, value: unknown, direction: 'undo' | 'redo'): AnnotationRestoration {
    if (direction !== 'undo' && direction !== 'redo') fail('Choose undo or redo.');
    if (!value || typeof value !== 'object' || (value as AnnotationChange).version !== 1) fail('Unsupported annotation history.');
    const input = value as AnnotationChange;
    const history = createAnnotationChange(input.before, input.after);
    const actual = state(current);
    const expected = direction === 'undo' ? history.after : history.before;
    const target = direction === 'undo' ? history.before : history.after;
    if (!sameDocument(actual.document, expected.document)) fail('The document changed after this history entry. Rebase the edit before undoing it.');
    const expectedById = new Map(expected.annotations.map(entry => [entry.id, entry.anchor]));
    const targetById = new Map(target.annotations.map(entry => [entry.id, entry.anchor]));
    const changed = actual.annotations.filter(entry => !expectedById.has(entry.id) || !sameAnchor(entry.anchor, expectedById.get(entry.id)!));
    // New or manually reattached notes follow surviving source conservatively. They
    // never inherit another note's historical attachment just because text matches.
    const mapped = replaceAnnotatedSource(actual.document, target.document.source, changed.map(entry => entry.anchor));
    const targetIds = new Map(mapped.document.blocks.map((block, index) => [block.id, target.document.blocks[index].id]));
    const changedById = new Map(changed.map((entry, index) => [entry.id, validateAnchor(target.document, {
        ...mapped.anchors[index],
        segments: mapped.anchors[index].segments.map(segment => ({ ...segment, blockId: targetIds.get(segment.blockId)! })),
    })]));
    const restored = { document: target.document, annotations: actual.annotations.map(entry => ({
        id: entry.id, anchor: changedById.get(entry.id) ?? targetById.get(entry.id)!,
    })) };
    // Capture newer notes on both sides so redo can restore a new note whose source
    // this undo removed. Keeping only the original history would lose its target.
    return { state: restored, change: direction === 'undo'
        ? createAnnotationChange(restored, actual) : createAnnotationChange(actual, restored) };
}
