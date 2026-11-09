import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowDown, ArrowUp, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { MarkdownRenderer, type MarkdownRendererProps } from '@lib/markdown-renderer';
import { Button } from '@modules/core/ui/primitives/button';
import { ReaderActionButton } from './reader-action-button';
import type { PageAnnotation } from '@domain/page-annotation/models/page-annotation';
import { annotationKindLabel } from '../page-annotation-ai';
import { PageAnnotationGenerateDialog } from './page-annotation-generate-dialog';
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
    const ref = useRef<HTMLDetailsElement>(null);
    const revealed = annotations.revealed;
    const present = items.length > 0;
    useEffect(() => {
        if (!revealed || revealed.key !== target.key || !present) return;
        ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        annotations.clearRevealed();
    }, [revealed, target.key, present, annotations]);
    if (!items.length) return null;
    const groupId = `${target.key}|${slot}`;
    const kinds = [...new Set(items.map((item) => annotationKindLabel(item.kind)))];
    return (
        <details ref={ref} className="reader-takeaways" data-slot={slot} open={annotations.expanded.has(groupId)}
            onToggle={(event) => annotations.setExpanded(groupId, event.currentTarget.open)}>
            <summary>
                <Sparkles size={14} aria-hidden="true" />
                <span className="reader-takeaways-label">Key takeaways</span>
                <span className="reader-takeaways-count">{items.length}</span>
                <span className="reader-takeaways-kinds">{kinds.join(' · ')}</span>
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

/** Toolbar button that opens the generate dialog for the section being read. */
export const PageAnnotationControls = observer(function PageAnnotationControls({ target, sectionTitle }: {
    target: PageAnnotationTarget;
    sectionTitle: string | null;
}) {
    const annotations = usePageStore().annotationStore;
    const [open, setOpen] = useState(false);
    const count = annotations.itemsFor(target.key).length;

    return <>
        <ReaderActionButton type="button" tooltip="Generate key takeaways" aria-label={`Generate key takeaways: ${target.title}`} onClick={() => setOpen(true)} className="reader-takeaways-trigger">
            <Sparkles size={14} aria-hidden="true" />
            <span className="reader-takeaways-trigger-label">Takeaways</span>
            {count > 0 && <span className="reader-takeaways-trigger-count" aria-hidden="true">{count}</span>}
        </ReaderActionButton>
        {open && <PageAnnotationGenerateDialog target={target} sectionTitle={sectionTitle} onClose={() => { annotations.clearError(); setOpen(false); }} />}
    </>;
});
