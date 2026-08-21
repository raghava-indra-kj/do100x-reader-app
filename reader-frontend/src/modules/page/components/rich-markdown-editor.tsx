import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useEffect, useRef, useState } from 'react';

export interface RichMarkdownEditorProps {
    /** A stable document ID. Changing it safely creates a fresh editor instance. */
    documentKey: string;
    initialMarkdown: string;
    onMarkdownChange: (markdown: string) => void;
    readOnly?: boolean;
}

/**
 * Markdown remains the persisted source of truth. Milkdown's ProseMirror state
 * exists only in the browser and serializes every user edit back to Markdown.
 */
export function RichMarkdownEditor({
    documentKey,
    initialMarkdown,
    onMarkdownChange,
    readOnly = false,
}: RichMarkdownEditorProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const onMarkdownChangeRef = useRef(onMarkdownChange);
    const initialMarkdownRef = useRef(initialMarkdown);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onMarkdownChangeRef.current = onMarkdownChange;
    }, [onMarkdownChange]);

    useEffect(() => {
        initialMarkdownRef.current = initialMarkdown;
        setError(null);
    }, [documentKey, initialMarkdown]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let disposed = false;
        const editor = new Crepe({
            root,
            defaultValue: initialMarkdownRef.current,
            // Attachments need durable object storage and signed URLs. Do not
            // allow the editor's browser-object-URL default into saved Markdown.
            features: {
                [Crepe.Feature.ImageBlock]: false,
                [Crepe.Feature.AI]: false,
            },
        }).setReadonly(readOnly);

        editor.on((listener) => {
            listener.markdownUpdated((_ctx, markdown) => {
                if (!disposed) onMarkdownChangeRef.current(markdown);
            });
        });

        editor.create().catch((cause: unknown) => {
            console.error('Failed to create the rich Markdown editor', cause);
            if (!disposed) setError('The visual editor could not start. Markdown source editing is still available.');
        });

        return () => {
            disposed = true;
            editor.destroy().catch((cause: unknown) => {
                console.error('Failed to dispose the rich Markdown editor', cause);
            });
        };
    }, [documentKey, readOnly]);

    if (error) {
        return <p className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-text-body)]">{error}</p>;
    }

    return <div ref={rootRef} className="reader-rich-markdown-editor min-h-0 flex-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-2" />;
}
