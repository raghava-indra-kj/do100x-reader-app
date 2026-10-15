import { MdAstError } from './types';
import { applySourceEdits, isSourceBoundary, type MarkdownDocument, type SourceEdit, type SourceRange } from './document';

/** Ranges are UTF-16 source offsets relative to the identified block, not DOM offsets. */
export interface AnnotationSegment extends SourceRange { blockId: string }
export type AttachmentStatus = 'attached' | 'changed' | 'partial' | 'source-removed' | 'ambiguous';
export interface AnnotationAnchor {
    version: 1;
    kind: 'text' | 'blocks';
    segments: AnnotationSegment[];
    /** Original readable quotation; never overwritten when the source is edited. */
    quote: string;
    status: AttachmentStatus;
}

function invalid(message: string): never { throw new MdAstError({ message }); }
const annotatable = (kind: string) => !['yaml', 'definition'].includes(kind);

/** Split a contiguous source selection into its intersecting block segments. */
export function sourceSegments(document: MarkdownDocument, range: SourceRange): AnnotationSegment[] {
    if (!isSourceBoundary(document.source, range.start) || !isSourceBoundary(document.source, range.end) || range.end <= range.start) invalid('Invalid annotation range.');
    return document.blocks.filter(block => annotatable(block.kind) && block.start < range.end && block.end > range.start)
        .map(block => ({ blockId: block.id, start: Math.max(range.start, block.start) - block.start, end: Math.min(range.end, block.end) - block.start }));
}

export function createTextAnchor(document: MarkdownDocument, range: SourceRange, quote?: string): AnnotationAnchor {
    const segments = sourceSegments(document, range);
    if (!segments.length) invalid('Select readable content to annotate.');
    return { version: 1, kind: 'text', segments, quote: quote ?? document.source.slice(range.start, range.end), status: 'attached' };
}

export function createBlocksAnchor(document: MarkdownDocument, blockIds: readonly string[]): AnnotationAnchor {
    const ids = new Set(blockIds);
    const blocks = document.blocks.filter(block => ids.has(block.id) && annotatable(block.kind));
    if (!blocks.length || blocks.length !== ids.size) invalid('Select existing content blocks.');
    return { version: 1, kind: 'blocks', segments: blocks.map(block => ({ blockId: block.id, start: 0, end: block.source.length })), quote: blocks.map(block => block.text || block.source).join('\n\n'), status: 'attached' };
}

/** Validate persisted/user-supplied anchors. Missing targets are legal only in history. */
export function validateAnchor(document: MarkdownDocument, value: unknown): AnnotationAnchor {
    if (!value || typeof value !== 'object') invalid('Invalid annotation.');
    const anchor = value as AnnotationAnchor;
    if (anchor.version !== 1 || !['text', 'blocks'].includes(anchor.kind) || !['attached', 'changed', 'partial', 'source-removed', 'ambiguous'].includes(anchor.status) || typeof anchor.quote !== 'string' || !Array.isArray(anchor.segments) || anchor.segments.length > 1000) invalid('Invalid annotation.');
    if (!anchor.segments.length && !['source-removed', 'ambiguous'].includes(anchor.status)) invalid('Annotation has no target.');
    if (anchor.status === 'source-removed' && anchor.segments.length) invalid('A removed source cannot have active targets.');
    const byId = new Map(document.blocks.map(block => [block.id, block]));
    let previousEnd = -1;
    const segments = anchor.segments.map(segment => {
        if (!segment || typeof segment.blockId !== 'string' || !Number.isSafeInteger(segment.start) || !Number.isSafeInteger(segment.end) || segment.start < 0 || segment.end <= segment.start) invalid('Invalid annotation segment.');
        const block = byId.get(segment.blockId);
        if (!block || !annotatable(block.kind) || !isSourceBoundary(block.source, segment.start) || !isSourceBoundary(block.source, segment.end)) invalid('Annotation no longer matches the document.');
        if (block.start + segment.start < previousEnd) invalid('Annotation segments must be ordered and must not overlap.');
        if (anchor.kind === 'blocks' && (segment.start !== 0 || segment.end !== block.source.length)) invalid('Block annotations must cover complete blocks.');
        previousEnd = block.start + segment.end;
        return { blockId: segment.blockId, start: segment.start, end: segment.end };
    });
    return { version: 1, kind: anchor.kind, quote: anchor.quote, status: anchor.status, segments };
}

/** Map a boundary through a sorted source transaction with explicit insertion affinity. */
function mapPoint(point: number, edits: readonly SourceEdit[], affinity: -1 | 1): number {
    let shift = 0;
    for (const edit of edits) {
        if (point < edit.start) break;
        if (point > edit.end || point === edit.end && edit.end > edit.start) shift += edit.insert.length - (edit.end - edit.start);
        else if (edit.start === edit.end && point === edit.start) { if (affinity > 0) shift += edit.insert.length; }
        else return edit.start + shift + (affinity > 0 ? edit.insert.length : 0);
    }
    return point + shift;
}

