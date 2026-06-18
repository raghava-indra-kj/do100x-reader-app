import { createPortal } from 'react-dom';
import { useRef, type RefObject } from 'react';
import type { Page } from '@domain/page/models/page';
import type { Section } from '@domain/page/models/section';
import { useTextSelection } from '../hooks/use-text-selection';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { Copy } from 'lucide-react';

const POPOVER_OFFSET = 10;

export interface SelectionPopoverProps {
    containerRef: RefObject<HTMLElement | null>;
    page: Page;
    section: Section;
}

export function SelectionPopover({ containerRef, page: _page, section: _section }: SelectionPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const selection = useTextSelection(containerRef, popoverRef);

    if (!selection) return null;

    const { text, rect } = selection;

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
        navigator.clipboard.writeText(text);
        toast.success('Selection copied to clipboard');
    };

    return createPortal(
        <div
            ref={popoverRef}
            style={style}
            className="rounded-lg bg-[var(--color-surface-raised)] p-1 shadow-lg ring-1 ring-[var(--color-border-subtle)]"
            onMouseDown={(e) => e.preventDefault()} // prevent popover click from clearing selection
        >
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] transition-colors cursor-pointer"
            >
                <Copy size={13} />
                <span>Copy</span>
            </button>
        </div>,
        document.body,
    );
}

