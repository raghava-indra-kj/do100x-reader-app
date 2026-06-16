import { deletePage } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { useCallback, useState } from 'react';
import { X, Trash2 } from 'lucide-react';

export interface DeletePageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pageId: string;
    pageTitle: string;
    onDeleted?: () => void;
}

export function DeletePageDialog({ open, onOpenChange, pageId, pageTitle, onDeleted }: DeletePageDialogProps) {
    const [submitState, setSubmitState] = useState<DataState<void>>(DataState.init);

    const handleDelete = useCallback(async () => {
        setSubmitState(DataState.loading());
        const result = await deletePage({ pageId });
        if (result.ok) {
            setSubmitState(DataState.data(undefined));
            onOpenChange(false);
            onDeleted?.();
        } else {
            setSubmitState(DataState.error(result.error));
        }
    }, [pageId, onOpenChange, onDeleted]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">Delete page</h2>
                    <BaseDialog.Close className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]">
                        <X size={20} />
                    </BaseDialog.Close>
                </div>
                <p className="text-sm text-[var(--color-text-body)]">
                    Are you sure you want to delete <span className="font-medium text-[var(--color-text-strong)]">{pageTitle}</span>? This action cannot be undone.
                </p>
                {submitState.isError && (
                    <p className="text-sm text-[var(--color-error)]">{submitState.error.message}</p>
                )}
                <div className="flex justify-end gap-3">
                    <Button variant="outlined" onClick={() => onOpenChange(false)} disabled={submitState.isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} loading={submitState.isLoading} disabled={submitState.isLoading}>
                        <Trash2 size={14} />
                        Delete
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
