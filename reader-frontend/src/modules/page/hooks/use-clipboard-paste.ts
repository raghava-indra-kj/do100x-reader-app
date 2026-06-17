import { useEffect, useRef } from "react";
import { extractFrontmatterTitle, type ExtractedPaste } from "@lib/md-parser";
import { isDialogConsuming } from "../clipboard-paste";

export function useClipboardPaste(
    onPaste: (data: ExtractedPaste) => void,
    enabled: boolean = true,
): void {
    const callbackRef = useRef(onPaste);
    callbackRef.current = onPaste;

    useEffect(() => {
        if (!enabled) return;

        function handlePaste(e: ClipboardEvent) {
            if (!e.clipboardData) return;
            if (isDialogConsuming()) return;

            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            const text = e.clipboardData.getData("text/plain");
            if (!text.trim()) return;

            e.preventDefault();
            callbackRef.current(extractFrontmatterTitle(text));
        }

        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [enabled]);
}
