import { useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowDown, ArrowUp, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { MarkdownRenderer, type MarkdownRendererProps } from '@lib/markdown-renderer';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { ReaderActionButton } from './reader-action-button';
import { PAGE_ANNOTATION_KINDS, PAGE_ANNOTATION_KIND_LABELS, type PageAnnotation, type PageAnnotationKind } from '@domain/page-annotation/models/page-annotation';
import { annotationKindLabel } from '../page-annotation-ai';
import type { PageAnnotationTarget } from '../page-annotation-target';
import { usePageStore } from '../store';
import './page-annotations.css';

type Theme = Pick<MarkdownRendererProps, 'colors' | 'fontSizes' | 'fonts'>;

/** Key takeaways for a section, rendered before or after its content. Collapsed until the reader opens them. */
export const PageAnnotationSlot = observer(function PageAnnotationSlot({ target, slot, ...theme }: {
    target: PageAnnotationTarget;
    slot: 'before' | 'after';
} & Theme) {
    const store = usePageStore();
    const annotations = store.annotationStore;
    const fallback = store.uiSettingsStore.annotationPlacement;
    const items = annotations.itemsFor(target.key).filter((item) => (item.placement ?? fallback) === slot);
    if (!items.length) return null;
    const groupId = `${target.key}|${slot}`;
    return (
        <details className="reader-takeaways" data-slot={slot} open={annotations.expanded.has(groupId)}
            onToggle={(event) => annotations.setExpanded(groupId, event.currentTarget.open)}>
            <summary>
                <Sparkles size={14} aria-hidden="true" />
                <span className="reader-takeaways-label">Key takeaways</span>
                <span className="reader-takeaways-count">{items.length}</span>
                {items.some((item) => item.stale) && <span className="reader-takeaways-stale">May be out of date</span>}
            </summary>
            <ol className="reader-takeaways-list">
                {items.map((item, index) => (
                    <TakeawayItem key={item.id} item={item} target={target} slot={slot} first={index === 0} last={index === items.length - 1} {...theme} />
                ))}
            </ol>
        </details>
    );
});

const ICON_BUTTON = 'reader-icon-button disabled:opacity-40';

/** One takeaway: read, reorder within its strip, edit in place, or delete. */
const TakeawayItem = observer(function TakeawayItem({ item, target, slot, first, last, ...theme }: {
    item: PageAnnotation;
    target: PageAnnotationTarget;
    slot: 'before' | 'after';
    first: boolean;
    last: boolean;
} & Theme) {
    const annotations = usePageStore().annotationStore;
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(item.title);
    const [content, setContent] = useState(item.content);
    const [saving, setSaving] = useState(false);
    const valid = title.trim().length > 0 && content.trim().length > 0;

    const startEditing = () => { setTitle(item.title); setContent(item.content); setEditing(true); };
    const save = async () => {
        if (!valid || saving) return;
        setSaving(true);
        const saved = await annotations.update(item.id, { title, content });
        setSaving(false);
        if (saved) setEditing(false);
    };

    return (
        <li className="reader-takeaway" data-kind={item.kind}>
            <div className="reader-takeaway-head">
                <span className="reader-takeaway-kind">{annotationKindLabel(item.kind)}</span>
                {editing
                    ? <input className="reader-takeaway-input" aria-label="Takeaway title" value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} disabled={saving} />
                    : <strong>{item.title}</strong>}
                {!editing && <>
                    <ReaderActionButton type="button" tooltip="Move up" aria-label={`Move up: ${item.title}`} className={ICON_BUTTON} disabled={first} onClick={() => annotations.move(target.key, item.id, slot, -1)}>
                        <ArrowUp size={14} aria-hidden="true" />
                    </ReaderActionButton>
                    <ReaderActionButton type="button" tooltip="Move down" aria-label={`Move down: ${item.title}`} className={ICON_BUTTON} disabled={last} onClick={() => annotations.move(target.key, item.id, slot, 1)}>
                        <ArrowDown size={14} aria-hidden="true" />
                    </ReaderActionButton>
                    <ReaderActionButton type="button" tooltip="Edit takeaway" aria-label={`Edit takeaway: ${item.title}`} className={ICON_BUTTON} onClick={startEditing}>
                        <Pencil size={14} aria-hidden="true" />
                    </ReaderActionButton>
                    <ReaderActionButton type="button" tooltip="Delete takeaway" aria-label={`Delete takeaway: ${item.title}`} className={ICON_BUTTON} onClick={() => annotations.remove(item.id)}>
                        <Trash2 size={14} aria-hidden="true" />
                    </ReaderActionButton>
                </>}
            </div>
            {editing ? <>
                <textarea className="reader-takeaway-input reader-takeaway-textarea" aria-label="Takeaway content (Markdown)" value={content} onChange={(event) => setContent(event.target.value)} disabled={saving} spellCheck={false} />
                <div className="reader-takeaway-actions">
                    <Button size="sm" variant="outlined" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                    <Button size="sm" onClick={save} loading={saving} disabled={!valid}>Save</Button>
                </div>
            </> : <MarkdownRenderer markdown={item.content} {...theme} />}
        </li>
    );
});

