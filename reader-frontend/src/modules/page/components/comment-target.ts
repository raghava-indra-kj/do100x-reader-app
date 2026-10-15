import { selectionToAnchor } from '@reader/md-view';
import type { AnnotationAnchor, MarkdownDocument } from '@reader/md-ast';

export interface CommentTarget {
    anchor?: AnnotationAnchor;
    contentVersion: number;
    document: MarkdownDocument | null;
    blockIds: string[];
    error?: string;
}
export interface BlockCommentSelection {
    anchor: AnnotationAnchor;
    contentVersion: number;
    rect: DOMRect;
}

/** Capture once, when the user selects. Never reinterpret an old DOM range after a save. */
export function captureCommentTarget(root: HTMLElement | null, document: MarkdownDocument | null, contentVersion: number, range: Range): CommentTarget {
    const base = { contentVersion, document, blockIds: [] as string[] };
    if (!root || !document) return { ...base, error: 'Precise attachment is unavailable for this view. You can still save a page note.' };
    try {
        const result = selectionToAnchor(root, document, range);
        if (result.status === 'attached') return { ...base, anchor: result.anchor };
        if (result.status === 'unmapped' && result.reason === 'custom-content') return { ...base, blockIds: result.blockIds, error: 'This content supports whole-block comments. Choose the blocks below, or save a page note.' };
        return { ...base, error: 'This selection cannot be attached precisely. Select the passage again.' };
    } catch {
        return { ...base, error: 'This selection no longer matches the page. Select the passage again.' };
    }
}
