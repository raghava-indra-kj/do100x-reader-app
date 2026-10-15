import { diffWordsWithSpace } from 'diff';
import { reconcileDocument, type MarkdownDocument, type SourceEdit } from './document';
import { editAnnotatedDocument, validateAnchor, type AnnotationAnchor, type AnnotationSegment } from './annotations';

/** Bounded recovery for source forms/imports. Explicit editor operations remain preferable. */
export function sourceReplacementEdits(before: string, after: string, options: { maxEditLength?: number; timeout?: number } = {}): SourceEdit[] | null {
    if (before === after) return [];
    // Bound tokenization as well as the Myers search. A fallback never discards source.
    if (before.length + after.length > 2_000_000) return null;
    const changes = diffWordsWithSpace(before, after, { maxEditLength: options.maxEditLength ?? 2048, timeout: options.timeout ?? 100 });
    if (!changes) return null;
    const edits: SourceEdit[] = [];
    let offset = 0, pending: SourceEdit | undefined;
    for (const change of changes) {
        if (!change.added && !change.removed) {
            // Shared punctuation/whitespace between replacements is not proof of
            // surviving text (e.g. two unrelated sentences with the same spaces).
            if (pending && !/[\p{L}\p{N}\p{S}]/u.test(change.value)) {
                pending.end += change.value.length;
                pending.expected += change.value;
                pending.insert += change.value;
            } else {
                if (pending) edits.push(pending);
                pending = undefined;
            }
            offset += change.value.length;
        } else {
            pending ??= { start: offset, end: offset, expected: '', insert: '' };
            if (change.removed) {
                pending.end += change.value.length;
                pending.expected += change.value;
                offset += change.value.length;
            } else pending.insert += change.value;
        }
    }
    if (pending) edits.push(pending);
    // Do not consume unchanged trailing punctuation/whitespace unnecessarily.
    for (const edit of edits) {
        while (edit.expected && edit.insert && edit.expected.at(-1) === edit.insert.at(-1) && /\s/.test(edit.expected.at(-1)!)) {
            edit.end--; edit.expected = edit.expected.slice(0, -1); edit.insert = edit.insert.slice(0, -1);
        }
    }
    return edits;
}

const key = (block: MarkdownDocument['blocks'][number]) => `${block.kind}\0${block.source}`;
function groups(document: MarkdownDocument) {
    const result = new Map<string, typeof document.blocks>();
    for (const block of document.blocks) result.set(key(block), [...(result.get(key(block)) ?? []), block]);
    return result;
}

/**
 * Map whole-source saves without pretending a diff proves editing intent.
 * Unique unchanged blocks may move; changed duplicate identities are ambiguous.
 * The original quote is retained, and removed targets never delete discussions.
 */
export function replaceAnnotatedSource(previous: MarkdownDocument, source: string, anchors: readonly AnnotationAnchor[], options?: { maxEditLength?: number; timeout?: number }) {
    const checked = anchors.map(anchor => validateAnchor(previous, anchor));
    if (source === previous.source) return { document: previous, anchors: checked };
    const oldGroups = groups(previous);
    const reconciled = reconcileDocument(previous, source);
    const newGroups = groups(reconciled);
    const unchanged = new Set(reconciled.blocks.filter(block => oldGroups.get(key(block))?.length === 1 && newGroups.get(key(block))?.length === 1).map(block => block.id));
    const edits = sourceReplacementEdits(previous.source, source, options);
    // Map segments independently so a moved block cannot swallow its neighbours.
    const singles = checked.flatMap(anchor => anchor.segments.map(segment => ({ ...anchor, segments: [segment] })));
    const mapped = edits ? editAnnotatedDocument(previous, edits, singles) : { document: reconciled, anchors: singles.map(anchor => ({ ...anchor, segments: [] as AnnotationSegment[], status: 'ambiguous' as const })) };
    const next = mapped.document;
    const remapIds = new Map<string, string>();
    for (let i = 0; i < next.blocks.length; i++) {
        const block = next.blocks[i], stable = reconciled.blocks[i];
        const old = oldGroups.get(key(block));
        if (unchanged.has(stable.id) || unchanged.has(block.id)) { remapIds.set(block.id, stable.id); block.id = stable.id; }
        else if (old && (old.length > 1 || newGroups.get(key(block))!.length > 1)) {
            // Duplicate counts changing makes even a seemingly untouched copy uncertain.
            if (old.length !== newGroups.get(key(block))!.length) { remapIds.set(block.id, stable.id); block.id = stable.id; }
        }
    }
    const oldById = new Map(previous.blocks.map(block => [block.id, block]));
    const newById = new Map(next.blocks.map(block => [block.id, block]));
    let cursor = 0;
    const result = checked.map((anchor): AnnotationAnchor => {
        if (!anchor.segments.length) return anchor;
        let uncertain = false, removed = anchor.status === 'partial', changed = anchor.status === 'changed';
        const segments: AnnotationSegment[] = [];
        for (const segment of anchor.segments) {
            const one = mapped.anchors[cursor++];
            if (unchanged.has(segment.blockId)) { segments.push({ ...segment }); continue; }
            const old = oldById.get(segment.blockId)!;
            const duplicateChanged = (oldGroups.get(key(old))!.length > 1 || (newGroups.get(key(old))?.length ?? 0) > 1) && oldGroups.get(key(old))!.length !== (newGroups.get(key(old))?.length ?? 0);
            if (duplicateChanged || !edits) { uncertain = true; continue; }
            uncertain ||= one.status === 'ambiguous';
            removed ||= one.status === 'source-removed' || one.status === 'partial';
            changed ||= one.status === 'changed';
            segments.push(...one.segments.map(part => ({ ...part, blockId: remapIds.get(part.blockId) ?? part.blockId })));
        }
        segments.sort((a, b) => newById.get(a.blockId)!.start + a.start - newById.get(b.blockId)!.start - b.start);
        const combined: AnnotationSegment[] = [];
        for (const segment of segments) {
            const last = combined.at(-1);
            if (last?.blockId === segment.blockId && segment.start <= last.end) last.end = Math.max(last.end, segment.end);
            else combined.push(segment);
        }
        const kind = anchor.kind === 'blocks' && combined.some(part => part.start !== 0 || part.end !== newById.get(part.blockId)!.source.length) ? 'text' : anchor.kind;
        const status = !combined.length ? !source.trim() || removed && !uncertain ? 'source-removed' : 'ambiguous' : removed || uncertain ? 'partial' : changed ? 'changed' : anchor.status;
        return validateAnchor(next, { ...anchor, kind, segments: combined, status });
    });
    return { document: next, anchors: result };
}
