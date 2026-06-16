import { createPage, editPage } from '@domain/page/services/pages-service';
import type { Page } from '@domain/page/models/page';
import { DataState } from '@lib/utils/data-state';
import { useAuthStore } from '@modules/auth/provider';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { FormLabel } from '@modules/core/ui/primitives/form-label';
import { Input } from '@modules/core/ui/primitives/input';
import { pagesPageWithIdRouteValue } from '@boot/routes';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { X } from 'lucide-react';

export interface UpsertPageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentPageId: string | null;
    page?: Page | null;
    editPageId?: string;
    initialTitle?: string;
}

export function UpsertPageDialog({ open, onOpenChange, parentPageId, page, editPageId, initialTitle }: UpsertPageDialogProps) {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const editId = editPageId ?? page?.id;
    const isEdit = !!editId;

    const [title, setTitle] = useState(page?.title ?? initialTitle ?? '');
    const [content, setContent] = useState(page?.content ?? '');
    const [submitState, setSubmitState] = useState<DataState<void>>(DataState.init);

    const handleSubmit = useCallback(async () => {
        if (!title.trim()) return;
        setSubmitState(DataState.loading());
        if (isEdit) {
            const result = await editPage({ pageId: editId, title: title.trim(), content });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
            } else {
                setSubmitState(DataState.error(result.error));
            }
        } else {
            const result = await createPage({
                userId: authStore.currentUser.id,
                parentPageId,
                title: title.trim(),
                content,
            });
            if (result.ok) {
                setSubmitState(DataState.data(undefined));
                onOpenChange(false);
                navigate(pagesPageWithIdRouteValue(result.data));
            } else {
                setSubmitState(DataState.error(result.error));
            }
        }
    }, [title, content, isEdit, editId, parentPageId, authStore, navigate, onOpenChange]);

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            className="flex flex-col max-h-[85vh] max-w-3xl p-0"
        >
            <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">
                    {isEdit ? 'Edit Page' : 'New Page'}
                </h2>
                <BaseDialog.Close className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]">
                    <X size={20} />
                </BaseDialog.Close>
            </div>
            <div className="flex flex-col gap-5 px-6 pb-4 min-h-0 flex-1">
                <div className="flex flex-col gap-2 shrink-0">
                    <FormLabel>Title</FormLabel>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Page title"
                        autoFocus
                    />
                </div>
                <div className="flex flex-col gap-2 min-h-0 flex-1">
                    <FormLabel>Content</FormLabel>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your content here…"
                        className="w-full flex-1 resize-none border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-subtle)] px-4 py-2.5 text-sm rounded-[var(--radius-md)] transition-colors outline-none overflow-y-auto"
                    />
                </div>
                {submitState.isError && (
                    <p className="text-sm shrink-0 text-[var(--color-error)]">{submitState.error.message}</p>
                )}
            </div>
            <div className="flex justify-end gap-3 shrink-0 border-t border-[var(--color-border-default)] px-6 py-4">
                <Button variant="outlined" onClick={() => onOpenChange(false)} disabled={submitState.isLoading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} loading={submitState.isLoading} disabled={!title.trim()}>
                    {isEdit ? 'Save' : 'Create'}
                </Button>
            </div>
        </Dialog>
    );
}
