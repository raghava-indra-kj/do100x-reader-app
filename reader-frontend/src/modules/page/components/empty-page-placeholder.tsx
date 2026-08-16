import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@domain/page/models/page';
import { PageListItem } from '@domain/page/models/page-list-item';
import { queryPages } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import { pagesPageWithIdRouteValue } from '@boot/routes';
import { usePageStore } from '../store';
import { UpsertPageDialog } from './upsert-page';
import { Button } from '@modules/core/ui/primitives/button';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import {
    BookOpen,
    FileText,
    FilePlus,
    Pencil,
    ClipboardPaste,
    ChevronRight,
    Sparkles,
    FolderTree,
    Layers,
} from 'lucide-react';

export interface EmptyPagePlaceholderProps {
    page: Page;
}

export const EmptyPagePlaceholder = observer(function EmptyPagePlaceholder({ page }: EmptyPagePlaceholderProps) {
    const store = usePageStore();
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    const [subpagesState, setSubpagesState] = useState<DataState<PageListItem[]>>(DataState.init);
    const [editPageOpen, setEditPageOpen] = useState(false);
    const [createSubpageOpen, setCreateSubpageOpen] = useState(false);

    const loadSubpages = useCallback(() => {
        setSubpagesState(DataState.loading());
        queryPages({ parentPageId: page.id }).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setSubpagesState(DataState.data(result.data));
            } else {
                setSubpagesState(DataState.error(result.error));
            }
        });
    }, [page.id]);

    useEffect(() => {
        mountedRef.current = true;
        loadSubpages();
        return () => {
            mountedRef.current = false;
        };
    }, [loadSubpages]);

    const subpages = subpagesState.ifLoadedOr({
        loaded: (list) => list,
        or: () => [] as PageListItem[],
    });

    const hasSubpages = subpages.length > 0;

    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                toast.error('Clipboard is empty');
                return;
            }
            setEditPageOpen(true);
        } catch {
            setEditPageOpen(true);
        }
    }, []);

    return (
        <div className="mx-auto max-w-[var(--container-prose-2xwide)] px-6 py-12">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-8 shadow-sm transition-all duration-200">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-soft)] text-[var(--color-brand)] border border-[var(--color-border-subtle)]">
                                {hasSubpages ? <FolderTree size={22} /> : <BookOpen size={22} />}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--color-text-strong)] tracking-tight">
                                    {page.title}
                                </h1>
                                {page.category && (
                                    <span className="inline-block mt-0.5 rounded-md bg-[var(--color-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                                        {page.category}
                                    </span>
                                )}
                            </div>
                        </div>

                        {store.isOwner && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outlined"
                                    size="sm"
                                    onClick={() => setCreateSubpageOpen(true)}
                                    className="flex items-center gap-1.5"
                                >
                                    <FilePlus size={14} />
                                    <span>New Subpage</span>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setEditPageOpen(true)}
                                    className="flex items-center gap-1.5"
                                >
                                    <Pencil size={14} />
                                    <span>Add Content</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
                        {hasSubpages
                            ? `This page currently serves as a container with ${subpages.length} subpage${subpages.length === 1 ? '' : 's'}. You can explore the subpages below or add written content directly to this page.`
                            : 'This page is empty. Start writing notes, paste markdown content, or create subpages to organize your thoughts.'}
                    </p>
                </div>
            </div>

            {/* Quick Action Onboarding (When completely empty with no subpages and user is owner) */}
            {store.isOwner && !hasSubpages && subpagesState.isLoaded && (
                <div className="mt-8">
                    <h2 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[var(--color-brand)]" />
                        <span>Quick Actions</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Action 1: Write Content */}
                        <div
                            onClick={() => setEditPageOpen(true)}
                            className="group relative cursor-pointer rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-5 transition-all duration-200 hover:border-[var(--color-brand)] hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-brand)] group-hover:scale-105 transition-transform">
                                    <Pencil size={18} />
                                </div>
                                <ChevronRight size={16} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)] transition-colors">
                                Write Markdown
                            </h3>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                                Add notes, headers, code blocks, or documentation to this page.
                            </p>
                        </div>

                        {/* Action 2: Create Subpage */}
                        <div
                            onClick={() => setCreateSubpageOpen(true)}
                            className="group relative cursor-pointer rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-5 transition-all duration-200 hover:border-[var(--color-brand)] hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-brand)] group-hover:scale-105 transition-transform">
                                    <FilePlus size={18} />
                                </div>
                                <ChevronRight size={16} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)] transition-colors">
                                Create a Subpage
                            </h3>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                                Nest a child page under this section to build a structured hierarchy.
                            </p>
                        </div>

                        {/* Action 3: Paste from Clipboard */}
                        <div
                            onClick={handlePasteFromClipboard}
                            className="group relative cursor-pointer rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-5 transition-all duration-200 hover:border-[var(--color-brand)] hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-brand)] group-hover:scale-105 transition-transform">
                                    <ClipboardPaste size={18} />
                                </div>
                                <ChevronRight size={16} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)] transition-colors">
                                Paste Content
                            </h3>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
                                Paste formatted Markdown or copied articles directly into the editor.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Subpages Explorer Section (When subpages exist) */}
            {hasSubpages && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-[var(--color-brand)]" />
                            <span>Subpages in this Section ({subpages.length})</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subpages.map((subpage) => (
                            <div
                                key={subpage.id}
                                onClick={() => navigate(pagesPageWithIdRouteValue(subpage.id))}
                                className="group flex flex-col justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-4 transition-all duration-150 hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-soft)] hover:shadow-sm cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] group-hover:text-[var(--color-brand)] group-hover:bg-[var(--color-surface-canvas)] transition-colors">
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-[var(--color-text-strong)] truncate group-hover:text-[var(--color-brand)] transition-colors">
                                            {subpage.title}
                                        </h4>
                                        {subpage.category && (
                                            <span className="inline-block mt-1 text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider truncate">
                                                {subpage.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-subtle)]">
                                    <span>{new Date(subpage.createdAt).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 text-[var(--color-brand)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open <ChevronRight size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Subpages Loading State */}
            {subpagesState.isLoading && (
                <div className="flex items-center justify-center p-8 mt-6">
                    <Loader />
                </div>
            )}

            {/* Edit Current Page Dialog */}
            {store.isOwner && (
                <UpsertPageDialog
                    open={editPageOpen}
                    onOpenChange={setEditPageOpen}
                    parentPageId={page.parentPageId}
                    editPageId={page.id}
                    initialTitle={page.title}
                    initialContent={page.content}
                    initialCategory={page.category}
                />
            )}

            {/* Create Subpage Dialog */}
            {store.isOwner && (
                <UpsertPageDialog
                    open={createSubpageOpen}
                    onOpenChange={(open) => {
                        setCreateSubpageOpen(open);
                        if (!open) loadSubpages();
                    }}
                    parentPageId={page.id}
                />
            )}
        </div>
    );
});
