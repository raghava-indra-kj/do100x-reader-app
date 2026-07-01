import { createPortal } from 'react-dom';
import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { usePageStore } from '../store';
import { createComment } from '@domain/comment/services/comments-service';
import { createVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { BookOpen, Globe, ArrowLeft, MessageSquare, Sparkles, StickyNote, Copy, Check, NotebookPen } from 'lucide-react';

const POPOVER_OFFSET = 10;
const GOOGLE_URL_MAX = 2048;
const DUCK_URL_MAX = 4096;

export interface SelectionPopoverProps {
    containerRef: RefObject<HTMLElement | null>;
    page: Page;
    section: Section;
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

const btnBase =
    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors';
const btnEnabled =
    'text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] cursor-pointer';
const btnDisabled =
    'text-[var(--color-text-body)] opacity-40 cursor-not-allowed';

export function SelectionPopover({ containerRef, page, section }: SelectionPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const store = usePageStore();
    const selection = useTextSelection(containerRef, popoverRef);

    const sectionTitle = section.title ?? section.rawTitle ?? '';
    const trimmedText = selection?.text.trim() ?? '';

    const [view, setView] = useState<'menu' | 'doubt' | 'comment'>('menu');
    const [doubt, setDoubt] = useState('');
    const [commentBody, setCommentBody] = useState('');
    const [isExplanation, setIsExplanation] = useState(false);
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [isSavingVocab, setIsSavingVocab] = useState(false);
    const [doubtCopied, setDoubtCopied] = useState(false);
    const [popoverHeight, setPopoverHeight] = useState(180);

    useEffect(() => {
        setView('menu');
        setDoubt('');
        setCommentBody('');
        setIsExplanation(false);
        setDoubtCopied(false);
    }, [selection?.text]);

    useEffect(() => {
        const node = popoverRef.current;
        if (!node) return;

        setPopoverHeight(node.offsetHeight || 180);

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.borderBoxSize?.[0]
                    ? entry.borderBoxSize[0].blockSize
                    : (entry.target as HTMLElement).offsetHeight;
                if (height > 0) {
                    setPopoverHeight(height);
                }
            }
        });
        resizeObserver.observe(node);
        return () => {
            resizeObserver.disconnect();
        };
    }, [selection?.text, view]);

    const handleCopyDoubt = useCallback(() => {
        if (!doubt.trim()) return;
        const prompt = `I am reading about "${page.title}" > "${sectionTitle}".\n\nHere is the passage I am studying:\n"""\n${trimmedText}\n"""\n\nMy doubt/question is:\n${doubt.trim()}\n\nPlease help me understand this and directly answer my doubt.`;
        navigator.clipboard.writeText(prompt);
        setDoubtCopied(true);
        setTimeout(() => setDoubtCopied(false), 1500);
    }, [doubt, page.title, sectionTitle, trimmedText]);

    if (!selection) return null;

    const { rect } = selection;

    // — Meaning: enabled only for a single word
    const canMeaning = isSingleWord(trimmedText);

    // — Explain with Google: enabled only if URL fits within limit
    const googleUrl = buildGoogleExplainUrl(page.title, sectionTitle, trimmedText);
    const canGoogle = googleUrl.length <= GOOGLE_URL_MAX;

    // — Explain with DuckAI: enabled only if URL fits within limit
    const duckUrl = buildDuckExplainUrl(page.title, sectionTitle, trimmedText);
    const canDuck = duckUrl.length <= DUCK_URL_MAX;

    // — Ask Doubt: enabled if either base URL fits within limit
    const canDoubt =
        buildGoogleDoubtUrl(page.title, sectionTitle, trimmedText, '').length <= GOOGLE_URL_MAX ||
        buildDuckDoubtUrl(page.title, sectionTitle, trimmedText, '').length <= DUCK_URL_MAX;

    // — Google Doubt submit query:
    const googleDoubtUrl = buildGoogleDoubtUrl(page.title, sectionTitle, trimmedText, doubt);
    const remainingGoogleChars = GOOGLE_URL_MAX - googleDoubtUrl.length;
    const canSubmitGoogle = doubt.trim().length > 0 && remainingGoogleChars >= 0;

    // — Duck Doubt submit query:
    const duckDoubtUrl = buildDuckDoubtUrl(page.title, sectionTitle, trimmedText, doubt);
    const remainingDuckChars = DUCK_URL_MAX - duckDoubtUrl.length;
    const canSubmitDuck = doubt.trim().length > 0 && remainingDuckChars >= 0;

    // Position above the selection by default; flip below if not enough space.
    const spaceAbove = rect.top;
    const showAbove = spaceAbove > popoverHeight + POPOVER_OFFSET;

    const idealTop = showAbove
        ? rect.top - POPOVER_OFFSET - popoverHeight
        : rect.bottom + POPOVER_OFFSET;

    // Constrain top to be within the window bounds, leaving at least 10px padding from the top/bottom.
    const top = Math.max(10, Math.min(idealTop, window.innerHeight - popoverHeight - 10));

    const style: React.CSSProperties = {
        position: 'fixed',
        left: Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80)),
        transform: 'translateX(-50%)',
        zIndex: 9999,
        top,
    };

    const handleMeaning = () => {
        if (!canMeaning) return;
        store.dictionaryStore.open(trimmedText);
    };

    const handleGoogle = () => {
        if (!canGoogle) return;
        window.open(googleUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDuck = () => {
        if (!canDuck) return;
        window.open(duckUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGoogleSubmit = () => {
        if (!canSubmitGoogle) return;
        window.open(googleDoubtUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDuckSubmit = () => {
        if (!canSubmitDuck) return;
        window.open(duckDoubtUrl, '_blank', 'noopener,noreferrer');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (canSubmitDuck) {
                handleDuckSubmit();
            } else if (canSubmitGoogle) {
                handleGoogleSubmit();
            }
        }
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleCommentSubmit();
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentBody.trim() || isSavingComment) return;
        setIsSavingComment(true);
        const result = await createComment({
            pageId: page.id,
            pageTitle: page.title,
            sectionTitle: sectionTitle || null,
            selectedText: trimmedText,
            body: commentBody.trim(),
            isExplanation,
        });
        setIsSavingComment(false);
        if (result.ok) {
            setCommentBody('');
            setIsExplanation(false);
            setView('menu');
            toast.success(isExplanation ? 'Explanation saved' : 'Comment saved');
            store.bumpCommentsVersion();
        }
    };

    const handleVocabSubmit = async () => {
        if (!trimmedText || isSavingVocab) return;
        setIsSavingVocab(true);
        const result = await createVocabulary({
            pageId: page.id,
            term: trimmedText,
        });
        setIsSavingVocab(false);
        if (result.ok) {
            setView('menu');
            toast.success('Added to vocabulary');
            store.bumpVocabVersion();
        }
    };

    return createPortal(
        view === 'menu' ? (
            <div
                ref={popoverRef}
                style={style}
                className="flex flex-col items-stretch gap-0.5 rounded-lg bg-[var(--color-surface-raised)] p-1 shadow-lg ring-1 ring-[var(--color-border-subtle)] min-w-[120px]"
                onMouseDown={(e) => e.preventDefault()}
            >
                {/* Meaning — single word only */}
                <button
                    onClick={handleMeaning}
                    className={`${btnBase} ${canMeaning ? btnEnabled : btnDisabled}`}
                    title={canMeaning ? 'Look up meaning' : 'Select a single word'}
                    disabled={!canMeaning}
                >
                    <BookOpen size={13} />
                    <span>Meaning</span>
                </button>

                <button
                    onClick={() => {
                        store.meaningStore.open(trimmedText, page.title, sectionTitle);
                    }}
                    className={`${btnBase} ${btnEnabled}`}
                    title="Get AI Meaning"
                >
                    <Sparkles size={13} />
                    <span>AI Meaning</span>
                </button>

                <button
                    onClick={() => {
                        store.explanationStore.open(trimmedText, page.title, sectionTitle);
                    }}
                    className={`${btnBase} ${btnEnabled}`}
                    title="Get AI Explanation"
                >
                    <Sparkles size={13} />
                    <span>AI Explain</span>
                </button>

                <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

                {/* Explain with Google — under URL limit */}
                <button
                    onClick={handleGoogle}
                    className={`${btnBase} ${canGoogle ? btnEnabled : btnDisabled}`}
                    title={canGoogle ? 'Explain with Google AI' : 'Selection too long for Google'}
                    disabled={!canGoogle}
                >
                    <Globe size={13} />
                    <span>Explain (Google)</span>
                </button>

                <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

                {/* Explain with DuckAI — under URL limit */}
                <button
                    onClick={handleDuck}
                    className={`${btnBase} ${canDuck ? btnEnabled : btnDisabled}`}
                    title={canDuck ? 'Explain with DuckAI (Supports longer selections)' : 'Selection too long for DuckAI'}
                    disabled={!canDuck}
                >
                    <Sparkles size={13} />
                    <span>Explain (DuckAI)</span>
                </button>

                <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

                {/* Ask Doubt */}
                <button
                    onClick={() => setView('doubt')}
                    className={`${btnBase} ${canDoubt ? btnEnabled : btnDisabled}`}
                    title={canDoubt ? 'Ask a doubt about this selection' : 'Selection too long'}
                    disabled={!canDoubt}
                >
                    <MessageSquare size={13} />
                    <span>Ask Doubt</span>
                </button>

                <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

                {/* Add Comment */}
                <button
                    onClick={() => setView('comment')}
                    className={`${btnBase} ${btnEnabled}`}
                    title="Add a comment on this selection"
                >
                    <StickyNote size={13} />
                    <span>Add Comment</span>
                </button>

                <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

                {/* Add to Vocabulary */}
                <button
                    onClick={handleVocabSubmit}
                    disabled={isSavingVocab}
                    className={`${btnBase} ${btnEnabled}`}
                    title="Add this term to your vocabulary"
                >
                    <NotebookPen size={13} />
                    <span>{isSavingVocab ? 'Adding…' : 'Add to Vocabulary'}</span>
                </button>
            </div>
        ) : view === 'doubt' ? (
            <div
                ref={popoverRef}
                style={style}
                className="flex flex-col gap-2.5 rounded-xl bg-[var(--color-surface-raised)] p-3 shadow-xl ring-1 ring-[var(--color-border-subtle)] w-80"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-[var(--color-brand)]" />
                        <span className="text-[11px] font-semibold text-[var(--color-text-strong)]">Ask Doubt</span>
                    </div>
                    <button
                        onClick={() => setView('menu')}
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={11} />
                        <span>Back</span>
                    </button>
                </div>

                {/* Textarea */}
                <textarea
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's your doubt? (Ctrl+Enter to send)"
                    className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-3 py-2 text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] resize-none h-20 transition-colors"
                    autoFocus
                />

                {/* Character Counter Row */}
                <div className="flex justify-between items-center text-[10px] text-[var(--color-text-subtle)] tabular-nums px-0.5 -mt-1">
                    <span>{doubt.length} chars typed</span>
                    <div className="flex gap-2">
                        <span className={remainingGoogleChars < 0 ? 'text-[var(--color-text-error)] font-medium' : ''}>
                            Google: {remainingGoogleChars >= 0 ? `${remainingGoogleChars} left` : 'Too long'}
                        </span>
                        <span className={remainingDuckChars < 0 ? 'text-[var(--color-text-error)] font-medium' : ''}>
                            DuckAI: {remainingDuckChars >= 0 ? `${remainingDuckChars} left` : 'Too long'}
                        </span>
                    </div>
                </div>

                {/* Ask AI in-app button */}
                <button
                    onClick={() => {
                        store.doubtStore.open(doubt, trimmedText, page.title, sectionTitle);
                    }}
                    disabled={!doubt.trim()}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                        doubt.trim()
                            ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-hover)] cursor-pointer active:scale-95'
                            : 'bg-[var(--color-surface-soft)] text-[var(--color-text-subtle)] opacity-40 cursor-not-allowed'
                    }`}
                    title="Explain within the app"
                >
                    <Sparkles size={13} className="shrink-0" />
                    <span>Ask AI (In-App)</span>
                </button>

                {/* Linear Action Buttons */}
                <div className="flex items-center gap-1.5 w-full">
                    {/* Google */}
                    <button
                        onClick={handleGoogleSubmit}
                        disabled={!canSubmitGoogle}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-all border ${
                            canSubmitGoogle
                                ? 'bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-soft)] hover:border-[var(--color-text-muted)] cursor-pointer active:scale-95'
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-subtle)] border-transparent opacity-40 cursor-not-allowed'
                        }`}
                        title={canSubmitGoogle ? 'Search with Google' : 'Too long for Google'}
                    >
                        <Globe size={12} className="shrink-0" />
                        <span>Search Google</span>
                    </button>

                    {/* DuckAI */}
                    <button
                        onClick={handleDuckSubmit}
                        disabled={!canSubmitDuck}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-all border ${
                            canSubmitDuck
                                ? 'bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-soft)] hover:border-[var(--color-text-muted)] cursor-pointer active:scale-95'
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-subtle)] border-transparent opacity-40 cursor-not-allowed'
                        }`}
                        title={canSubmitDuck ? 'Search with DuckAI' : 'Too long for DuckAI'}
                    >
                        <Sparkles size={12} className="shrink-0" />
                        <span>Search DuckAI</span>
                    </button>

                    {/* Copy doubt */}
                    <button
                        onClick={handleCopyDoubt}
                        disabled={!doubt.trim()}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-all border ${
                            doubt.trim()
                                ? 'bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-soft)] hover:border-[var(--color-text-muted)] cursor-pointer active:scale-95'
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-subtle)] border-transparent opacity-40 cursor-not-allowed'
                        }`}
                        title="Copy doubt as prompt"
                    >
                        {doubtCopied ? <Check size={12} className="text-[var(--color-brand)] shrink-0" /> : <Copy size={12} className="shrink-0" />}
                        <span>{doubtCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
            </div>
        ) : (
            <div
                ref={popoverRef}
                style={style}
                className="flex flex-col gap-2 rounded-lg bg-[var(--color-surface-raised)] p-2 shadow-lg ring-1 ring-[var(--color-border-subtle)] w-64"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider">Add Comment</span>
                    <button
                        onClick={() => setView('menu')}
                        className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] cursor-pointer"
                    >
                        <ArrowLeft size={12} />
                        <span>Back</span>
                    </button>
                </div>

                <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Type your comment (Ctrl+Enter to save)..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-2 text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-brand)] resize-none h-20"
                    autoFocus
                />

                <label className="flex items-center gap-1.5 -mt-0.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={isExplanation}
                        onChange={(e) => setIsExplanation(e.target.checked)}
                        className="h-3 w-3 rounded border-[var(--color-border-default)] accent-[var(--color-brand)] cursor-pointer"
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)]">Mark as my explanation</span>
                </label>

                <div className="flex items-center justify-end mt-1">
                    <button
                        onClick={handleCommentSubmit}
                        disabled={!commentBody.trim() || isSavingComment}
                        className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-colors ${
                            commentBody.trim() && !isSavingComment
                                ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] cursor-pointer hover:bg-[var(--color-brand-hover)]'
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-body)] opacity-40 cursor-not-allowed'
                        }`}
                    >
                        {isSavingComment ? 'Saving…' : 'Save Comment'}
                    </button>
                </div>
            </div>
        ),
        document.body,
    );
}
