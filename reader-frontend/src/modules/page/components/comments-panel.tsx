import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageStore } from '../store';
import { getComments, editComment, deleteComment } from '@domain/comment/services/comments-service';
import type { Comment } from '@domain/comment/models/comment';
import { DataState } from '@lib/utils/data-state';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { MessageSquare, Pencil, Trash2, X, Check } from 'lucide-react';

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

function CommentCard({
    comment,
    onEdited,
    onDeleted,
}: {
    comment: Comment;
    onEdited: () => void;
    onDeleted: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editBody, setEditBody] = useState(comment.body);
    const [isSaving, setIsSaving] = useState(false);
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

    return (
        <div className="group rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-3 transition-colors hover:border-[var(--color-border-default)]">
            {/* Section title breadcrumb */}
            {comment.sectionTitle && (
                <div className="mb-1.5 text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider truncate">
                    {comment.sectionTitle}
                </div>
            )}

            {/* Selected text quote */}
            <div className="mb-2 rounded-md bg-[var(--color-surface-soft)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] border-l-2 border-[var(--color-brand)] leading-relaxed">
                <span className="line-clamp-3">{comment.selectedText}</span>
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

            {/* Footer: timestamp + actions */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--color-border-subtle)]">
                <span className="text-[10px] text-[var(--color-text-subtle)]">
                    {formatRelativeTime(comment.createdAt)}
                </span>
                {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => { setEditBody(comment.body); setIsEditing(true); }}
                            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                            title="Edit comment"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                            title="Delete comment"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export const PageComments = observer(function PageComments() {
    const store = usePageStore();
    const [dataState, setDataState] = useState<DataState<Comment[]>>(DataState.init);
    const mountedRef = useRef(true);

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

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between shrink-0 px-3 pt-3 pb-0">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">Comments</span>
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
