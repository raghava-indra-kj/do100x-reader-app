import { createPage, editPage, getPage } from "@domain/page/services/pages-service";
import type { Page } from "@domain/page/models/page";
import { DataState } from "@lib/utils/data-state";
import { extractFrontmatterTitle, type ExtractedPaste } from "@lib/md-parser";
import { Button } from "@modules/core/ui/primitives/button";
import { Dialog } from "@modules/core/ui/primitives/dialog";
import { FormLabel } from "@modules/core/ui/primitives/form-label";
import { Input } from "@modules/core/ui/primitives/input";
import { toast } from "@modules/core/ui/primitives/toast/toast";
import { pagesPageWithIdRouteValue } from "@boot/routes";
import { setDialogConsuming } from "../clipboard-paste";
import { useNavigate } from "react-router-dom";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePageStore } from "../store";
import { useThemeStore } from "@modules/core/theme";
import { PageColorSchema } from "../theme/page-color-schema";
import { MarkdownRenderer } from "@reader/md-view";
import { observer } from "mobx-react-lite";

// Milkdown is needed only when the author opts into visual editing. Keeping it
// out of the normal reader chunk avoids charging every document view for the
// editor's ProseMirror runtime.
const RichMarkdownEditor = lazy(() =>
    import("./rich-markdown-editor").then((module) => ({ default: module.RichMarkdownEditor })),
);

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

/** Raw HTML is intentionally kept in source mode until it is migrated to a
 * Reader Markdown directive. This prevents a visual round-trip from changing
 * unsupported legacy markup invisibly. */
