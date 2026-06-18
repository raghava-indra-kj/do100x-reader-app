import { createPage, editPage, getPage } from "@domain/page/services/pages-service";
import type { Page } from "@domain/page/models/page";
import { DataState } from "@lib/utils/data-state";
import { extractFrontmatterTitle, type ExtractedPaste } from "@lib/md-parser";
import { useAuthStore } from "@modules/auth/provider";
import { Button } from "@modules/core/ui/primitives/button";
import { Dialog } from "@modules/core/ui/primitives/dialog";
import { FormLabel } from "@modules/core/ui/primitives/form-label";
import { Input } from "@modules/core/ui/primitives/input";
import { toast } from "@modules/core/ui/primitives/toast/toast";
import { pagesPageWithIdRouteValue } from "@boot/routes";
import { setDialogConsuming } from "../clipboard-paste";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageStore } from "../store";
import { useThemeStore } from "@modules/core/theme";
import { PageColorSchema } from "../theme/page-color-schema";
import { MarkdownRenderer } from "@lib/md-view";
import { observer } from "mobx-react-lite";

export interface UpsertPageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentPageId: string | null;
    page?: Page | null;
    editPageId?: string;
    initialTitle?: string;
    initialContent?: string;
    initialCategory?: string | null;
}

export function UpsertPageDialog({
    open,
    onOpenChange,
    parentPageId,
    page,
    editPageId,
    initialTitle,
    initialContent,
    initialCategory,
}: UpsertPageDialogProps) {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const editId = editPageId ?? page?.id;
    const isEdit = !!editId;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [submitState, setSubmitState] = useState<DataState<void>>(DataState.init);
    const [readNowOpen, setReadNowOpen] = useState(false);

    const loadingRef = useRef(false);

    useEffect(() => {
        if (!open) {
            setDialogConsuming(false);
            setTitle("");
            setContent("");
            setCategory(null);
            setSubmitState(DataState.init());
            loadingRef.current = false;
            return;
        }

        setDialogConsuming(true);

        if (page) {
            setTitle(page.title);
            setContent(page.content ?? "");
            setCategory(page.category);
            return;
        }

        if (initialTitle !== undefined || initialContent !== undefined || initialCategory !== undefined) {
            setTitle(initialTitle ?? "");
            setContent(initialContent ?? "");
            setCategory(initialCategory ?? null);
            return;
        }

        if (isEdit && editId) {
            if (loadingRef.current) return;
            loadingRef.current = true;
            getPage({ pageId: editId }).then((result) => {
                if (!open) return;
                loadingRef.current = false;
                if (result.ok) {
                    setTitle(result.data.title);
                    setContent(result.data.content ?? "");
                    setCategory(result.data.category);
                }
            });
        }
    }, [open, isEdit, editId, page, initialTitle, initialContent, initialCategory]);

    const applyPaste = useCallback(
        (extracted: ExtractedPaste) => {
            if (extracted.title) setTitle(extracted.title);
            if (extracted.category) setCategory(extracted.category);
            setContent(extracted.content);
            toast.success("Pasted content detected with frontmatter");
        },
        [],
    );

    const handleTextareaPaste = useCallback(
        (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const text = e.clipboardData.getData("text/plain");
            if (!text.trim()) return;

            const extracted = extractFrontmatterTitle(text);
            if (extracted.title || extracted.category) {
                e.preventDefault();
                applyPaste(extracted);
            }
        },
        [applyPaste],
    );

    const handleSubmit = useCallback(async () => {
        if (!title.trim()) return;
        setSubmitState(DataState.loading());
        const trimmedCategory = category?.trim() || null;
        if (isEdit) {
            if (!editId) return;
            const result = await editPage({ pageId: editId, title: title.trim(), content, category: trimmedCategory });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
            } else {
                setSubmitState(DataState.error(result.error));
            }
        } else {
            const result = await createPage({
                userId: authStore.currentUser.id,
                parentPageId,
                title: title.trim(),
                content,
                category: trimmedCategory,
            });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
                navigate(pagesPageWithIdRouteValue(result.data));
            } else {
                setSubmitState(DataState.error(result.error));
            }
        }
    }, [title, content, category, isEdit, editId, parentPageId, authStore, navigate, onOpenChange]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0"
        >
            <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">
                    {isEdit ? "Edit Page" : "New Page"}
                </h2>
                <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => setReadNowOpen(true)}
                    disabled={!content.trim()}
                >
                    Read Now
                </Button>
            </div>
            <div className="flex flex-col gap-5 px-6 pb-4 min-h-0 flex-1">
                <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col gap-2 flex-1">
                        <FormLabel>Title</FormLabel>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Page title"
                            autoFocus
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-48 shrink-0">
                        <FormLabel>Category</FormLabel>
                        <Input
                            value={category ?? ""}
                            onChange={(e) => setCategory(e.target.value || null)}
                            placeholder="e.g. Recall, Note"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 min-h-0 flex-1">
                    <FormLabel>Content</FormLabel>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handleTextareaPaste}
                        placeholder="Write your content here…"
                        className="w-full flex-1 resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-4 py-2.5 text-sm rounded-[var(--radius-md)] transition-colors outline-none overflow-y-auto"
                    />
                </div>
                {submitState.isError && (
                    <p className="text-sm shrink-0 text-[var(--color-error)]">
                        {submitState.error.message}
                    </p>
                )}
            </div>
            <div className="flex justify-end gap-3 shrink-0 border-t border-[var(--color-border-default)] px-6 py-4">
                <Button
                    variant="outlined"
                    onClick={() => onOpenChange(false)}
                    disabled={submitState.isLoading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    loading={submitState.isLoading}
                    disabled={!title.trim()}
                >
                    {isEdit ? "Save" : "Create"}
                </Button>
            </div>
            {readNowOpen && (
                <ReadNowDialog
                    open={readNowOpen}
                    onOpenChange={setReadNowOpen}
                    onCloseAll={() => {
                        setReadNowOpen(false);
                        onOpenChange(false);
                    }}
                    title={title}
                    content={content}
                    category={category}
                />
            )}
        </Dialog>
    );
}

const ReadNowDialog = observer(function ReadNowDialog({
    open,
    onOpenChange,
    onCloseAll,
    title,
    content,
    category,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCloseAll: () => void;
    title: string;
    content: string;
    category: string | null;
}) {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const uiSettings = store.uiSettingsStore;
    const colors = themeStore.theme.value === 'dark' ? PageColorSchema.DARK.value : PageColorSchema.LIGHT.value;

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0 bg-[var(--color-surface-canvas)] animate-fade-in"
        >
            <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)]">
                <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">
                    Preview Content
                </h2>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Back to Edit
                    </Button>
                    <Button
                        variant="outlined"
                        size="sm"
                        onClick={onCloseAll}
                    >
                        Close
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)]">
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-serif)] text-[var(--color-text-strong)] mb-2">
                        {title || "Untitled"}
                    </h1>
                    {category && (
                        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">
                            {category}
                        </div>
                    )}
                    <MarkdownRenderer
                        markdown={content}
                        colors={colors}
                        fontSizes={uiSettings.fontSize.value}
                        fonts={uiSettings.fontFamilies.value}
                    />
                </div>
            </div>
        </Dialog>
    );
});
