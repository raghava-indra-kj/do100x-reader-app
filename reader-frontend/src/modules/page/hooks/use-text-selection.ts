import { useEffect, useState, useCallback, type RefObject } from 'react';

export interface TextSelection {
    /** The selected plain text */
    text: string;
    /** Bounding rect of the selection range, for positioning */
    rect: DOMRect;
    /** The actual selection range, to compute updated rects on scroll */
    range: Range;
}

/**
 * Detects text selection within a container element.
 * Returns `{ text, rect, range }` when there is a non-empty selection inside the container, `null` otherwise.
 * Automatically dismisses on Escape or click-outside. Repositions on scroll.
 *
 * @param containerRef  The element whose text can be selected.
 * @param popoverRef    The popover DOM node — clicks inside it won't dismiss the selection.
 */
export function useTextSelection(
    containerRef: RefObject<HTMLElement | null>,
    popoverRef: RefObject<HTMLElement | null>,
): TextSelection | null {
    const [selection, setSelection] = useState<TextSelection | null>(null);

    const dismiss = useCallback(() => setSelection(null), []);

    const checkSelection = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            setSelection(null);
            return;
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            setSelection(null);
            return;
        }

        const text = sel.toString().trim();
        if (!text) {
            setSelection(null);
            return;
        }

        // Make sure the selection is within the container
        const anchorNode = sel.anchorNode;
        const focusNode = sel.focusNode;
        if (!anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) {
            setSelection(null);
            return;
        }

        const range = sel.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();

        // Guard against zero-size rects (can happen with collapsed or invisible ranges)
        if (rect.width === 0 && rect.height === 0) {
            setSelection(null);
            return;
        }

        setSelection({ text, rect, range });
    }, [containerRef]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // mouseup is the primary trigger — fires after click, drag-select, double/triple click
        const handleMouseUp = () => {
            // Small delay to let the browser finalize the selection
            requestAnimationFrame(() => {
                checkSelection();
            });
        };

        // Dismiss on Escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                dismiss();
                window.getSelection()?.removeAllRanges();
            }
        };

        // Reposition on scroll — re-read the selection rect so the popover follows
        const handleScroll = () => {
            if (selection) {
                const rect = selection.range.getBoundingClientRect();
                setSelection({
                    text: selection.text,
                    range: selection.range,
                    rect,
                });
            } else {
                checkSelection();
            }
        };

        // Dismiss when clicking outside the container AND outside the popover
        const handleDocumentMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            const popover = popoverRef.current;
            if (selection && !container.contains(target) && (!popover || !popover.contains(target))) {
                dismiss();
            }
        };

        container.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleDocumentMouseDown);

        // Find the scrollable ancestor — the `<main>` with overflow-y-auto
        const scrollParent = container.closest('main') ?? container.parentElement;
        scrollParent?.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleDocumentMouseDown);
            scrollParent?.removeEventListener('scroll', handleScroll);
        };
    }, [containerRef, popoverRef, checkSelection, dismiss, selection]);

    return selection;
}

