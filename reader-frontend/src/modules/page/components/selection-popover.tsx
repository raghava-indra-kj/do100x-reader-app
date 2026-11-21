import { createPortal } from 'react-dom';
import { useRef, useState, useEffect, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { usePageStore } from '../store';
import type { DoubtIntent } from '../doubt-store';
import { createComment } from '@domain/comment/services/comments-service';
import { createVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { ArrowLeft, MessageSquare, BookmarkPlus, Eye, Pencil, Copy, Check, Trash2, X } from 'lucide-react';
import { ProviderMark } from '@modules/core/branding/provider-mark';
import { ReaderToolIcon } from '@modules/reader/reader-tool-icon';
import { ReaderActionButton } from './reader-action-button';
import { observer } from 'mobx-react-lite';
import { createBlocksAnchor } from '@reader/md-ast';
import { editComment } from '@domain/comment/services/comments-service';
import { captureCommentTarget, type BlockCommentSelection } from './comment-target';
import { MarkdownRenderer } from '@reader/md-view';
import './reader-experience.css';
import './selection-drafts.css';

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
    const recoveryRef = useRef<HTMLDivElement>(null);
    const store = usePageStore();
    const drafts = store.commentDrafts;
    const selection = useTextSelection(containerRef, popoverRef);
    const [view, setView] = useState<'menu' | 'compose' | 'hidden'>('hidden');
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeIdRef = useRef(activeId);
    activeIdRef.current = activeId;
    const [showDrafts, setShowDrafts] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [reattaching, setReattaching] = useState(false);
    const [reattachError, setReattachError] = useState('');
    const [savingWord, setSavingWord] = useState(false);
    const [height, setHeight] = useState(240);
    const [viewport, setViewport] = useState({ width: 1024, height: 768 });
    const savingRef = useRef(false);
    const [preview, setPreview] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const captured = useRef<unknown>(null);
    const focusMenu = useRef(false);
    const active = drafts.get(activeId);
    const selectedText = active?.selectedText ?? '';
    const sectionTitle = active?.sectionTitle ?? '';
    const draft = active?.body ?? '';
    const isExplanation = active?.isExplanation ?? false;
    const target = active?.target;
    const pageNote = active?.pageNote ?? false;
    const saving = active?.savingRevision != null || reattaching;
    const saveError = active?.error || reattachError;
    const returnToReading = () => {
        const container = containerRef.current;
        if (!container) return;
        const blockId = target?.anchor?.segments[0]?.blockId ?? target?.blockIds[0];
        const blocks = container.querySelectorAll<HTMLElement>('.md-view [data-md-block-id]');
        const passage = Array.from(blocks).find(block => block.dataset.mdBlockId === blockId)
            ?? blocks[0] ?? container.querySelector<HTMLElement>('.md-view :is(h1,h2,h3,h4,h5,h6,p)');
        if (!passage) return;
        if (!passage.hasAttribute('tabindex')) {
            passage.tabIndex = -1;
            passage.addEventListener('blur', () => passage.removeAttribute('tabindex'), { once: true });
        }
        passage.focus({ preventScroll: true });
    };
    const dismiss = (returnFocus = false) => {
        drafts.park(activeIdRef.current);
        captured.current = null;
        selection?.dismiss?.();
        setActiveId(null); setView('hidden'); setShowDrafts(false);
        window.getSelection()?.removeAllRanges();
        onClearBlocks?.();
        if (returnFocus) returnToReading();
    };

    useEffect(() => {
        if (view === 'hidden' && !showDrafts) return;
        const outside = (event: PointerEvent) => {
            if (!popoverRef.current?.contains(event.target as Node) && !recoveryRef.current?.contains(event.target as Node)) dismiss();
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); window.getSelection()?.removeAllRanges(); dismiss(true); }
        };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape, true);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
    }, [view, showDrafts, drafts, onClearBlocks]);

    useEffect(() => () => drafts.park(activeIdRef.current), [drafts]);

    useEffect(() => {
        if (selection?.range) onClearBlocks?.();
    }, [selection?.range]);

    useEffect(() => {
        const identity = blockSelection ?? selection?.range ?? null;
        if (captured.current === identity) return;
        captured.current = identity;
        drafts.park(activeIdRef.current);
        setPreview(false);
        setShowOptions(false);
        setReattachError('');
        if (!identity) { setActiveId(null); setView('hidden'); return; }
        const target = blockSelection
            ? { anchor: blockSelection.anchor, contentVersion: blockSelection.contentVersion, document: page.document, blockIds: [] }
            : captureCommentTarget(containerRef.current?.querySelector<HTMLElement>('.md-view') ?? null, page.document, page.contentVersion, selection!.range);
        const id = drafts.begin({ pageId: page.id, pageTitle: page.title, sectionId: section.id, sectionTitle: section.title ?? section.rawTitle ?? '', selectedText: blockSelection?.anchor.quote ?? selection!.text.trim(), target });
        setActiveId(id); setView('menu'); setShowDrafts(false);
        setRect(blockSelection?.rect ?? selection!.rect);
        focusMenu.current = Boolean(blockSelection || selection?.keyboard);
    }, [selection?.range, blockSelection, page, containerRef, drafts, section]);

    useEffect(() => {
        if (view === 'menu' && focusMenu.current) {
            focusMenu.current = false;
            popoverRef.current?.querySelector<HTMLButtonElement>('.reader-selection-primary:not(:disabled)')?.focus();
        }
    }, [view, activeId]);

    useEffect(() => {
        if (selection?.range === captured.current) setRect(selection?.rect ?? null);
    }, [selection?.rect]);

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
        const node = popoverRef.current;
        if (!node) return;
        const observer = new ResizeObserver(() => setHeight(node.getBoundingClientRect().height));
        observer.observe(node);
        return () => observer.disconnect();
    }, [selectedText, view]);

    const parked = drafts.recoverable(page.id).filter(item => view === 'hidden' || item.id !== activeId);
    const resume = (id: string) => {
        drafts.park(activeId);
        captured.current = null;
        selection?.dismiss?.();
        onClearBlocks?.();
        setActiveId(id); setView('compose'); setShowDrafts(false); setPreview(false); setReattachError('');
        setShowOptions(false);
        setRect(new DOMRect(viewport.width / 2, viewport.height / 2, 0, 0));
    };
    const recovery = parked.length ? createPortal(<div ref={recoveryRef} className="reader-comment-drafts" data-md-ui>
        <button className="reader-comment-drafts-trigger" aria-expanded={showDrafts} onClick={() => parked.length === 1 ? resume(parked[0].id) : setShowDrafts(!showDrafts)}><MessageSquare size={14} />{parked.length === 1 ? 'Resume comment' : `Drafts (${parked.length})`}</button>
        {showDrafts && <section className="reader-comment-draft-list" aria-label="Unsent comments"><strong>Unsent comments</strong><small>Kept while this page stays open.</small>{parked.map(item => <div key={item.id}><button onClick={() => resume(item.id)}><small>{item.sectionTitle || item.pageTitle}</small><blockquote>{item.selectedText}</blockquote><span>{item.body}</span></button><ReaderActionButton tooltip="Discard draft" disabled={item.savingRevision !== null} className="reader-icon-button" onClick={() => drafts.discard(item.id)}><X size={14} /></ReaderActionButton></div>)}</section>}
    </div>, document.body) : null;
    if (!active || active.pageId !== page.id || !rect || view === 'hidden') return recovery;
    const body = draft.trim();
    const saved = active.savedRevision === active.revision;
    const width = Math.min(view === 'menu' ? 248 : 420, viewport.width - 24);
    const idealTop = rect.top > height + POPOVER_OFFSET
        ? rect.top - height - POPOVER_OFFSET : rect.bottom + POPOVER_OFFSET;
    const style: React.CSSProperties = {
        position: 'fixed', zIndex: 40, width,
        left: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, viewport.width - width - 12)),
        top: Math.max(12, Math.min(idealTop, viewport.height - height - 12)),
        maxHeight: viewport.height - 24, overflowY: 'auto',
    };
    const googleUrl = view === 'menu' ? buildGoogleExplainUrl(active.pageTitle, sectionTitle, selectedText) : buildGoogleDoubtUrl(active.pageTitle, sectionTitle, selectedText, body);
    const duckUrl = view === 'menu' ? buildDuckExplainUrl(active.pageTitle, sectionTitle, selectedText) : buildDuckDoubtUrl(active.pageTitle, sectionTitle, selectedText, body);
    const canGoogle = googleUrl.length <= GOOGLE_URL_MAX;
    const canDuck = duckUrl.length <= DUCK_URL_MAX;
    const providerLabel = view === 'menu' ? 'Explain elsewhere' : 'Ask elsewhere';
    const needsQuestion = view === 'compose' && !body;
    const providers = <div className="reader-external-options" role="group" aria-label={providerLabel}>
        <div className="reader-external-label">{providerLabel}</div>
        <div className="reader-external-actions">
            <button disabled={needsQuestion || !canGoogle} onClick={() => window.open(googleUrl, '_blank', 'noopener,noreferrer')}>
                <ProviderMark provider="google" />Google AI
            </button>
            <button disabled={needsQuestion || !canDuck} onClick={() => window.open(duckUrl, '_blank', 'noopener,noreferrer')}>
                <ProviderMark provider="duckduckgo" />DuckAI
            </button>
        </div>
        {(!canGoogle || !canDuck) && <small>{view === 'menu'
            ? 'Selection too long for some providers. Use Copy selection instead.'
            : 'This passage is too long for some external links. Copy it to use elsewhere.'}</small>}
    </div>;
    const ask = (intent: DoubtIntent) => {
        if (!body || saving) return;
        const attachment = !pageNote && target?.anchor ? { anchor: target.anchor, contentVersion: target.contentVersion } : undefined;
        store.doubtStore.open(body, selectedText, active.pageTitle, sectionTitle, attachment, intent);
        dismiss(true);
    };
    const canSave = Boolean(body && !saving && !saved && (target?.anchor || pageNote));
    const save = async () => {
        if (!canSave) return;
        const submission = drafts.submit(active.id);
        if (!submission) return;
        const snapshot = submission.draft;
        try {
            const result = await createComment({ pageId: snapshot.pageId, pageTitle: snapshot.pageTitle, sectionTitle: snapshot.sectionTitle || null, selectedText: snapshot.selectedText, body: snapshot.body.trim(), isExplanation: snapshot.isExplanation,
                ...(!snapshot.pageNote && snapshot.target.anchor ? { anchor: snapshot.target.anchor, contentVersion: snapshot.target.contentVersion } : {}) });
            if (!result.ok) throw result.error;
            store.bumpCommentsVersion();
            drafts.complete(submission);
            toast.success('Saved to Comments');
        } catch (error) {
            drafts.complete(submission, error instanceof Error ? error.message : 'Couldn’t save your comment. Your draft is still here; try again.');
        }
    };
    const reattach = async () => {
        const comment = store.commentToReattach;
        if (!comment || !target?.anchor || savingRef.current) return;
        const submittedId = active.id;
        savingRef.current = true; setReattaching(true); setReattachError('');
        try {
            const result = await editComment({ commentId: comment.id, anchor: target.anchor, contentVersion: target.contentVersion });
            if (!result.ok) throw result.error;
            store.setCommentToReattach(null); store.bumpCommentsVersion();
            if (activeIdRef.current === submittedId) dismiss(true);
            toast.success('Comment attached to this selection.');
        } catch (error) { if (activeIdRef.current === submittedId) setReattachError(error instanceof Error ? error.message : 'Couldn’t attach the comment. Select the passage again.'); }
        finally { savingRef.current = false; setReattaching(false); }
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`Page: ${active.pageTitle}\nSection: ${sectionTitle}\n\n${selectedText}\n\n${body}`);
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
    return <>{recovery}{createPortal(<div ref={popoverRef} role="region" aria-label={view === 'menu' ? 'Selection tools' : 'Add comment'} style={style} className={`reader-selection-popover ${view === 'menu' ? 'reader-selection-menu' : 'reader-composer'}`} onMouseDown={event => { if (view === 'menu') event.preventDefault(); }}>
        {view === 'menu' ? <>
            <div className="reader-selection-tools-heading">
                <strong>Selection tools</strong>
                <ReaderActionButton tooltip="Copy selection" className="reader-icon-button" onClick={copy}><Copy size={16} aria-hidden="true" /></ReaderActionButton>
                <ReaderActionButton tooltip="Close selection tools" className="reader-icon-button" onClick={() => dismiss(true)}><X size={16} /></ReaderActionButton>
            </div>
            {store.commentToReattach && <button className="reader-selection-primary" disabled={!target?.anchor || saving} onClick={() => void reattach()}><MessageSquare size={15} />{saving ? 'Attaching…' : 'Attach comment here'}</button>}
            {saveError && <p role="alert" className="reader-composer-error">{saveError}</p>}
            <button className="reader-selection-primary" onClick={() => setView('compose')}><ReaderToolIcon name="comments" />Ask or comment</button>
            <button onClick={() => { store.explanationStore.open(selectedText, active.pageTitle, sectionTitle); dismiss(true); }}><ReaderToolIcon name="explanation" />Explain with AI</button>
            <button onClick={() => { store.meaningStore.open(selectedText, active.pageTitle, sectionTitle); dismiss(true); }}><ReaderToolIcon name="meaning" />Word meanings</button>
            {isSingleWord(selectedText) && <button onClick={() => { store.dictionaryStore.open(selectedText); dismiss(true); }}><ReaderToolIcon name="dictionary" />Dictionary</button>}
            <button disabled={savingWord} onClick={saveWord}><ReaderToolIcon name="vocabulary" />{savingWord ? 'Saving…' : 'Save word'}</button>
            {providers}
        </> : <>
            <div className="reader-composer-header">
                <strong><ReaderToolIcon name="comments" />Add comment</strong>
                <div className="reader-composer-header-actions">
                    <ReaderActionButton tooltip="Back to selection tools" className="reader-icon-button" onClick={() => {
                        focusMenu.current = true;
                        setPreview(false);
                        setShowOptions(false);
                        setView('menu');
                    }}><ArrowLeft size={16} /></ReaderActionButton>
                    <ReaderActionButton tooltip="Close and keep draft" className="reader-icon-button" onClick={() => dismiss(true)}><X size={16} /></ReaderActionButton>
                </div>
            </div>
            <div className="reader-composer-body">
                <blockquote className="reader-composer-context" aria-label="Selected passage" title={sectionTitle || active.pageTitle}>{selectedText}</blockquote>
                {target?.anchor?.kind === 'blocks' && <small className="reader-composer-block-count">{target.anchor.segments.length} {target.anchor.segments.length === 1 ? 'block' : 'blocks'} selected</small>}
                {target?.error && <div className="reader-comment-target-warning"><p>{target.error}</p>
                    {target.blockIds.length > 0 && target.document && <button onClick={() => drafts.update(active.id, { target: { ...target, anchor: createBlocksAnchor(target.document!, target.blockIds), error: undefined } })}>Attach to whole {target.blockIds.length === 1 ? 'block' : 'blocks'}</button>}
                    <label><input type="checkbox" checked={pageNote} onChange={event => drafts.update(active.id, { pageNote: event.target.checked })} />Save as a page note without a highlight</label>
                </div>}
                <div className="reader-composer-editor">
                    {preview
                        ? <div className="reader-comment-markdown reader-comment-preview" aria-label="Comment preview"><MarkdownRenderer markdown={draft} /></div>
                        : <textarea aria-label="Question or comment" id="reader-selection-draft" autoFocus value={draft}
                            onChange={event => drafts.update(active.id, { body: event.target.value })}
                            placeholder="Write a question, a note, or your own explanation…"
                            onKeyDown={event => {
                                if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
                                event.preventDefault();
                                if (event.repeat) return;
                                if (event.shiftKey) ask('question');
                                else void save();
                            }} />}
                    <div className="reader-composer-editor-bar">
                        <div className="reader-composer-editor-tools">
                            <ReaderActionButton tooltip={preview ? 'Write' : 'Preview Markdown & math'} disabled={!body && !preview} aria-pressed={preview} onClick={() => setPreview(!preview)}>
                                {preview ? <Pencil size={15} /> : <Eye size={15} />}{preview ? 'Write' : 'Preview'}
                            </ReaderActionButton>
                            <ReaderActionButton tooltip="Comment options" aria-expanded={showOptions} aria-controls={showOptions ? 'reader-comment-options' : undefined} onClick={() => setShowOptions(!showOptions)}>
                                <ReaderToolIcon name="more" size={18} />
                            </ReaderActionButton>
                        </div>
                        <ReaderActionButton className="reader-composer-save" tooltip="Save to Comments (Ctrl / ⌘ + Enter)"
                            aria-label={saving ? 'Saving…' : saved ? 'Comment saved' : 'Save comment'} aria-keyshortcuts="Control+Enter Meta+Enter"
                            disabled={!canSave} onClick={() => void save()}>
                            {saved ? <Check size={15} /> : <BookmarkPlus size={15} />}
                            {saving ? 'Saving…' : saved ? 'Comment saved' : 'Save comment'}
                        </ReaderActionButton>
                    </div>
                </div>
                {showOptions && <div className="reader-composer-options" id="reader-comment-options">
                    <label><input type="checkbox" checked={isExplanation} onChange={event => drafts.update(active.id, { isExplanation: event.target.checked })} />Include comment in my explanations</label>
                    <div>
                        <ReaderActionButton tooltip="Copy draft and selected passage" onClick={copy}><Copy size={14} />Copy with passage</ReaderActionButton>
                        <button disabled={saving || !body || saved} onClick={() => { drafts.discard(active.id); dismiss(true); }}><Trash2 size={14} />Discard draft</button>
                    </div>
                    <small>Unsent drafts stay here until you leave or refresh the page.</small>
                </div>}
                {saveError && <p role="alert" className="reader-composer-error">{saveError}</p>}
                <div className="reader-composer-ai" role="group" aria-label="AI help with this passage">
                    <ReaderActionButton tooltip="Ask a question about this passage (Ctrl / ⌘ + Shift + Enter)" aria-label="Ask AI"
                        aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter" disabled={!body || saving} onClick={() => ask('question')}>
                        <ReaderToolIcon name="doubt" size={16} />Ask AI
                    </ReaderActionButton>
                    <ReaderActionButton tooltip="Get feedback on your explanation against this passage" aria-label="Check understanding"
                        disabled={!body || saving} onClick={() => ask('check-understanding')}>
                        <ReaderToolIcon name="explanation" size={16} />Check understanding
                    </ReaderActionButton>
                </div>
            </div>
            {providers}
        </>}
    </div>, document.body)}</>;
});
