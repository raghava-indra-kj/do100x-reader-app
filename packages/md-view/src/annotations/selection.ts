import { sourceSegments, validateAnchor, type AnnotationAnchor, type AnnotationSegment, type MarkdownDocument, type SourceRange } from '@reader/md-ast';
import { mappedSourceRange, sourceFingerprint, type TextSourceMap } from './text-map';

export type MarkdownSelectionResult =
    | { status: 'attached'; anchor: AnnotationAnchor }
    | { status: 'unmapped'; blockIds: string[]; reason: 'stale-view' | 'custom-content' | 'selection-too-large' }
    | { status: 'outside' | 'empty' };

const markerSelector = '[data-md-text-map], [data-md-atomic-start]';
const uiSelector = '[data-md-ui],button,input,textarea,select,[role="button"],[role="dialog"]';

function intersection(range: Range, node: Node): Range | null {
    const clipped = node.ownerDocument!.createRange();
    clipped.selectNodeContents(node);
    if (range.compareBoundaryPoints(3 /* END_TO_START */, clipped) >= 0 || range.compareBoundaryPoints(1 /* START_TO_END */, clipped) <= 0) return null;
    if (range.compareBoundaryPoints(0 /* START_TO_START */, clipped) > 0) clipped.setStart(range.startContainer, range.startOffset);
    if (range.compareBoundaryPoints(2 /* END_TO_END */, clipped) < 0) clipped.setEnd(range.endContainer, range.endOffset);
    return clipped.collapsed ? null : clipped;
}

function readMap(element: Element): TextSourceMap | undefined {
    try {
        const map = JSON.parse(element.getAttribute('data-md-text-map') ?? '') as TextSourceMap;
        if (typeof map.text !== 'string' || map.text !== element.textContent || !Array.isArray(map.runs)) return;
        let boundary = 0;
        for (const run of map.runs) {
            if (!Array.isArray(run) || run.length !== 4 || run.some(value => !Number.isSafeInteger(value) || value < 0) || run[0] !== boundary || run[1] <= run[0] || run[3] < run[2]) return;
            boundary = run[1];
        }
        return boundary === map.text.length ? map : undefined;
    } catch { return; }
}

function unicodeRange(source: string, range: SourceRange): SourceRange {
    // Programmatic selections can bisect a UTF-16 pair even though pointer selections do not.
    const inside = (offset: number) => offset > 0 && offset < source.length && /[\uD800-\uDBFF]/.test(source[offset - 1]) && /[\uDC00-\uDFFF]/.test(source[offset]);
    return { start: range.start - Number(inside(range.start)), end: range.end + Number(inside(range.end)) };
}

/**
 * Resolve a browser range against this renderer's full document. Pass the .md-view
 * root, not an outer page container. The range may cross any number of blocks.
 * Unsupported custom markup returns an explicit fallback, never a partial attachment.
 */