const DEFAULT_KINDS: PageAnnotationKind[] = ['summary', 'key_takeaway'];

/** Toolbar button that opens the generate dialog for the section being read. */
export const PageAnnotationControls = observer(function PageAnnotationControls({ target, sectionTitle }: {
    target: PageAnnotationTarget;
    sectionTitle: string | null;
}) {
    const store = usePageStore();
    const annotations = store.annotationStore;
    const titleId = useId();
    const descriptionId = useId();
    const [open, setOpen] = useState(false);
    const [kinds, setKinds] = useState<PageAnnotationKind[]>(DEFAULT_KINDS);
    const generating = annotations.generatingKey === target.key;
    const replacing = annotations.itemsFor(target.key).some((item) => item.origin === 'ai' && kinds.includes(item.kind as PageAnnotationKind));

    const close = () => { if (!generating) { setOpen(false); annotations.clearError(); } };
    const toggle = (kind: PageAnnotationKind) => setKinds((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]);
    const generate = async () => { if (await annotations.generate(target, PAGE_ANNOTATION_KINDS.filter((kind) => kinds.includes(kind)), sectionTitle)) setOpen(false); };

    return <>
        <ReaderActionButton type="button" tooltip="Generate key takeaways" aria-label={`Generate key takeaways: ${target.title}`} onClick={() => setOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]">
            <Sparkles size={14} aria-hidden="true" />
        </ReaderActionButton>
        {open && <Dialog open labelledBy={titleId} describedBy={descriptionId} onOpenChange={(next) => { if (!next) close(); }}>
            <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-strong)]">Generate key takeaways</h2>
            <p id={descriptionId} className="mt-1 text-sm text-[var(--color-text-muted)]">
                Written from “{target.title}” and everything under it. {replacing && 'This replaces the AI-written items of the selected kinds already here.'}
            </p>
            <fieldset className="mt-4 flex flex-col gap-2" disabled={generating}>
                <legend className="mb-1 text-xs font-semibold uppercase text-[var(--color-text-muted)]">Include</legend>
                {PAGE_ANNOTATION_KINDS.map((kind) => (
                    <label key={kind} className="flex items-center gap-2 text-sm text-[var(--color-text-strong)]">
                        <input type="checkbox" checked={kinds.includes(kind)} onChange={() => toggle(kind)} />
                        {PAGE_ANNOTATION_KIND_LABELS[kind]}
                    </label>
                ))}
            </fieldset>
            {annotations.error && <p role="alert" className="mt-4 text-sm text-[var(--color-error)]">{annotations.error}</p>}
            <div className="mt-6 flex justify-end gap-3">
                <Button variant="outlined" onClick={close} disabled={generating}>Cancel</Button>
                <Button onClick={generate} loading={generating} disabled={!kinds.length}>Generate</Button>
            </div>
        </Dialog>}
    </>;
});
