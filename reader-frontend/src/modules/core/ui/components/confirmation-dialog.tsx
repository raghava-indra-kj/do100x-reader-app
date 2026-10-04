import { useId } from 'react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';

/** Controlled confirmation; callers own mutations, errors and draft protection. */
export function ConfirmationDialog({ open, onCancel, onConfirm, title, description, confirmLabel, cancelLabel = 'Cancel', pending = false, error }: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    pending?: boolean;
    error?: string | null;
}) {
    const titleId = useId(), descriptionId = useId();
    return <Dialog open={open} stacked labelledBy={titleId} describedBy={descriptionId}
        onOpenChange={value => { if (!value && !pending) onCancel(); }}
        className="w-[calc(100vw-32px)] max-w-sm border border-[var(--color-border-subtle)] p-5 text-[var(--color-text-strong)]">
        <div className="space-y-3">
            <h2 id={titleId} className="text-base font-semibold">{title}</h2>
            <p id={descriptionId} className="text-sm leading-relaxed text-[var(--color-text-body)]">{description}</p>
            {error && <p role="alert" className="text-sm text-[var(--color-text-error)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outlined" size="sm" disabled={pending} onClick={onCancel}>{cancelLabel}</Button>
                <Button type="button" size="sm" disabled={pending} loading={pending} onClick={() => { if (!pending) onConfirm(); }}>{confirmLabel}</Button>
            </div>
        </div>
    </Dialog>;
}