function survivingRanges(range: SourceRange, edits: readonly SourceEdit[]): SourceRange[] {
    let ranges = [range];
    for (const edit of edits) {
        if (edit.start === edit.end) continue;
        ranges = ranges.flatMap(part => {
            if (edit.end <= part.start || edit.start >= part.end) return [part];
            const result: SourceRange[] = [];
            if (part.start < edit.start) result.push({ start: part.start, end: edit.start });
            if (part.end > edit.end) result.push({ start: edit.end, end: part.end });
            return result;
        });
    }
    return ranges;
}

/**
 * Source and attachment updates are one transaction. Hosts persist both under the same
 * revision check. Undo restores the previous document AND anchor snapshots together.
 */
export function editAnnotatedDocument(document: MarkdownDocument, edits: readonly SourceEdit[], anchors: readonly AnnotationAnchor[]) {
    const before = anchors.map(anchor => validateAnchor(document, anchor));
    const next = applySourceEdits(document, edits);
    if (next === document) return { document, anchors: before };
    const sorted = [...edits].sort((a, b) => a.start - b.start);
    const oldById = new Map(document.blocks.map(block => [block.id, block]));
    const newById = new Map(next.blocks.map(block => [block.id, block]));
    const mapped = before.map((anchor): AnnotationAnchor => {
        if (!anchor.segments.length) return anchor;
        let changed = anchor.status === 'changed', removed = anchor.status === 'partial', replaced = false;
        const segments: AnnotationSegment[] = [];
        for (const segment of anchor.segments) {
            const block = oldById.get(segment.blockId)!;
            if (anchor.kind === 'blocks') {
                const current = newById.get(block.id);
                if (current) {
                    segments.push({ blockId: current.id, start: 0, end: current.source.length });
                    changed ||= current.source !== block.source;
                    continue;
                }
            }
            const range = { start: block.start + segment.start, end: block.start + segment.end };
            const surviving = survivingRanges(range, sorted);
            if (!surviving.length) {
                removed = true;
                replaced ||= sorted.some(edit => edit.start < range.end && edit.end > range.start && edit.insert.length > 0);
                continue;
            }
            const overlaps = sorted.filter(edit => edit.start < range.end && edit.end > range.start || edit.start === edit.end && edit.start > range.start && edit.start < range.end);
            changed ||= overlaps.length > 0;
            removed ||= overlaps.some(edit => edit.end > edit.start && !edit.insert);
            // A replacement entirely inside the selection belongs to the comment if
            // some original target survives. A complete replacement never gets here.
            const replacesStart = overlaps.some(edit => edit.start === range.start && edit.end > edit.start && edit.end < range.end && edit.insert.length > 0);
            const replacesEnd = overlaps.some(edit => edit.end === range.end && edit.start > range.start && edit.end > edit.start && edit.insert.length > 0);
            const start = replacesStart ? mapPoint(range.start, sorted, -1) : mapPoint(surviving[0].start, sorted, 1);
            const end = replacesEnd ? mapPoint(range.end, sorted, 1) : mapPoint(surviving[surviving.length - 1].end, sorted, -1);
            if (end > start) segments.push(...sourceSegments(next, { start, end }));
            else removed = true;
        }
        // Split/merge operations can produce adjacent segments in a common block.
        const combined: AnnotationSegment[] = [];
        for (const segment of segments) {
            const last = combined[combined.length - 1];
            if (last?.blockId === segment.blockId && segment.start <= last.end) last.end = Math.max(last.end, segment.end);
            else combined.push({ ...segment });
        }
        // After merging with unselected content, retain the original portion as a
        // text target. Keeping whole-block semantics would expand it on the next edit.
        const kind = anchor.kind === 'blocks' && combined.some(segment => segment.start !== 0 || segment.end !== newById.get(segment.blockId)!.source.length) ? 'text' : anchor.kind;
        return { ...anchor, kind, segments: combined, status: !combined.length ? replaced ? 'ambiguous' : 'source-removed' : removed ? 'partial' : changed ? 'changed' : 'attached' };
    });
    return { document: next, anchors: mapped };
}

/** Full-source replacement has no operation history. Preserve only proven block identities. */
export function reconcileAnchor(previous: MarkdownDocument, next: MarkdownDocument, anchor: AnnotationAnchor): AnnotationAnchor {
    validateAnchor(previous, anchor);
    const old = new Map(previous.blocks.map(block => [block.id, block]));
    const current = new Map(next.blocks.map(block => [block.id, block]));
    const segments = anchor.segments.filter(segment => current.get(segment.blockId)?.source === old.get(segment.blockId)?.source);
    if (segments.length === anchor.segments.length) return anchor;
    return { ...anchor, segments, status: segments.length ? 'partial' : 'ambiguous' };
}
