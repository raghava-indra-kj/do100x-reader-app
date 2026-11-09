import { useEffect, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { settingsPageRoute } from '@boot/routes';
import { getModelConfig } from '@domain/settings/services/settings-service';
import { PAGE_ANNOTATION_KINDS, PAGE_ANNOTATION_KIND_LABELS, type PageAnnotationKind } from '@domain/page-annotation/models/page-annotation';
import type { PageAnnotationTarget } from '../page-annotation-target';
import { usePageStore } from '../store';

const KIND_HINTS: Record<PageAnnotationKind, string> = {
    summary: 'A short overview of the section',
    key_takeaway: 'The ideas worth remembering',
    try_this: 'An exercise or example to apply it',
    be_aware: 'Pitfalls and common mistakes',
    diagram: 'A Mermaid diagram for text that is hard to follow',
};

const TEXT_KINDS = PAGE_ANNOTATION_KINDS.filter((kind) => kind !== 'diagram');

const PRESETS: ReadonlyArray<{ id: string; label: string; kinds: readonly PageAnnotationKind[] }> = [
    { id: 'quick', label: 'Quick overview', kinds: ['summary'] },
    { id: 'study', label: 'Study pack', kinds: ['summary', 'key_takeaway', 'try_this'] },
    { id: 'all', label: 'Everything', kinds: PAGE_ANNOTATION_KINDS },
];

const STORAGE_KEY = 'page_annotation_kinds';
const DEFAULT_KINDS: PageAnnotationKind[] = ['summary', 'key_takeaway'];

/** The last choice on this device; falls back to the defaults when storage is empty, blocked or invalid. */
function loadKinds(): PageAnnotationKind[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        const valid = Array.isArray(parsed) ? PAGE_ANNOTATION_KINDS.filter((kind) => parsed.includes(kind)) : [];
        return valid.length ? valid : DEFAULT_KINDS;
    } catch {
        return DEFAULT_KINDS;
    }
}

function saveKinds(kinds: readonly PageAnnotationKind[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(kinds)); } catch { /* remembering is a convenience only */ }
}

const sameKinds = (a: readonly PageAnnotationKind[], b: readonly PageAnnotationKind[]) => a.length === b.length && a.every((kind) => b.includes(kind));

/** Choose what to generate for a section. Rendered only while open, so each opening starts from the saved choice. */
export const PageAnnotationGenerateDialog = observer(function PageAnnotationGenerateDialog({ target, sectionTitle, onClose }: {
    target: PageAnnotationTarget;
    sectionTitle: string | null;
    onClose: () => void;
}) {
    const annotations = usePageStore().annotationStore;
    const titleId = useId();
    const descriptionId = useId();
    const [kinds, setKinds] = useState<PageAnnotationKind[]>(loadKinds);
    /** `undefined` while checking, `null` when no model is chosen. */
    const [model, setModel] = useState<string | null | undefined>(undefined);
    const generating = annotations.generatingKey === target.key;
    const replacing = annotations.itemsFor(target.key).some((item) => item.origin === 'ai' && kinds.includes(item.kind as PageAnnotationKind));

    useEffect(() => {
        let cancelled = false;
        getModelConfig().then((result) => { if (!cancelled) setModel(result.ok ? result.data.annotationModelId ?? null : null); });
        return () => { cancelled = true; };
    }, []);

    const close = () => { if (!generating) onClose(); };
    const toggle = (kind: PageAnnotationKind) => setKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
    const generate = async () => {
        const chosen = PAGE_ANNOTATION_KINDS.filter((kind) => kinds.includes(kind));
        if (!chosen.length || generating) return;
        saveKinds(chosen);
        if (await annotations.generate(target, chosen, sectionTitle)) onClose();
    };

    const card = (kind: PageAnnotationKind) => (
        <label key={kind} className={`reader-gen-card${kinds.includes(kind) ? ' is-checked' : ''}`}>
            <input type="checkbox" checked={kinds.includes(kind)} onChange={() => toggle(kind)} />
            <span><strong>{PAGE_ANNOTATION_KIND_LABELS[kind]}</strong><small>{KIND_HINTS[kind]}</small></span>
        </label>
    );

    return (
        <Dialog open labelledBy={titleId} describedBy={descriptionId} onOpenChange={(next) => { if (!next) close(); }} className="max-w-xl">
            <form onSubmit={(event) => { event.preventDefault(); void generate(); }} className="reader-gen">
                <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-strong)]">Key takeaways</h2>
                <p id={descriptionId} className="mt-1 text-sm text-[var(--color-text-muted)]">
                    Written from “{target.title}” and everything under it.{replacing && ' This replaces the AI-written items of the selected kinds already here.'}
                </p>
                <p className={`reader-gen-model${model === null ? ' is-missing' : ''}`}>
                    {model === undefined ? 'Checking your model…' : model === null
                        ? <>No takeaways model is chosen. <Link to={settingsPageRoute}>Choose one in Settings</Link></>
                        : <>Using <strong>{model}</strong></>}
                </p>
                <div className="reader-gen-presets" role="group" aria-label="Quick choices">
                    {PRESETS.map((preset) => (
                        <button key={preset.id} type="button" disabled={generating} aria-pressed={sameKinds(kinds, preset.kinds)} onClick={() => setKinds([...preset.kinds])}>{preset.label}</button>
                    ))}
                </div>
                <fieldset className="reader-gen-group" disabled={generating}>
                    <legend>Text takeaways</legend>
                    {TEXT_KINDS.map(card)}
                </fieldset>
                <fieldset className="reader-gen-group" disabled={generating}>
                    <legend>Visual explanation</legend>
                    {card('diagram')}
                </fieldset>
                {!kinds.length && <p className="reader-gen-note">Choose at least one kind.</p>}
                {generating && <p role="status" className="reader-gen-note">Reading this section…</p>}
                {annotations.error && <p role="alert" className="reader-gen-error">{annotations.error}</p>}
                <div className="reader-gen-footer">
                    <Button type="button" variant="outlined" onClick={close} disabled={generating}>Cancel</Button>
                    <Button type="submit" loading={generating} disabled={!kinds.length || model === null}>{annotations.error ? 'Try again' : 'Generate'}</Button>
                </div>
            </form>
        </Dialog>
    );
});
