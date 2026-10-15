import { toString } from 'mdast-util-to-string';
import { parseSourceTree } from './section-edit';
import { MdAstError } from './types';

/** Offsets use JavaScript UTF-16 code units, just like selection and editor APIs. */
export interface SourceRange { start: number; end: number }
export interface MarkdownBlock extends SourceRange {
    id: string;
    kind: string;
    source: string;
    text: string;
}
/** Source is authoritative. Blocks are an index, never a replacement for source. */
export interface MarkdownDocument {
    version: 1;
    source: string;
    blocks: MarkdownBlock[];
}
/** Compact index persisted atomically alongside source and the host's revision. */
export interface DocumentMetadata {
    version: 1;
    blocks: Array<Pick<MarkdownBlock, 'id' | 'kind' | 'start' | 'end'>>;
}
export function documentMetadata(document: MarkdownDocument): DocumentMetadata {
    return { version: 1, blocks: document.blocks.map(({ id, kind, start, end }) => ({ id, kind, start, end })) };
}

/** The host must bind this index to its source revision; it contains no text copies. */
export function documentFromMetadata(source: string, value: unknown): MarkdownDocument {
    if (!value || typeof value !== 'object') fail('Invalid document metadata.');
    const metadata = value as DocumentMetadata;
    if (metadata.version !== 1 || !Array.isArray(metadata.blocks)) fail('Unsupported document metadata.');
    let index = 0;
    const parsed = createDocument(source, { generateId: () => metadata.blocks[index++]?.id });
    if (parsed.blocks.length !== metadata.blocks.length || parsed.blocks.some((block, i) => {
        const saved = metadata.blocks[i];
        return block.kind !== saved.kind || block.start !== saved.start || block.end !== saved.end;
    })) fail('Document metadata does not match the source structure.');
    return parsed;
}
export interface SourceEdit extends SourceRange { expected: string; insert: string }
export interface BlockAnchor {
    version: 1;
    blocks: Array<{ id: string; source: string }>;
}
export type AnchorResolution = {
    status: 'attached' | 'changed' | 'partial' | 'orphaned';
    blocks: MarkdownBlock[];
    missingIds: string[];
};

function fail(message: string): never { throw new MdAstError({ message }); }
function freshId() { return crypto.randomUUID(); }
function key(block: MarkdownBlock) { return `${block.kind}\0${block.source}`; }
/** A UTF-16 offset must not cut a Unicode surrogate pair in half. */
export function isSourceBoundary(source: string, offset: number): boolean {
    return Number.isSafeInteger(offset) && offset >= 0 && offset <= source.length &&
        !(offset > 0 && offset < source.length && /[\uD800-\uDBFF]/.test(source[offset - 1]) && /[\uDC00-\uDFFF]/.test(source[offset]));
}

/** Parse once, retaining ALL source bytes including front matter, gaps and final newlines. */
export function createDocument(source: string, options: { generateId?: () => string } = {}): MarkdownDocument {
    if (typeof source !== 'string') fail('Markdown source must be a string.');
    const generateId = options.generateId ?? freshId;
    const ids = new Set<string>();
    const blocks = parseSourceTree(source).children.map(node => {
        const start = node.position?.start.offset, end = node.position?.end.offset;
        if (start === undefined || end === undefined) fail('Markdown block has no source range.');
        const id = generateId();
        if (typeof id !== 'string' || !id || ids.has(id)) fail('Block IDs must be non-empty and unique.');
        ids.add(id);
        return { id, kind: node.type, start, end, source: source.slice(start, end), text: toString(node) };
    });
    return { version: 1, source, blocks };
}

/** Never regenerate Markdown from a rendering tree or normalized AST. */
export function serializeDocument(document: MarkdownDocument): string { return document.source; }

/** Validate persisted metadata against a fresh parse before trusting any block ranges or IDs. */
export function hydrateDocument(value: unknown): MarkdownDocument {
    if (!value || typeof value !== 'object') fail('Invalid Markdown document.');
    const candidate = value as MarkdownDocument;
    if (candidate.version !== 1 || typeof candidate.source !== 'string' || !Array.isArray(candidate.blocks)) fail('Unsupported Markdown document.');
    let index = 0;
    const parsed = createDocument(candidate.source, { generateId: () => candidate.blocks[index++]?.id });
    if (parsed.blocks.length !== candidate.blocks.length || parsed.blocks.some((block, i) => {
        const saved = candidate.blocks[i];
        return block.kind !== saved.kind || block.start !== saved.start || block.end !== saved.end || block.source !== saved.source;
    })) fail('Block metadata does not match the Markdown source.');
    return parsed;
}

