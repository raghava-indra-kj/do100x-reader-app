import { createPortal } from 'react-dom';
import { useRef, useState, useEffect, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { usePageStore } from '../store';
import { BookOpen, Globe, ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';

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

    const [view, setView] = useState<'menu' | 'doubt'>('menu');
    const [doubt, setDoubt] = useState('');

    useEffect(() => {
        setView('menu');
        setDoubt('');
    }, [selection?.text]);

    if (!selection) return null;

    const { text, rect } = selection;
    const trimmedText = text.trim();

    // — Meaning: enabled only for a single word
    const canMeaning = isSingleWord(trimmedText);

    // — Explain with Google: enabled only if URL fits within limit
    const sectionTitle = section.title ?? section.rawTitle ?? '';
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

    // Position above the selection by default; flip below if not enough space
    const spaceAbove = rect.top;
    const showAbove = spaceAbove > 60;

    const style: React.CSSProperties = {
        position: 'fixed',
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        ...(showAbove
            ? { bottom: window.innerHeight - rect.top + POPOVER_OFFSET }
            : { top: rect.bottom + POPOVER_OFFSET }),
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
            </div>
        ) : (
            <div
                ref={popoverRef}
                style={style}
                className="flex flex-col gap-2 rounded-lg bg-[var(--color-surface-raised)] p-2 shadow-lg ring-1 ring-[var(--color-border-subtle)] w-64"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5">
                    <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider">Ask Doubt</span>
                    <button
                        onClick={() => setView('menu')}
                        className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] cursor-pointer"
                    >
                        <ArrowLeft size={12} />
                        <span>Back</span>
                    </button>
                </div>

                <textarea
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your doubt here (Ctrl+Enter to submit)..."
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-2 text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-brand)] resize-none h-20"
                    autoFocus
                />

                <div className="flex items-center justify-between mt-1.5">
                    <div className="flex flex-col text-[9px] text-[var(--color-text-body)] opacity-70 leading-tight">
                        <span>G: {remainingGoogleChars >= 0 ? `${remainingGoogleChars} left` : 'Too long'}</span>
                        <span>D: {remainingDuckChars >= 0 ? `${remainingDuckChars} left` : 'Too long'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleGoogleSubmit}
                            disabled={!canSubmitGoogle}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                canSubmitGoogle
                                    ? 'bg-[var(--color-surface-soft)] hover:bg-[var(--color-surface-card)] text-[var(--color-text-strong)] border border-[var(--color-border-strong)] cursor-pointer'
                                    : 'bg-[var(--color-surface-soft)] text-[var(--color-text-body)] opacity-40 cursor-not-allowed border border-[var(--color-border-subtle)]'
                            }`}
                        >
                            Google
                        </button>
                        <button
                            onClick={handleDuckSubmit}
                            disabled={!canSubmitDuck}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                canSubmitDuck
                                    ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] cursor-pointer hover:bg-[var(--color-brand-hover)]'
                                    : 'bg-[var(--color-surface-soft)] text-[var(--color-text-body)] opacity-40 cursor-not-allowed'
                            }`}
                        >
                            DuckAI
                        </button>
                    </div>
                </div>
            </div>
        ),
        document.body,
    );
}