export function selectionToAnchor(root: HTMLElement, document: MarkdownDocument, range: Range): MarkdownSelectionResult {
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return { status: 'outside' };
    if (range.collapsed) return { status: 'empty' };
    const startElement = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
    const selectedControl = startElement?.closest(uiSelector);
    if (selectedControl?.contains(range.endContainer)) return { status: 'empty' };
    if (root.getAttribute('data-md-document') !== sourceFingerprint(document.source)) return { status: 'unmapped', reason: 'stale-view', blockIds: [] };
    const blockIds = new Set<string>(), ranges: SourceRange[] = [], quotes: string[] = [];
    const seen = new Set<Element>();
    let unsupported = false;
    const owner = (element: Element) => element.closest('[data-md-block-id]');
    const blocks = new Map(document.blocks.map(block => [block.id, block]));

    function addMarker(element: Element) {
        if (seen.has(element) || element.closest('.md-view') !== root || element.closest(uiSelector)) return;
        const clipped = intersection(range, element);
        if (!clipped) return;
        seen.add(element);
        const block = blocks.get(owner(element)?.getAttribute('data-md-block-id') ?? '');
        if (!block) { unsupported = true; return; }
        blockIds.add(block.id);
        let mapped: SourceRange[];
        if (element.hasAttribute('data-md-atomic-start')) {
            const start = Number(element.getAttribute('data-md-atomic-start')), end = Number(element.getAttribute('data-md-atomic-end'));
            mapped = [{ start, end }];
            quotes.push(document.source.slice(start, end));
        } else {
            const map = readMap(element);
            if (!map) { unsupported = true; return; }
            const prefix = root.ownerDocument.createRange();
            prefix.selectNodeContents(element); prefix.setEnd(clipped.startContainer, clipped.startOffset);
            const start = prefix.toString().length, end = start + clipped.toString().length;
            mapped = mappedSourceRange(map, start, end);
            quotes.push(map.text.slice(start, end));
        }
        for (const target of mapped) {
            if (!Number.isSafeInteger(target.start) || !Number.isSafeInteger(target.end) || target.start < block.start || target.end > block.end || target.end <= target.start) { unsupported = true; continue; }
            ranges.push(unicodeRange(document.source, target));
        }
    }

    // Walk document order, including textless objects (images, diagrams, rules).
    const walker = root.ownerDocument.createTreeWalker(root, 1 | 4 /* ELEMENT | TEXT */);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeType === 1) {
            const element = node as Element;
            if (element.matches(markerSelector)) addMarker(element);
            continue;
        }
        const element = node.parentElement;
        if (!element || element.closest('.md-view') !== root || element.closest(uiSelector) || element.closest('[data-md-atomic-start]')) continue;
        const clipped = intersection(range, node);
        if (!clipped) continue;
        const text = clipped.toString();
        const marker = element.closest('[data-md-text-map]');
        if (marker) addMarker(marker);
        else if (text.trim()) {
            unsupported = true;
            const id = owner(element)?.getAttribute('data-md-block-id');
            if (id && blocks.has(id)) blockIds.add(id);
        } else if (text) quotes.push(text);
    }
    if (unsupported) return { status: 'unmapped', reason: 'custom-content', blockIds: [...blockIds] };
    if (!ranges.length) return { status: 'empty' };
    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    const combined: SourceRange[] = [];
    for (const target of ranges) {
        const last = combined.at(-1);
        if (last && target.start <= last.end) last.end = Math.max(last.end, target.end);
        else combined.push({ ...target });
    }
    const segments: AnnotationSegment[] = combined.flatMap(target => sourceSegments(document, target));
    if (segments.length > 1000) return { status: 'unmapped', reason: 'selection-too-large', blockIds: [...blockIds] };
    return { status: 'attached', anchor: validateAnchor(document, { version: 1, kind: 'text', status: 'attached', quote: quotes.join('').replace(/\n{3,}/g, '\n\n').trim(), segments }) };
}

/** Convert persisted attachments back into DOM ranges for highlights or scrolling. */
export function anchorToRanges(root: HTMLElement, document: MarkdownDocument, anchor: AnnotationAnchor): Range[] {
    if (root.getAttribute('data-md-document') !== sourceFingerprint(document.source)) return [];
    validateAnchor(document, anchor);
    const blocks = new Map(document.blocks.map(block => [block.id, block]));
    const targets = anchor.segments.map(segment => ({ start: blocks.get(segment.blockId)!.start + segment.start, end: blocks.get(segment.blockId)!.start + segment.end }));
    const result: Range[] = [];
    for (const element of root.querySelectorAll(markerSelector)) {
        if (element.closest('.md-view') !== root || element.closest(uiSelector)) continue;
        const atomic = element.hasAttribute('data-md-atomic-start');
        const map = atomic ? undefined : readMap(element);
        if (!atomic && !map) continue;
        const runs = atomic ? [[0, 1, Number(element.getAttribute('data-md-atomic-start')), Number(element.getAttribute('data-md-atomic-end'))]] : map!.runs;
        const intervals: Array<{ start: number; end: number }> = [];
        for (const [a, b, c, d] of runs) for (const target of targets) {
            if (target.start >= d || target.end <= c) continue;
            const linear = b - a === d - c;
            const start = linear ? a + Math.max(0, target.start - c) : a;
            const end = linear ? b - Math.max(0, d - target.end) : b;
            const last = intervals.at(-1);
            if (last && start <= last.end) last.end = Math.max(last.end, end);
            else intervals.push({ start, end });
        }
        for (const interval of intervals) {
            const range = root.ownerDocument.createRange();
            if (atomic) { range.selectNode(element); result.push(range); continue; }
            const walker = root.ownerDocument.createTreeWalker(element, 4 /* TEXT */);
            let offset = 0, started = false;
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const length = node.textContent?.length ?? 0;
                if (!started && interval.start < offset + length) { range.setStart(node, interval.start - offset); started = true; }
                if (started && interval.end <= offset + length) { range.setEnd(node, interval.end - offset); result.push(range); break; }
                offset += length;
            }
        }
    }
    return result;
}
