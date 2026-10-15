import type { Comment } from '@domain/comment/models/comment';
export type CommentFilter = 'active' | 'attention' | 'history';
export function commentInFilter(comment: Comment, filter: CommentFilter): boolean {
    const history = Boolean(comment.resolvedAt) || comment.anchor?.status === 'source-removed';
    return filter === 'history' ? history : filter === 'attention' ? !history && ['partial', 'ambiguous'].includes(comment.anchor?.status ?? '') : !history;
}
export function commentSourceLabel(comment: Comment): string | null {
    if (comment.resolvedAt) return 'Resolved';
    if (!comment.anchor) return 'Page note';
    return ({ attached: null, changed: 'Source edited', partial: 'Some source removed', 'source-removed': 'Source removed', ambiguous: 'Needs reattachment' })[comment.anchor.status];
}
