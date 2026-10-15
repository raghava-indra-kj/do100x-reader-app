import { createPortal } from 'react-dom';
import { useRef, useState, useEffect, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { usePageStore } from '../store';
import { createComment } from '@domain/comment/services/comments-service';
import { createVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { BookOpen, Globe, ArrowLeft, MessageSquare, Sparkles, StickyNote, Copy, Check, NotebookPen } from 'lucide-react';
import { ReaderActionButton } from './reader-action-button';
import { observer } from 'mobx-react-lite';
import { createBlocksAnchor } from '@reader/md-ast';
import { editComment } from '@domain/comment/services/comments-service';
import { captureCommentTarget, type CommentTarget, type BlockCommentSelection } from './comment-target';
import { MarkdownRenderer } from '@reader/md-view';
import './reader-experience.css';

const POPOVER_OFFSET = 10;
const GOOGLE_URL_MAX = 2048;
const DUCK_URL_MAX = 4096;

export interface SelectionPopoverProps {
    containerRef: RefObject<HTMLElement | null>;
    page: Page;
    section: Section;
    blockSelection?: BlockCommentSelection | null;
    onClearBlocks?: () => void;
}

/** Check if the trimmed selection is exactly one word (no whitespace). */
function isSingleWord(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length > 0 && !/\s/.test(trimmed);
}

/** Build a Google AI Mode URL for explaining the selection in context. */
function buildGoogleExplainUrl(pageTitle: string, sectionTitle: string, selectedText: string): string {
    const query = `I am reading about:\n[${pageTitle} > ${sectionTitle}]\n${selectedText}\n\nHelp me understand this.`;
    return `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
}

/** Build a Google AI Mode URL for asking a doubt about the selection in context. */
function buildGoogleDoubtUrl(pageTitle: string, sectionTitle: string, selectedText: string, doubtText: string): string {
    const query = `I am reading about:\n[${pageTitle} > ${sectionTitle}]\n${selectedText}\n\nHelp me understand this.\nMy doubt is: ${doubtText}`;
    return `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
}

/** Build a DuckDuckGo AI URL for explaining the selection in context (rich prompt). */
function buildDuckExplainUrl(pageTitle: string, sectionTitle: string, selectedText: string): string {
    const query = `I am reading about "${pageTitle}" > "${sectionTitle}".\n\nHere is the passage I am studying:\n"""\n${selectedText}\n"""\n\nPlease explain this passage. Break down any complex concepts or terms, and help me understand it clearly.`;
    return `https://duck.ai/?q=${encodeURIComponent(query)}`;
}

/** Build a DuckDuckGo AI URL for asking a doubt in context (rich prompt). */
function buildDuckDoubtUrl(pageTitle: string, sectionTitle: string, selectedText: string, doubtText: string): string {
    const query = `I am reading about "${pageTitle}" > "${sectionTitle}".\n\nHere is the passage I am studying:\n"""\n${selectedText}\n"""\n\nMy doubt/question is:\n${doubtText}\n\nPlease help me understand this and directly answer my doubt.`;
    return `https://duck.ai/?q=${encodeURIComponent(query)}`;
}

export const SelectionPopover = observer(function SelectionPopover({ containerRef, page, section, blockSelection, onClearBlocks }: SelectionPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const store = usePageStore();
    const selection = useTextSelection(containerRef, popoverRef);
    const selectedText = blockSelection?.anchor.quote ?? selection?.text.trim() ?? '';
    const sectionTitle = section.title ?? section.rawTitle ?? '';
    const [view, setView] = useState<'menu' | 'compose' | 'hidden'>('menu');
    const [draft, setDraft] = useState('');
    const [isExplanation, setIsExplanation] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedDrafts, setSavedDrafts] = useState<string[]>([]);
    const [saveError, setSaveError] = useState('');
    const [savingWord, setSavingWord] = useState(false);
    const [height, setHeight] = useState(240);
    const [viewport, setViewport] = useState({ width: 1024, height: 768 });
    const savingRef = useRef(false);
    const selectionVersion = useRef(0);
    const [target, setTarget] = useState<CommentTarget | null>(null);
    const [pageNote, setPageNote] = useState(false);
    const [preview, setPreview] = useState(false);
    const captured = useRef<unknown>(null);

    useEffect(() => {
        if (!blockSelection) return;
        const dismiss = () => { setView('hidden'); onClearBlocks?.(); };
        const outside = (event: PointerEvent) => { if (!popoverRef.current?.contains(event.target as Node)) dismiss(); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [blockSelection, onClearBlocks]);

    useEffect(() => {
        if (selection?.range) onClearBlocks?.();
    }, [selection?.range]);

    useEffect(() => {
        const identity = blockSelection ?? selection?.range;
        if (captured.current === identity) return;
        captured.current = identity;
        setPageNote(false);
        setPreview(false);
        setTarget(blockSelection
            ? { anchor: blockSelection.anchor, contentVersion: blockSelection.contentVersion, document: page.document, blockIds: [] }
            : selection ? captureCommentTarget(containerRef.current?.querySelector<HTMLElement>('.md-view') ?? null, page.document, page.contentVersion, selection.range) : null);
    }, [selection?.range, blockSelection, page, containerRef]);

    useEffect(() => {
        const resize = () => setViewport({ width: window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight });
        resize();
        window.addEventListener('resize', resize);
        window.visualViewport?.addEventListener('resize', resize);
        return () => {
            window.removeEventListener('resize', resize);
            window.visualViewport?.removeEventListener('resize', resize);
        };
    }, []);

    useEffect(() => {
        selectionVersion.current += 1;
        setView('menu');
        setDraft('');
        setIsExplanation(false);
        setSavedDrafts([]);
        setSaveError('');
    }, [selection?.range, blockSelection, page.id]);

    useEffect(() => {
        const node = popoverRef.current;
        if (!node) return;
        const observer = new ResizeObserver(() => setHeight(node.getBoundingClientRect().height));
        observer.observe(node);
        return () => observer.disconnect();
    }, [selectedText, view]);

    if ((!selection && !blockSelection) || view === 'hidden') return null;
    const rect = blockSelection?.rect ?? selection!.rect;
    const body = draft.trim();
    const saved = savedDrafts.includes(JSON.stringify([body, isExplanation]));
    const width = Math.min(view === 'menu' ? 230 : 400, viewport.width - 24);
    const idealTop = rect.top > height + POPOVER_OFFSET
        ? rect.top - height - POPOVER_OFFSET : rect.bottom + POPOVER_OFFSET;
    const style: React.CSSProperties = {
        position: 'fixed', zIndex: 40, width,
        left: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, viewport.width - width - 12)),
        top: Math.max(12, Math.min(idealTop, viewport.height - height - 12)),
        maxHeight: viewport.height - 24, overflowY: 'auto',
    };
    const googleUrl = view === 'menu' ? buildGoogleExplainUrl(page.title, sectionTitle, selectedText) : buildGoogleDoubtUrl(page.title, sectionTitle, selectedText, body);
    const duckUrl = view === 'menu' ? buildDuckExplainUrl(page.title, sectionTitle, selectedText) : buildDuckDoubtUrl(page.title, sectionTitle, selectedText, body);
    const canGoogle = googleUrl.length <= GOOGLE_URL_MAX;
    const canDuck = duckUrl.length <= DUCK_URL_MAX;
    const ask = () => {
        if (!body || saving) return;
        store.doubtStore.open(body, selectedText, page.title, sectionTitle, !pageNote && target?.anchor ? { anchor: target.anchor, contentVersion: target.contentVersion } : undefined);
        setView('hidden');
    };
    const save = async () => {
        if (!body || savingRef.current || saved || (!target?.anchor && !pageNote)) return;
        const version = selectionVersion.current;
        const savedKey = JSON.stringify([body, isExplanation]);
        savingRef.current = true;
        setSaving(true);
        setSaveError('');
        try {
            const result = await createComment({ pageId: page.id, pageTitle: page.title, sectionTitle: sectionTitle || null, selectedText, body, isExplanation,
                ...(!pageNote && target?.anchor ? { anchor: target.anchor, contentVersion: target.contentVersion } : {}) });
            if (!result.ok) throw result.error;
            store.bumpCommentsVersion();
            if (version === selectionVersion.current) setSavedDrafts(previous => [...previous, savedKey]);
            toast.success('Comment saved. You can also ask AI about it.');
        } catch (error) {
            if (version === selectionVersion.current) setSaveError(error instanceof Error ? error.message : 'Couldn’t save your comment. Your draft is still here; try again.');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };
    const reattach = async () => {
        const comment = store.commentToReattach;
        if (!comment || !target?.anchor || savingRef.current) return;
        savingRef.current = true; setSaving(true); setSaveError('');
        try {
            const result = await editComment({ commentId: comment.id, anchor: target.anchor, contentVersion: target.contentVersion });
            if (!result.ok) throw result.error;
            store.setCommentToReattach(null); store.bumpCommentsVersion(); setView('hidden');
            toast.success('Comment attached to this selection.');
        } catch (error) { setSaveError(error instanceof Error ? error.message : 'Couldn’t attach the comment. Select the passage again.'); }
        finally { savingRef.current = false; setSaving(false); }
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`Page: ${page.title}\nSection: ${sectionTitle}\n\n${selectedText}\n\n${body}`);
            toast.success('Text and context copied');
        } catch { toast.error('Couldn’t copy. Please try again.'); }
    };
    const saveWord = async () => {
        if (savingWord) return;
        setSavingWord(true);
        try {
            const result = await createVocabulary({ term: selectedText });
            if (!result.ok) throw result.error;
            toast.success(result.data.created ? 'Word saved' : 'Already saved');
            store.bumpVocabVersion();
        } catch { toast.error('Couldn’t save this word. Please try again.'); }
        finally { setSavingWord(false); }
    };
    return createPortal(<div ref={popoverRef} style={style} className={`reader-selection-popover ${view === 'menu' ? 'reader-selection-menu' : 'reader-composer'}`} onMouseDown={event => { if (view === 'menu') event.preventDefault(); }}>
        {view === 'menu' ? <>
            {store.commentToReattach && <button className="reader-selection-primary" disabled={!target?.anchor || saving} onClick={() => void reattach()}><MessageSquare size={15} />{saving ? 'Attaching…' : 'Attach comment here'}</button>}
            {saveError && <p role="alert" className="reader-composer-error">{saveError}</p>}
            <button className="reader-selection-primary" onClick={() => setView('compose')}><MessageSquare size={15} />Ask or comment</button>
            <button onClick={() => { store.explanationStore.open(selectedText, page.title, sectionTitle); setView('hidden'); }}><Sparkles size={15} />Explain with AI</button>
            <button onClick={() => { store.meaningStore.open(selectedText, page.title, sectionTitle); setView('hidden'); }}><BookOpen size={15} />Word meanings</button>
            {isSingleWord(selectedText) && <button onClick={() => { store.dictionaryStore.open(selectedText); setView('hidden'); }}><BookOpen size={15} />Dictionary</button>}
            <button disabled={savingWord} onClick={saveWord}><NotebookPen size={15} />{savingWord ? 'Saving…' : 'Save word'}</button>
            <button onClick={copy}><Copy size={15} />Copy selection</button>
            <div className="reader-external-options" role="group" aria-label="Explain elsewhere"><div className="reader-external-label">Explain elsewhere</div><div className="reader-external-actions">
                <button disabled={!canGoogle} onClick={() => window.open(googleUrl, '_blank', 'noopener,noreferrer')}>Google AI</button>
                <button disabled={!canDuck} onClick={() => window.open(duckUrl, '_blank', 'noopener,noreferrer')}>DuckAI</button>
                {(!canGoogle || !canDuck) && <small>Selection too long for some providers. Use Copy selection instead.</small>}
            </div></div>
        </> : <>
            <div className="reader-composer-header"><strong><MessageSquare size={16} />Ask or comment</strong><ReaderActionButton tooltip="Back to selection tools" className="reader-icon-button" onClick={() => setView('menu')}><ArrowLeft size={16} /></ReaderActionButton></div>
            <blockquote className="reader-composer-context">{selectedText}</blockquote>
            {target?.error && <div className="reader-comment-target-warning"><p>{target.error}</p>
                {target.blockIds.length > 0 && target.document && <button onClick={() => setTarget({ ...target, anchor: createBlocksAnchor(target.document!, target.blockIds), error: undefined })}>Attach to whole {target.blockIds.length === 1 ? 'block' : 'blocks'}</button>}
                <label><input type="checkbox" checked={pageNote} onChange={event => setPageNote(event.target.checked)} />Save as a page note without a highlight</label>
            </div>}
            {target?.anchor && <small className="reader-composer-hint">{target.anchor.kind === 'blocks' ? `${target.anchor.segments.length} block${target.anchor.segments.length === 1 ? '' : 's'} selected` : 'Attached to selected text'}</small>}
            <label className="sr-only" htmlFor="reader-selection-draft">Question or comment</label>
            {preview ? <div className="reader-comment-markdown reader-comment-preview"><MarkdownRenderer markdown={draft || '*Your preview will appear here.*'} /></div> : <textarea id="reader-selection-draft" autoFocus value={draft} onChange={event => { setDraft(event.target.value); setSaveError(''); }} placeholder="What would you like to understand or remember? Markdown and LaTeX supported." onKeyDown={event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (event.shiftKey) void save(); else ask(); }
            }} />}
            <button className="reader-comment-preview-toggle" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Write' : 'Preview Markdown & math'}</button>
            <div className="reader-composer-options"><label><input type="checkbox" checked={isExplanation} onChange={event => setIsExplanation(event.target.checked)} />Include comment in my explanations</label><ReaderActionButton tooltip="Copy draft and selected passage" className="reader-icon-button" onClick={copy}><Copy size={15} /></ReaderActionButton></div>
            {saveError && <p role="alert" className="reader-composer-error">{saveError}</p>}
            {saved && <p role="status" className="reader-composer-saved"><Check size={13} />Saved to comments. Your text is ready to ask AI.</p>}
            <div className="reader-composer-actions">
                <button disabled={!body || saving || saved || (!target?.anchor && !pageNote)} onClick={() => void save()}><StickyNote size={15} />{saving ? 'Saving…' : saved ? 'Comment saved' : 'Save comment'}</button>
                <button className="reader-composer-ask" disabled={!body || saving} onClick={ask}><Sparkles size={15} />Ask AI</button>
            </div>
            <div className="reader-composer-hint">Ctrl / ⌘ + Enter to ask · add Shift to save</div>
            <div className="reader-external-options" role="group" aria-label="Ask elsewhere"><div className="reader-external-label"><Globe size={13} />Ask elsewhere</div><div className="reader-external-actions">
                <button disabled={!body || !canGoogle} onClick={() => window.open(googleUrl, '_blank', 'noopener,noreferrer')}>Google AI ↗</button>
                <button disabled={!body || !canDuck} onClick={() => window.open(duckUrl, '_blank', 'noopener,noreferrer')}>DuckAI ↗</button>
                {(!canGoogle || !canDuck) && <small>This passage is too long for some external links. Copy it to use elsewhere.</small>}
            </div></div>
        </>}
    </div>, document.body);
});