function preferredEditorMode(markdown: string): "visual" | "markdown" {
    return /<(?:callout|details|iframe|audio|video|script|style)\b/i.test(markdown)
        ? "markdown"
        : "visual";
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
    const store = usePageStore();
    const editId = editPageId ?? page?.id;
    const isEdit = !!editId;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [baseRevision, setBaseRevision] = useState(1);
    const [editorMode, setEditorMode] = useState<"visual" | "markdown">("visual");
    const [editorGeneration, setEditorGeneration] = useState(0);
    const [meaningSystemPrompt, setMeaningSystemPrompt] = useState("");
    const [explanationSystemPrompt, setExplanationSystemPrompt] = useState("");
    const [doubtSystemPrompt, setDoubtSystemPrompt] = useState("");
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [submitState, setSubmitState] = useState<DataState<void>>(DataState.init);
    const [readNowOpen, setReadNowOpen] = useState(false);

    const loadingRef = useRef(false);

    useEffect(() => {
        if (!open) {
            setDialogConsuming(false);
            setTitle("");
            setContent("");
            setCategory(null);
            setBaseRevision(1);
            setEditorMode("visual");
            setEditorGeneration(0);
            setMeaningSystemPrompt("");
            setExplanationSystemPrompt("");
            setDoubtSystemPrompt("");
            setIsAdvancedOpen(false);
            setSubmitState(DataState.init());
            loadingRef.current = false;
            return;
        }

        setDialogConsuming(true);

        if (page) {
            setTitle(page.title);
            setContent(page.content ?? "");
            setCategory(page.category);
            setBaseRevision(page.revisionNumber);
            setEditorMode(preferredEditorMode(page.content ?? ""));
            setEditorGeneration((generation) => generation + 1);
            setMeaningSystemPrompt(page.meaningSystemPrompt ?? "");
            setExplanationSystemPrompt(page.explanationSystemPrompt ?? "");
            setDoubtSystemPrompt(page.doubtSystemPrompt ?? "");
            return;
        }

        if (initialTitle !== undefined || initialContent !== undefined || initialCategory !== undefined) {
            setTitle(initialTitle ?? "");
            setContent(initialContent ?? "");
            setCategory(initialCategory ?? null);
            setBaseRevision(1);
            setEditorMode(preferredEditorMode(initialContent ?? ""));
            setEditorGeneration((generation) => generation + 1);
            setMeaningSystemPrompt("");
            setExplanationSystemPrompt("");
            setDoubtSystemPrompt("");
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
                    setBaseRevision(result.data.revisionNumber);
                    setEditorMode(preferredEditorMode(result.data.content ?? ""));
                    setEditorGeneration((generation) => generation + 1);
                    setMeaningSystemPrompt(result.data.meaningSystemPrompt ?? "");
                    setExplanationSystemPrompt(result.data.explanationSystemPrompt ?? "");
                    setDoubtSystemPrompt(result.data.doubtSystemPrompt ?? "");
                }
            });
        }
    }, [open, isEdit, editId, page, initialTitle, initialContent, initialCategory]);

    const applyPaste = useCallback(
        (extracted: ExtractedPaste) => {
            if (extracted.title) setTitle(extracted.title);
            if (extracted.category) setCategory(extracted.category);
            setContent(extracted.content);
            setEditorMode("markdown");
            setEditorGeneration((generation) => generation + 1);
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
        const meaningPromptValue = meaningSystemPrompt.trim() || undefined;
        const explanationPromptValue = explanationSystemPrompt.trim() || undefined;
        const doubtPromptValue = doubtSystemPrompt.trim() || undefined;

        if (isEdit) {
            if (!editId) return;
            const result = await editPage({
                pageId: editId,
                title: title.trim(),
                content,
                category: trimmedCategory,
                baseRevision,
                meaningSystemPrompt: meaningPromptValue,
                explanationSystemPrompt: explanationPromptValue,
                doubtSystemPrompt: doubtPromptValue,
            });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
                store.loadPage();
            } else {
                setSubmitState(DataState.error(result.error));
            }
        } else {
            const result = await createPage({
                parentPageId,
                title: title.trim(),
                content,
                category: trimmedCategory,
                meaningSystemPrompt: meaningPromptValue,
                explanationSystemPrompt: explanationPromptValue,
                doubtSystemPrompt: doubtPromptValue,
            });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
                navigate(pagesPageWithIdRouteValue(result.data));
            } else {
                setSubmitState(DataState.error(result.error));
            }
        }
    }, [title, content, category, baseRevision, isEdit, editId, parentPageId, navigate, onOpenChange, store, meaningSystemPrompt, explanationSystemPrompt, doubtSystemPrompt]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="inset-0 flex h-dvh w-screen max-w-none flex-col overflow-y-auto rounded-none bg-[var(--color-surface-canvas)] p-0 lg:overflow-hidden -translate-x-0 -translate-y-0"
        >
            <div className="flex min-h-0 flex-col lg:flex-1 lg:flex-row">
                <section className="flex min-h-[65dvh] min-w-0 flex-col border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] lg:min-h-0 lg:flex-1 lg:border-b-0 lg:border-r">
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-4 py-3 sm:px-6">
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-strong)]">Content</p>
                            <p className="hidden text-xs text-[var(--color-text-muted)] sm:block">Markdown is saved as the source of truth.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outlined"
                                size="sm"
                                onClick={() => setReadNowOpen(true)}
                                disabled={!content.trim()}
                            >
                                Read Now
                            </Button>
                            <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode("visual")}
                                    className={`rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 transition-colors ${editorMode === "visual" ? "bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]"}`}
                                >
                                    Visual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorMode("markdown")}
                                    className={`rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 transition-colors ${editorMode === "markdown" ? "bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]"}`}
                                >
                                    Markdown
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-1 p-3 sm:p-5">
                        {editorMode === "visual" ? (
                            <Suspense
                                fallback={
                                    <div className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] text-sm text-[var(--color-text-muted)]">
                                        Loading visual editor…
                                    </div>
                                }
                            >
                                <RichMarkdownEditor
                                    key={`reader-editor-${editId ?? "new"}-${editorGeneration}`}
                                    documentKey={`${editId ?? "new"}-${editorGeneration}`}
                                    initialMarkdown={content}
                                    onMarkdownChange={setContent}
                                />
                            </Suspense>
                        ) : (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onPaste={handleTextareaPaste}
                                placeholder="Write your content here…"
                                className="min-h-0 w-full flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-3 font-mono text-sm text-[var(--color-text-strong)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)]"
                            />
                        )}
                    </div>
                </section>
                <aside className="flex w-full shrink-0 flex-col bg-[var(--color-surface-canvas)] lg:w-[22rem]">
                    <div className="shrink-0 border-b border-[var(--color-border-default)] px-5 py-4">
                        <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">
                            {isEdit ? "Edit Page" : "New Page"}
                        </h2>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Page details and writing settings</p>
                    </div>
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                        <div className="flex flex-col gap-2">
                            <FormLabel>Title</FormLabel>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Page title"
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <FormLabel>Category</FormLabel>
                            <Input
                                value={category ?? ""}
                                onChange={(e) => setCategory(e.target.value || null)}
                                placeholder="e.g. Recall, Note"
                            />
                        </div>
                        <div className="border-t border-[var(--color-border-default)] pt-5">
                            <button
                                type="button"
                                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[var(--color-text-body)] hover:text-[var(--color-text-strong)]"
                                aria-expanded={isAdvancedOpen}
                            >
                                <span>AI prompt customizations</span>
                                <span className="text-xs text-[var(--color-text-muted)]">{isAdvancedOpen ? "Hide" : "Optional"}</span>
                            </button>
                            {isAdvancedOpen && (
                                <div className="mt-4 space-y-4">
                                    <div className="space-y-2">
                                        <FormLabel>Prompt for Explanation</FormLabel>
                                        <textarea
                                            value={explanationSystemPrompt}
                                            onChange={(e) => setExplanationSystemPrompt(e.target.value)}
                                            placeholder="Use inherited page prompt..."
                                            className="h-24 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-subtle)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel>Prompt for Meanings</FormLabel>
                                        <textarea
                                            value={meaningSystemPrompt}
                                            onChange={(e) => setMeaningSystemPrompt(e.target.value)}
                                            placeholder="Use inherited page prompt..."
                                            className="h-24 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-subtle)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel>Prompt for Asking Doubts</FormLabel>
                                        <textarea
                                            value={doubtSystemPrompt}
                                            onChange={(e) => setDoubtSystemPrompt(e.target.value)}
                                            placeholder="Use inherited page prompt..."
                                            className="h-24 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-subtle)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        {submitState.isError && (
                            <p className="text-sm text-[var(--color-error)]">{submitState.error.message}</p>
                        )}
                    </div>
                    <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--color-border-default)] px-5 py-4">
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
                </aside>
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
    const schema = PageColorSchema.VALUES.find(s => s.id === themeStore.theme.value) || PageColorSchema.LIGHT;
    const colors = schema.value;

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
