import { pagesPageWithIdRouteValue } from '@boot/routes';
import type { PageListItem } from '@domain/page/models/page-list-item';
import { Trash2, GripVertical, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeletePageDialog } from './delete-page';
import { UpsertPageDialog } from './upsert-page';

export interface SubpageItemProps {
    page: PageListItem;
    onDeleted?: () => void;
    parentPageId: string | null;
}

export function SubpageItem({ page, onDeleted, parentPageId }: SubpageItemProps) {
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className="group flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 hover:bg-[var(--color-surface-soft)] transition-colors"
            >
                <button
                    {...attributes}
                    {...listeners}
                    className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical size={12} />
                </button>
                <button
                    onClick={() => navigate(pagesPageWithIdRouteValue(page.id))}
                    className="flex flex-1 text-left text-sm text-[var(--color-text-body)] hover:text-[var(--color-text-strong)] cursor-pointer min-w-0"
                >
                    <span className="break-words">{page.title}</span>
                </button>
                <button
                    onClick={() => setEditOpen(true)}
                    className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all cursor-pointer"
                    title="Edit page"
                >
                    <Pencil size={14} />
                </button>
                <button
                    onClick={() => setDeleteOpen(true)}
                    className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-all cursor-pointer"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <UpsertPageDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                parentPageId={parentPageId}
                editPageId={page.id}
                initialTitle={page.title}
            />
            <DeletePageDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                pageId={page.id}
                pageTitle={page.title}
                onDeleted={onDeleted}
            />
        </>
    );
}