/**
 * Reconcile a full text edit conservatively. Unique unchanged blocks can move safely.
 * Ambiguous duplicates receive new IDs instead of silently attaching comments to another copy.
 * Editors should prefer applySourceEdits for precise identity through changes and duplicate text.
 */
export function reconcileDocument(previous: MarkdownDocument, source: string): MarkdownDocument {
    if (source === previous.source) return previous;
    const next = createDocument(source);
    const group = (blocks: MarkdownBlock[]) => {
        const result = new Map<string, MarkdownBlock[]>();
        for (const block of blocks) result.set(key(block), [...(result.get(key(block)) ?? []), block]);
        return result;
    };
    const old = group(previous.blocks), current = group(next.blocks);
    for (const block of next.blocks) {
        const matches = old.get(key(block));
        if (matches?.length === 1 && current.get(key(block))?.length === 1) block.id = matches[0].id;
    }
    return next;
}

/** Apply an atomic batch against exact expected text. Unrelated source is never reserialized. */
export function applySourceEdits(document: MarkdownDocument, edits: readonly SourceEdit[]): MarkdownDocument {
    const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 0; i < sorted.length; i++) {
        const edit = sorted[i], previous = sorted[i - 1];
        if (!isSourceBoundary(document.source, edit.start) || !isSourceBoundary(document.source, edit.end) || edit.end < edit.start) fail('Invalid edit range.');
        if (typeof edit.insert !== 'string' || document.source.slice(edit.start, edit.end) !== edit.expected) fail('The document changed. Reload before applying this edit.');
        if (previous && (edit.start < previous.end || edit.start === previous.start)) fail('Edit ranges overlap.');
    }
    let source = document.source;
    for (const edit of [...sorted].reverse()) source = source.slice(0, edit.start) + edit.insert + source.slice(edit.end);
    if (source === document.source) return document;
    const next = createDocument(source);
    const candidates = new Map<MarkdownBlock, MarkdownBlock[]>();
    for (const block of document.blocks) {
        // Edits that cross a boundary can merge/split blocks. Do not guess their identity.
        if (sorted.some(edit => edit.start < block.start && edit.end > block.start || edit.start < block.end && edit.end > block.end)) continue;
        const shift = sorted.filter(edit => edit.end <= block.start).reduce((n, edit) => n + edit.insert.length - (edit.end - edit.start), 0);
        const delta = sorted.filter(edit => edit.start >= block.start && edit.start < block.end && edit.end <= block.end && edit.end > block.start)
            .reduce((n, edit) => n + edit.insert.length - (edit.end - edit.start), 0);
        const start = block.start + shift, end = block.end + shift + delta;
        if (end <= start) continue;
        const match = next.blocks.find(item => item.start <= start && item.end >= end && item.kind === block.kind);
        if (match) candidates.set(match, [...(candidates.get(match) ?? []), block]);
    }
    // Two old paragraphs merging into one must not arbitrarily inherit either ID.
    for (const [match, originals] of candidates) if (originals.length === 1) match.id = originals[0].id;
    return next;
}

/** Replace one block while preserving every byte outside its range. */
export function replaceBlock(document: MarkdownDocument, id: string, expected: string, replacement: string): MarkdownDocument {
    const block = document.blocks.find(item => item.id === id);
    if (!block) fail('The block no longer exists.');
    return applySourceEdits(document, [{ start: block.start, end: block.end, expected, insert: replacement }]);
}

/** Anchors can target one block or an ordered selection of multiple blocks. */
export function createBlockAnchor(document: MarkdownDocument, ids: readonly string[]): BlockAnchor {
    const selected = new Set(ids);
    const blocks = document.blocks.filter(block => selected.has(block.id));
    if (!blocks.length || blocks.length !== selected.size) fail('Select existing blocks to annotate.');
    return { version: 1, blocks: blocks.map(({ id, source }) => ({ id, source })) };
}

export function resolveBlockAnchor(document: MarkdownDocument, anchor: BlockAnchor): AnchorResolution {
    const lookup = new Map(document.blocks.map(block => [block.id, block]));
    const blocks: MarkdownBlock[] = [], missingIds: string[] = [];
    let changed = false;
    for (const target of anchor.blocks) {
        const block = lookup.get(target.id);
        if (!block) missingIds.push(target.id);
        else { blocks.push(block); changed ||= block.source !== target.source; }
    }
    return { status: !blocks.length ? 'orphaned' : missingIds.length ? 'partial' : changed ? 'changed' : 'attached', blocks, missingIds };
}
