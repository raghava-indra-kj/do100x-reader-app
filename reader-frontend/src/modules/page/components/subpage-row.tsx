import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { ChevronRight, FileText, Globe, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { readerPageWithIdRouteValue } from '@boot/routes';
import type { PageListItem } from '@domain/page/models/page-list-item';
import { Button } from '@modules/core/ui/primitives/button';
import { Popover } from '@modules/core/ui/primitives/popover';
import { usePageStore } from '../store';
import { DeletePageDialog } from './delete-page';
import { UpsertPageDialog } from './upsert-page';
import './subpages.css';

export interface SubpageRowProps {
    page: PageListItem;
    parentPageId: string | null;
    onDeleted?: () => void;
    onEdited?: () => void;
    showMetadata?: boolean;
    dragHandle?: ReactNode;
}

/** Shared row presentation; sorting belongs to the sidebar wrapper, not this row. */
export const SubpageRow = observer(function SubpageRow({ page, parentPageId, onDeleted, onEdited, showMetadata = false, dragHandle }: SubpageRowProps) {
    const store = usePageStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    return <div className="subpage-row">
        {dragHandle}
        <Link to={readerPageWithIdRouteValue(page.id)} className="subpage-link" title={page.title}>
            <FileText size={15} aria-hidden="true" className="subpage-icon" />
            <span className="subpage-text"><span className="subpage-title">{page.title}</span>{page.category && <span className="subpage-category" title={page.category}>{page.category}</span>}</span>
            {page.isPublic && !store.optCurrentPage?.isPubliclyAccessible && <Globe size={12} aria-label="Public subpage" className="subpage-icon" />}
            {showMetadata && <time className="subpage-date" dateTime={page.createdAt.toISOString()} title="Created">{page.createdAt.toLocaleDateString()}</time>}
            <ChevronRight size={14} aria-hidden="true" className="subpage-chevron" />
        </Link>
        {store.isOwner && <>
            <Popover open={menuOpen} onOpenChange={setMenuOpen} align="end" content={
                <div className="subpage-actions" role="group" aria-label={`Actions for ${page.title}`}>
                    <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); setEditOpen(true); }}><Pencil size={14} aria-hidden="true" /> Edit page</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}><Trash2 size={14} aria-hidden="true" /> Delete page</Button>
                </div>
            }>
                <Button variant="ghost" size="sm" iconOnly aria-label={`Page actions: ${page.title}`} tooltip="Page actions"><MoreHorizontal size={16} aria-hidden="true" /></Button>
            </Popover>
            <UpsertPageDialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) onEdited?.(); }} parentPageId={parentPageId} editPageId={page.id} initialTitle={page.title} initialCategory={page.category} />
            <DeletePageDialog open={deleteOpen} onOpenChange={setDeleteOpen} pageId={page.id} pageTitle={page.title} onDeleted={onDeleted} />
        </>}
    </div>;
});
