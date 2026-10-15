import { useEffect, useRef, useState, type RefObject } from 'react';
import { observer } from 'mobx-react-lite';
import { Check, MessageSquare, X } from 'lucide-react';
import { anchorToRanges } from '@reader/md-view';
import { createBlocksAnchor } from '@reader/md-ast';
import type { Page } from '@domain/page/models/page';
import { usePageStore } from '../store';
import { ReaderActionButton } from './reader-action-button';
import type { BlockCommentSelection } from './comment-target';

/** Host UI only: the standalone renderer owns neither comments nor application state. */
export const ReaderAnnotations = observer(function ReaderAnnotations({ page, containerRef, onCompose }: {
    page: Page;
    containerRef: RefObject<HTMLElement | null>;
    onCompose: (selection: BlockCommentSelection) => void;
}) {
    const store = usePageStore();
    const [selecting, setSelecting] = useState(false);
    const [ids, setIds] = useState<string[]>([]);
    const [measured, setMeasured] = useState<{ scope: string; positions: Array<{ id: string; top: number; left: number; label: string }> }>({ scope: '', positions: [] });
    const lastChosen = useRef<string | null>(null);
    const composeRef = useRef<HTMLButtonElement>(null);
    const currentSectionId = store.currentSection?.id;
    const scope = `${page.id}:${page.contentVersion}:${currentSectionId ?? ''}`;
    // Never expose last section's controls while the new DOM is being measured.
    const positions = measured.scope === scope ? measured.positions : [];
    const comments = store.comments;
    const focusedId = store.focusedCommentId;
    const focusVersion = store.commentFocusVersion;

    useEffect(() => { setIds([]); setSelecting(false); lastChosen.current = null; }, [page.id, page.contentVersion]);

    useEffect(() => {
        const container = containerRef.current;
        const root = container?.querySelector<HTMLElement>('.md-view');
        if (!container || !root || !page.document) return;
        const doc = page.document;
        let frame = 0;
        const update = () => {
            const bounds = container.getBoundingClientRect();
            const blocks = [...root.querySelectorAll<HTMLElement>('[data-md-block-id]')].filter(element => element.closest('.md-view') === root);
            if (selecting) setMeasured({ scope, positions: blocks.map(element => {
                const block = doc.blocks.find(block => block.id === element.dataset.mdBlockId);
                const rect = element.getBoundingClientRect();
                return { id: element.dataset.mdBlockId!, top: rect.top - bounds.top, left: rect.left - bounds.left - 26, label: (block?.text || block?.kind || 'Content').slice(0, 90) };
            }) });
            for (const element of blocks) {
                element.toggleAttribute('data-reader-block-selected', selecting && ids.includes(element.dataset.mdBlockId!));
                element.removeAttribute('data-reader-comment-focus');
            }
            const all: Range[] = [], focused: Range[] = [];
            for (const comment of comments) {
                if (!comment.anchor || comment.anchorRevision !== page.contentVersion || !comment.anchor.segments.length) continue;
                try {
                    const ranges = anchorToRanges(root, doc, comment.anchor);
                    if (!comment.resolvedAt) all.push(...ranges);
                    if (comment.id === focusedId) {
                        focused.push(...ranges);
                        for (const element of blocks) if (comment.anchor.segments.some(segment => segment.blockId === element.dataset.mdBlockId)) element.setAttribute('data-reader-comment-focus', '');
                    }
                } catch { /* Stale/corrupt targets are never rendered at a guessed location. */ }
            }
            if (typeof Highlight !== 'undefined' && CSS.highlights) {
                CSS.highlights.set('reader-comments', new Highlight(...all));
                CSS.highlights.set('reader-comment-focus', new Highlight(...focused));
            }
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
        update();
        const resize = new ResizeObserver(schedule);
        resize.observe(root);
        const mutations = new MutationObserver(schedule);
        mutations.observe(root, { childList: true, subtree: true, characterData: true });
        return () => {
            cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
            root.querySelectorAll('[data-reader-block-selected],[data-reader-comment-focus]').forEach(element => { element.removeAttribute('data-reader-block-selected'); element.removeAttribute('data-reader-comment-focus'); });
            if (typeof CSS !== 'undefined' && CSS.highlights) { CSS.highlights.delete('reader-comments'); CSS.highlights.delete('reader-comment-focus'); }
        };
    }, [containerRef, page.document, page.contentVersion, currentSectionId, scope, selecting, ids, comments, focusedId]);

    useEffect(() => {
        if (!focusedId) return;
        const frame = requestAnimationFrame(() => containerRef.current?.querySelector('[data-reader-comment-focus]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        return () => cancelAnimationFrame(frame);
    }, [containerRef, focusedId, focusVersion, currentSectionId]);

    const toggle = (id: string, extend: boolean) => {
        const visible = positions.map(position => position.id);
        const previous = visible.indexOf(lastChosen.current ?? '');
        const current = visible.indexOf(id);
        if (current < 0) return;
        if (extend && previous >= 0) setIds(selected => [...new Set([...selected, ...visible.slice(Math.min(previous, current), Math.max(previous, current) + 1)])]);
        else setIds(selected => selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
        lastChosen.current = id;
    };
    if (!page.document) return null;
    return <>
        <div className={`reader-annotation-toolbar ${selecting ? 'reader-block-selection-active' : ''}`} data-md-ui>
            <ReaderActionButton tooltip={selecting ? 'Cancel block selection' : 'Comment on one or more blocks'} className="reader-icon-button" aria-pressed={selecting} onClick={() => { setSelecting(!selecting); setIds([]); }}><MessageSquare size={15} /></ReaderActionButton>
            {selecting && <>
                <span>Select blocks · Shift-click for a range</span>
                <button ref={composeRef} disabled={!ids.length} onClick={() => {
                    onCompose({ anchor: createBlocksAnchor(page.document!, ids), contentVersion: page.contentVersion, rect: composeRef.current!.getBoundingClientRect() });
                    setSelecting(false);
                }}>{store.commentToReattach ? 'Attach' : 'Comment'}{ids.length ? ` (${ids.length})` : ''}</button>
                <ReaderActionButton tooltip="Cancel block selection" className="reader-icon-button" onClick={() => { setSelecting(false); setIds([]); }}><X size={14} /></ReaderActionButton>
            </>}
        </div>
        {store.commentToReattach && <div role="status" className="reader-reattach-banner" data-md-ui><span>Select text or blocks to reattach “{store.commentToReattach.body.slice(0, 70)}”.</span><button onClick={() => store.setCommentToReattach(null)}>Cancel</button></div>}
        {selecting && positions.map(position => <button key={position.id} className="reader-block-selector" style={{ top: position.top, left: position.left }} aria-label={`Select block: ${position.label}`} aria-pressed={ids.includes(position.id)} data-md-ui onClick={event => toggle(position.id, event.shiftKey)}>{ids.includes(position.id) && <Check size={13} />}</button>)}
    </>;
});
