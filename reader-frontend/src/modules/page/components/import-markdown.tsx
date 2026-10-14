import { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertCircle, CheckCircle2, ExternalLink, FileUp, Loader2, X } from 'lucide-react';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { createPage } from '@domain/page/services/pages-service';
import { Button } from '@modules/core/ui/primitives/button';
import { BaseDialog, Dialog } from '@modules/core/ui/primitives/dialog';
import { Input } from '@modules/core/ui/primitives/input';
import { setDialogConsuming } from '../clipboard-paste';
import { usePageStore } from '../store';
import {
    canImportMarkdownItem,
    importMarkdownFiles,
    markdownFilenameTitle,
    markdownImportTitleError,
    readMarkdownFile,
    MARKDOWN_IMPORT_TITLE_LIMIT,
    type MarkdownImportItem,
} from '../markdown-import';

function fileSizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

const statusLabels = { reading: 'Reading file…', ready: 'Ready', importing: 'Importing…', imported: 'Imported', failed: 'Needs attention' };

export const ImportMarkdownAction = observer(function ImportMarkdownAction({ iconOnly = false }: { iconOnly?: boolean }) {
    const store = usePageStore();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<MarkdownImportItem[]>([]);
    const [busy, setBusy] = useState<'reading' | 'importing' | null>(null);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mountedRef = useRef(true);
    const busyRef = useRef(false);
    const nextIdRef = useRef(0);
    const dialogId = useId();

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!open) return;
        setDialogConsuming(true);
        return () => setDialogConsuming(false);
    }, [open]);

    function updateItem(id: string, changes: Partial<MarkdownImportItem>) {
        setItems(current => current.map(item => item.id === id ? { ...item, ...changes } : item));
    }

    function changeOpen(next: boolean) {
        if (busyRef.current) return;
        setOpen(next);
        if (!next) {
            setItems([]);
            setProgress({ done: 0, total: 0 });
        }
    }

    async function addFiles(files: File[]) {
        if (busyRef.current || !files.length || !store.isOwner) return;
        busyRef.current = true;
        setBusy('reading');
        const selected: MarkdownImportItem[] = files.map(file => ({
            id: String(++nextIdRef.current),
            name: file.name,
            size: file.size,
            title: markdownFilenameTitle(file.name),
            content: null,
            status: 'reading',
            error: null,
            needsReview: false,
            pageId: null,
        }));
        setItems(current => [...current, ...selected]);
        try {
            for (let index = 0; index < files.length; index++) {
                if (!mountedRef.current) break;
                const result = await readMarkdownFile(files[index]);
                if (!mountedRef.current) break;
                updateItem(selected[index].id, result.ok
                    ? { ...result.data, status: 'ready' }
                    : { status: 'failed', error: result.error.message });
            }
        } finally {
            busyRef.current = false;
            if (mountedRef.current) setBusy(null);
        }
    }

    async function startImport() {
        if (busyRef.current || !store.isOwner) return;
        const pending = items.filter(canImportMarkdownItem);
        if (!pending.length) return;
        busyRef.current = true;
        setBusy('importing');
        setProgress({ done: 0, total: pending.length });
        try {
            const imported = await importMarkdownFiles({
                items: pending,
                parentPageId: store.pageId,
                createPage,
                isActive: () => mountedRef.current && store.isOwner,
                onItemChange: (id, changes) => {
                    updateItem(id, changes);
                    if (changes.status === 'imported' || changes.status === 'failed') {
                        setProgress(current => ({ ...current, done: current.done + 1 }));
                    }
                },
            });
            if (imported > 0) store.bumpSubpagesVersion();
        } finally {
            busyRef.current = false;
            if (mountedRef.current) setBusy(null);
        }
    }

    if (!store.isOwner) return null;
    const importedCount = items.filter(item => item.status === 'imported').length;
    const pending = items.filter(canImportMarkdownItem);
    const hasValidTitle = pending.some(item => !markdownImportTitleError(item.title));
    const needsAttention = items.filter(item => item.status === 'failed' || (item.status === 'ready' && markdownImportTitleError(item.title))).length;
    const retryOnly = pending.length > 0 && pending.every(item => item.status === 'failed');

    return <>
        <Button type="button" variant={iconOnly ? 'ghost' : 'outlined'} size="sm" iconOnly={iconOnly}
            onClick={() => changeOpen(true)} aria-label="Import Markdown" tooltip={iconOnly ? 'Import Markdown' : undefined}>
            <FileUp size={14} aria-hidden="true" />{!iconOnly && 'Import Markdown'}
        </Button>
        <Dialog open={open} onOpenChange={changeOpen} labelledBy={`${dialogId}-title`} describedBy={`${dialogId}-description`}
            className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col p-0">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-default)] p-4">
                <div className="min-w-0">
                    <BaseDialog.Title id={`${dialogId}-title`} className="text-lg font-semibold text-[var(--color-text-strong)]">Import Markdown</BaseDialog.Title>
                    <BaseDialog.Description id={`${dialogId}-description`} className="mt-1 break-words text-sm text-[var(--color-text-muted)]">
                        Add one page per file under “{store.optCurrentPage?.title}”. Existing pages won’t change.
                    </BaseDialog.Description>
                </div>
                <Button type="button" variant="ghost" size="sm" iconOnly aria-label="Close import" disabled={!!busy} onClick={() => changeOpen(false)}>
                    <X size={16} aria-hidden="true" />
                </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <input ref={fileInputRef} type="file" multiple accept=".md,.markdown" className="hidden" aria-label="Choose Markdown files"
                    onChange={event => {
                        const files = Array.from(event.currentTarget.files ?? []);
                        event.currentTarget.value = '';
                        void addFiles(files);
                    }} />
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outlined" size="sm" disabled={!!busy} onClick={() => fileInputRef.current?.click()}>
                        <FileUp size={14} aria-hidden="true" />{items.length ? 'Add files' : 'Choose files'}
                    </Button>
                    <p className="text-xs text-[var(--color-text-muted)]">.md or .markdown · UTF-8 · 10 MiB save limit per page</p>
                </div>
                {!items.length && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Choose one or more files, then review their titles.</p>}
                {!!items.length && <ul className="mt-4 space-y-3" aria-label="Files to import">
                    {items.map(item => {
                        const titleError = item.content !== null ? markdownImportTitleError(item.title) : null;
                        const error = titleError ?? item.error;
                        const titleId = `${dialogId}-file-${item.id}`;
                        const errorId = `${titleId}-error`;
                        return <li key={item.id} className="rounded-lg border border-[var(--color-border-default)] p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="break-all text-sm font-medium text-[var(--color-text-strong)]">{item.name}</p>
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                                        {item.status === 'imported' && <CheckCircle2 size={13} aria-hidden="true" className="text-[var(--color-success)]" />}
                                        {item.status === 'failed' && <AlertCircle size={13} aria-hidden="true" className="text-[var(--color-error)]" />}
                                        {(item.status === 'reading' || item.status === 'importing') && <Loader2 size={13} aria-hidden="true" className="animate-spin" />}
                                        {fileSizeLabel(item.size)} · {statusLabels[item.status]}
                                    </p>
                                </div>
                                {item.pageId
                                    ? <a href={readerPageWithIdRouteValue(item.pageId)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-brand)] underline underline-offset-2"
                                        aria-label={`Open ${item.title} in a new tab`}>Open page<ExternalLink size={12} aria-hidden="true" /></a>
                                    : <Button type="button" variant="ghost" size="sm" iconOnly aria-label={`Remove ${item.name}`} disabled={!!busy}
                                        onClick={() => setItems(current => current.filter(file => file.id !== item.id))}><X size={14} aria-hidden="true" /></Button>}
                            </div>
                            <label htmlFor={titleId} className="mt-3 block text-xs font-medium text-[var(--color-text-muted)]">Page title</label>
                            <Input id={titleId} size="sm" className="mt-1" value={item.title} maxLength={MARKDOWN_IMPORT_TITLE_LIMIT}
                                disabled={!!busy || item.status === 'imported' || item.content === null}
                                aria-invalid={!!titleError} aria-describedby={error ? errorId : undefined}
                                onChange={event => updateItem(item.id, { title: event.target.value })} />
                            {error && <p id={errorId} className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
                            {item.needsReview && <div className="mt-2 flex flex-wrap items-center gap-3">
                                <a href={readerPageWithIdRouteValue(store.pageId)} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-[var(--color-brand)] underline underline-offset-2">Check subpages in a new tab</a>
                                <Button type="button" variant="outlined" size="sm" disabled={!!busy}
                                    onClick={() => updateItem(item.id, { needsReview: false, error: null, status: 'ready' })}>Not saved — allow retry</Button>
                            </div>}
                        </li>;
                    })}
                </ul>}
            </div>
            <footer className="shrink-0 space-y-3 border-t border-[var(--color-border-default)] p-4">
                <div role="status" aria-live="polite" aria-atomic="true" className="text-sm text-[var(--color-text-muted)]">
                    {busy === 'reading' ? 'Reading files…' : busy === 'importing'
                        ? `Importing files… ${progress.done} of ${progress.total} finished.`
                        : items.length ? `${importedCount} imported${needsAttention ? ` · ${needsAttention} need attention` : ''}${pending.length ? ` · ${pending.length} to import` : ''}` : 'No files selected'}
                </div>
                {busy === 'importing' && <progress value={progress.done} max={progress.total} className="h-1.5 w-full accent-[var(--color-brand)]" aria-label="Import progress" />}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outlined" size="sm" disabled={!!busy} onClick={() => changeOpen(false)}>{importedCount ? 'Done' : 'Cancel'}</Button>
                    <Button type="button" size="sm" loading={busy === 'importing'} disabled={!!busy || !hasValidTitle} onClick={() => void startImport()}>
                        {retryOnly ? 'Retry' : 'Import'}{pending.length ? ` ${pending.length} ${pending.length === 1 ? 'file' : 'files'}` : ' files'}
                    </Button>
                </div>
            </footer>
        </Dialog>
    </>;
});
