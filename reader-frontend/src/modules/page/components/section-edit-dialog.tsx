import { useEffect, useId, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Copy, X } from 'lucide-react';
import { editableSectionBody, replaceSectionBody, sectionBodyTarget, type MarkdownSectionRange } from '@reader/md-ast';
import { MarkdownRenderer } from '@reader/md-view';
import type { Page } from '@domain/page/models/page';
import type { SectionEditSnapshot } from '@domain/page/models/section-edit';
import { getSectionEditSnapshot, saveSectionBody } from '@domain/page/services/pages-service';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { useThemeStore } from '@modules/core/theme';
import { PageColorSchema } from '../theme/page-color-schema';
import { usePageStore } from '../store';
import { setDialogConsuming } from '../clipboard-paste';

type TargetSnapshot = SectionEditSnapshot['sections'][number];

export const SectionEditDialog = observer(function SectionEditDialog({ page, range, onClose }: {
    page: Page;
    range: MarkdownSectionRange;
    onClose: () => void;
}) {
    const store = usePageStore();
    const themeStore = useThemeStore();
    const titleId = useId();
    const scopeId = useId();
    const original = editableSectionBody(page.content, range);
    const [draft, setDraft] = useState(original);
    const [snapshot, setSnapshot] = useState<TargetSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'preview' | 'compare'>('preview');
    const [copied, setCopied] = useState(false);
    const dirty = draft !== original;
    const schema = PageColorSchema.VALUES.find((item) => item.id === themeStore.theme.value) ?? PageColorSchema.LIGHT;
    const uiSettings = store.uiSettingsStore;

    useEffect(() => {
        let cancelled = false;
        setDialogConsuming(true);
        getSectionEditSnapshot(page.id).then((result) => {
            if (cancelled) return;
            if (!result.ok) { setError(result.error.message); return; }
            if (result.data.contentVersion !== page.contentVersion) { setError('The page changed since you opened it. Copy your draft, then close and reload the page.'); return; }
            const target = result.data.sections.find((item) => item.range.kind === range.kind && item.range.bodyStart === range.bodyStart && item.range.headingStart === range.headingStart);
            if (!target || target.target.expectedBody !== page.content.slice(range.bodyStart, range.bodyEnd)) {
                setError('This section no longer matches the displayed page. Reload the page before editing.'); return;
            }
            setSnapshot(target);
        });
        return () => { cancelled = true; setDialogConsuming(false); };
    }, [page.id, page.contentVersion, range.bodyStart, range.headingStart]);

    useEffect(() => {
        const protect = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', protect);
        return () => window.removeEventListener('beforeunload', protect);
    }, [dirty]);

    const validationError = useMemo(() => {
        try { replaceSectionBody({ source: page.content, target: sectionBodyTarget(page.content, range), newBody: draft }); return null; }
        catch (caught) { return caught instanceof Error ? caught.message : 'Invalid section body'; }
    }, [page.content, range, draft]);

    const close = () => {
        if (saving) return;
        if (!dirty || window.confirm('Discard the unsaved section draft?')) onClose();
    };
    const save = async () => {
        if (!snapshot || !dirty || saving || validationError) return;
        setSaving(true);
        setError(null);
        const result = await saveSectionBody({ pageId: page.id, contentVersion: page.contentVersion, target: snapshot.target, expectedBodyHash: snapshot.expectedBodyHash, newBody: draft });
        setSaving(false);
        if (!result.ok) { setError(result.error.message); return; }
        onClose();
        await store.loadPage();
    };

    return (
        <Dialog open labelledBy={titleId} describedBy={scopeId} onOpenChange={(open) => { if (!open) close(); }} className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
                <div className="min-w-0">
                    <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-strong)]">Edit section</h2>
                    <p className="truncate text-sm text-[var(--color-text-muted)]">{page.title} / {range.title ?? 'Introduction / page body'}</p>
                </div>
                <Button variant="outlined" iconOnly title="Close section editor" aria-label="Close section editor" onClick={close} disabled={saving}><X size={18} /></Button>
            </header>
            <p id={scopeId} className="shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] px-5 py-3 text-xs text-[var(--color-text-muted)]">
                Only this section’s body will change. Its heading, child sections, page details, and all other sections are protected. Use full-page editing to change headings.
            </p>
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
                <div className="flex min-h-0 flex-col border-b border-[var(--color-border-default)] md:border-b-0 md:border-r">
                    <div className="flex shrink-0 items-center justify-between px-5 py-3">
                        <label htmlFor="section-markdown" className="text-sm font-semibold">Markdown</label>
                        <button type="button" title={copied ? 'Draft copied' : 'Copy draft'} aria-label="Copy draft" className="rounded p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]" onClick={async () => {
                            try { await navigator.clipboard.writeText(draft); setCopied(true); } catch { setError('Could not copy. Select the draft text and copy it manually.'); }
                        }}><Copy size={15} /></button>
                    </div>
                    <textarea id="section-markdown" value={draft} onChange={(event) => { setDraft(event.target.value); setCopied(false); }} readOnly={saving} autoFocus spellCheck={false}
                        className="min-h-0 flex-1 resize-none bg-[var(--color-surface-canvas)] px-5 pb-5 font-mono text-sm leading-relaxed text-[var(--color-text-strong)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]" />
                </div>
                <div className="flex min-h-0 flex-col">
                    <div className="flex shrink-0 gap-2 px-5 py-3" role="tablist" aria-label="Section review">
                        {(['preview', 'compare'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-md px-3 py-1.5 text-sm ${tab === value ? 'bg-[var(--color-surface-soft)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>{value === 'preview' ? 'Preview' : 'Compare'}</button>)}
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto p-5" role="tabpanel">
                        {tab === 'preview' ? <MarkdownRenderer markdown={[range.rawHeading, draft].filter(Boolean).join('\n\n')} colors={schema.value} fontSizes={uiSettings.fontSize.value} fonts={uiSettings.fontFamilies.value} /> : <div className="space-y-5">
                            <div><h3 className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Original body</h3><pre className="overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-3 text-xs">{original || '(empty)'}</pre></div>
                            <div><h3 className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Proposed body</h3><pre className="overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-3 text-xs">{draft || '(empty)'}</pre></div>
                        </div>}
                    </div>
                </div>
            </div>
            {(validationError || error) && <p role="alert" className="shrink-0 border-t border-[var(--color-border-default)] px-5 py-3 text-sm text-[var(--color-error)]">{validationError || error}</p>}
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-5 py-4">
                <span className="text-xs text-[var(--color-text-muted)]">{error ? 'Draft preserved. Copy it before closing or reloading.' : snapshot ? 'Markdown remains the source of truth.' : 'Checking the latest page…'}</span>
                <div className="flex gap-3"><Button variant="outlined" onClick={close} disabled={saving}>Cancel</Button><Button onClick={save} loading={saving} disabled={!snapshot || !dirty || Boolean(validationError)}>Save section</Button></div>
            </footer>
        </Dialog>
    );
});
