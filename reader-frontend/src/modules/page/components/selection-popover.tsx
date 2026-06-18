import { createPortal } from 'react-dom';
import { useRef, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { usePageStore } from '../store';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { Copy, BookOpen, Globe } from 'lucide-react';

const POPOVER_OFFSET = 10;
const GOOGLE_URL_MAX = 2048;

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

    if (!selection) return null;

    const { text, rect } = selection;
    const trimmedText = text.trim();

    // — Meaning: enabled only for a single word
    const canMeaning = isSingleWord(trimmedText);

    // — Explain with Google: enabled only if URL fits within limit
    const sectionTitle = section.title ?? section.rawTitle ?? '';
    const googleUrl = buildGoogleExplainUrl(page.title, sectionTitle, trimmedText);
    const canGoogle = googleUrl.length <= GOOGLE_URL_MAX;

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

    const handleCopy = () => {
        navigator.clipboard.writeText(trimmedText);
        toast.success('Copied to clipboard');
    };

    const handleMeaning = () => {
        if (!canMeaning) return;
        store.dictionaryStore.open(trimmedText);
    };

    const handleGoogle = () => {
        if (!canGoogle) return;
        window.open(googleUrl, '_blank', 'noopener,noreferrer');
    };

    return createPortal(
        <div
            ref={popoverRef}
            style={style}
            className="flex flex-col items-stretch gap-0.5 rounded-lg bg-[var(--color-surface-raised)] p-1 shadow-lg ring-1 ring-[var(--color-border-subtle)] min-w-[110px]"
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* Copy — always enabled */}
            <button onClick={handleCopy} className={`${btnBase} ${btnEnabled}`} title="Copy selection">
                <Copy size={13} />
                <span>Copy</span>
            </button>

            <div className="h-px bg-[var(--color-border-subtle)] mx-1" />

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
                <span>Explain</span>
            </button>
        </div>,
        document.body,
    );
}
