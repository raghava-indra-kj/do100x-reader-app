import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageStore } from '../store';
import { getComments, editComment, deleteComment } from '@domain/comment/services/comments-service';
import type { Comment } from '@domain/comment/models/comment';
import { DataState } from '@lib/utils/data-state';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Input } from '@modules/core/ui/primitives/input';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { MessageSquare, Pencil, Trash2, X, Check, Copy, ChevronsDown, ChevronsUp, ChevronDown, ChevronRight, Link, Unlink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pagesPageWithIdRouteValue } from '@boot/routes';

function formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

function formatCommentForCopy(comment: Comment): string {
    const parts: string[] = [];
    if (comment.sectionTitle) {
        parts.push(`[${comment.sectionTitle}]`);
    }
    parts.push(`"${comment.selectedText}"`);
    if (comment.body) {
        parts.push(`→ ${comment.body}`);
    }
    return parts.join('\n');
}

function CommentCard({
    comment,
    isExpanded,
    onToggleExpand,
    onEdited,
    onDeleted,
}: {
    comment: Comment;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdited: () => void;
    onDeleted: () => void;
}) {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [editBody, setEditBody] = useState(comment.body);
    const [isSaving, setIsSaving] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkPageId, setLinkPageId] = useState(comment.linkedPageId ?? '');
    const [isSavingLink, setIsSavingLink] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.value.length;
        }
    }, [isEditing]);

    const handleSave = useCallback(async () => {
        if (!editBody.trim() || isSaving) return;
        setIsSaving(true);
        const result = await editComment({ commentId: comment.id, body: editBody.trim() });
        setIsSaving(false);
        if (result.ok) {
            setIsEditing(false);
            onEdited();
        }
    }, [comment.id, editBody, isSaving, onEdited]);

    const handleDelete = useCallback(async () => {
        const result = await deleteComment({ commentId: comment.id });
        if (result.ok) {
            onDeleted();
        }
    }, [comment.id, onDeleted]);

    const handleSaveLink = useCallback(async () => {
        if (isSavingLink) return;
        setIsSavingLink(true);
        const newLinkedPageId = linkPageId.trim() || null;
        const result = await editComment({
            commentId: comment.id,
            body: comment.body,
            linkedPageId: newLinkedPageId,
        });
        setIsSavingLink(false);
        if (result.ok) {
            setIsLinking(false);
            onEdited();
        }
    }, [comment.id, comment.body, linkPageId, isSavingLink, onEdited]);

    const handleUnlink = useCallback(async () => {
        const result = await editComment({
            commentId: comment.id,
            body: comment.body,
            linkedPageId: null,
        });
        if (result.ok) {
            setLinkPageId('');
            onEdited();
        }
    }, [comment.id, comment.body, onEdited]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditBody(comment.body);
        }
    };

    const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveLink();
        }
        if (e.key === 'Escape') {
            setIsLinking(false);
            setLinkPageId(comment.linkedPageId ?? '');
        }
    };

    return (
        <div className="group rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] transition-colors hover:border-[var(--color-border-default)]">
            {/* Collapsed header — always visible */}
            <button
                onClick={onToggleExpand}
                className="flex items-center gap-2 w-full px-3 py-2 text-left cursor-pointer"
            >
                {isExpanded
                    ? <ChevronDown size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                    : <ChevronRight size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                }
                <div className="flex-1 min-w-0">
                    {comment.sectionTitle && (
                        <div className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider truncate">
                            {comment.sectionTitle}
                        </div>
                    )}
                    <div className="text-xs text-[var(--color-text-muted)] truncate">
                        {comment.selectedText}
                    </div>
                </div>
                {comment.linkedPageId && (
                    <Link size={11} className="shrink-0 text-[var(--color-brand)]" />
                )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                    {/* Selected text quote */}
                    <div className="mb-2 rounded-md bg-[var(--color-surface-soft)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] border-l-2 border-[var(--color-brand)] leading-relaxed whitespace-pre-wrap">
                        {comment.selectedText}
                    </div>

                    {/* Comment body */}
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                            <textarea
                                ref={textareaRef}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-2 text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-brand)] resize-none h-20"
                            />
                            <div className="flex items-center justify-end gap-1">
                                <button
                                    onClick={() => { setIsEditing(false); setEditBody(comment.body); }}
                                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                >
                                    <X size={11} />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!editBody.trim() || isSaving}
                                    className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
                                        editBody.trim() && !isSaving
                                            ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] cursor-pointer hover:bg-[var(--color-brand-hover)]'
                                            : 'bg-[var(--color-surface-soft)] text-[var(--color-text-body)] opacity-40 cursor-not-allowed'
                                    }`}
                                >
                                    <Check size={11} />
                                    <span>{isSaving ? 'Saving…' : 'Save'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                    )}

                    {/* Linked page */}
                    {isLinking ? (
                        <div className="flex items-center gap-1.5 mt-2">
                            <Input
                                size="sm"
                                value={linkPageId}
                                onChange={(e) => setLinkPageId(e.target.value)}
                                onKeyDown={handleLinkKeyDown}
                                placeholder="Paste page ID…"
                                autoComplete="off"
                                autoFocus
                                className="flex-1 text-xs"
                            />
                            <button
                                onClick={handleSaveLink}
                                disabled={isSavingLink}
                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                title="Save link"
                            >
                                <Check size={12} />
                            </button>
                            <button
                                onClick={() => { setIsLinking(false); setLinkPageId(comment.linkedPageId ?? ''); }}
                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                title="Cancel"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : comment.linkedPageId ? (
                        <div className="flex items-center gap-1.5 mt-2">
                            <Link size={11} className="shrink-0 text-[var(--color-brand)]" />
                            <button
                                onClick={() => navigate(pagesPageWithIdRouteValue(comment.linkedPageId!))}
                                className="text-[10px] text-[var(--color-brand)] hover:underline cursor-pointer truncate"
                                title={`Go to linked page: ${comment.linkedPageId}`}
                            >
                                {comment.linkedPageId}
                            </button>
                            <button
                                onClick={handleUnlink}
                                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                title="Remove link"
                            >
                                <Unlink size={11} />
                            </button>
                        </div>
                    ) : null}

                    {/* Footer: timestamp + actions */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--color-border-subtle)]">
                        <span className="text-[10px] text-[var(--color-text-subtle)]">
                            {formatRelativeTime(comment.createdAt)}
                        </span>
                        {!isEditing && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip content="Link page">
                                    <button
                                        onClick={() => { setLinkPageId(comment.linkedPageId ?? ''); setIsLinking(true); }}
                                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                    >
                                        <Link size={12} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Edit comment">
                                    <button
                                        onClick={() => { setEditBody(comment.body); setIsEditing(true); }}
                                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Delete comment">
                                    <button
                                        onClick={handleDelete}
                                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const PageComments = observer(function PageComments() {
    const store = usePageStore();
    const [dataState, setDataState] = useState<DataState<Comment[]>>(DataState.init);
    const mountedRef = useRef(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [copyFeedback, setCopyFeedback] = useState(false);

    const load = useCallback(() => {
        setDataState(DataState.loading());
        getComments({ pageId: store.pageId }).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setDataState(DataState.data(result.data));
            } else {
                setDataState(DataState.error(result.error));
            }
        });
    }, [store.pageId]);

    useEffect(() => {
        mountedRef.current = true;
        load();
        return () => {
            mountedRef.current = false;
        };
    }, [load]);

    const comments = dataState.ifLoadedOr({ loaded: (c) => c, or: () => [] as Comment[] });
    const allExpanded = comments.length > 0 && comments.every((c) => expandedIds.has(c.id));

    const toggleExpand = useCallback((commentId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (allExpanded) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(comments.map((c) => c.id)));
        }
    }, [allExpanded, comments]);

    const handleCopyAll = useCallback(() => {
        if (comments.length === 0) return;
        const text = comments.map(formatCommentForCopy).join('\n\n---\n\n');
        navigator.clipboard.writeText(text);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1500);
    }, [comments]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-0">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">Comments</span>
                {comments.length > 0 && (
                    <div className="flex items-center gap-0.5">
                        <Tooltip content={copyFeedback ? 'Copied!' : 'Copy all comments'}>
                            <button
                                onClick={handleCopyAll}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                    copyFeedback
                                        ? 'text-[var(--color-brand)]'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                                }`}
                            >
                                {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </Tooltip>
                        <Tooltip content={allExpanded ? 'Collapse all' : 'Expand all'}>
                            <button
                                onClick={toggleAll}
                                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer rounded"
                            >
                                {allExpanded ? <ChevronsUp size={14} /> : <ChevronsDown size={14} />}
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {dataState.fold({
                    pending: () => (
                        <div className="flex items-center justify-center p-8">
                            <Loader />
                        </div>
                    ),
                    loaded: (comments) => {
                        if (comments.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center flex-1 gap-2 p-8 text-center">
                                    <MessageSquare size={24} className="text-[var(--color-text-subtle)]" />
                                    <p className="text-sm text-[var(--color-text-muted)]">No comments yet</p>
                                    <p className="text-xs text-[var(--color-text-subtle)]">Select text on the page to add a comment</p>
                                </div>
                            );
                        }
                        return (
                            <div className="flex flex-col gap-2 p-3">
                                {comments.map((comment) => (
                                    <CommentCard
                                        key={comment.id}
                                        comment={comment}
                                        isExpanded={expandedIds.has(comment.id)}
                                        onToggleExpand={() => toggleExpand(comment.id)}
                                        onEdited={load}
                                        onDeleted={load}
                                    />
                                ))}
                            </div>
                        );
                    },
                    error: () => (
                        <div className="p-4 text-sm text-[var(--color-text-error)]">Failed to load comments</div>
                    ),
                })}
            </div>
        </div>
    );
});
