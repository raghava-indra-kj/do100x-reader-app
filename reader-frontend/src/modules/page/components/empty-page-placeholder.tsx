import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Page } from '@domain/page/models/page';
import { PageListItem } from '@domain/page/models/page-list-item';
import { queryPages } from '@domain/page/services/pages-service';
import { DataState } from '@lib/utils/data-state';
import { usePageStore } from '../store';
import { UpsertPageDialog } from './upsert-page';
import { Button } from '@modules/core/ui/primitives/button';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { FolderTree, FilePlus, Pencil, ClipboardPaste } from 'lucide-react';
import { SubpageRow } from './subpage-row';

export interface EmptyPagePlaceholderProps {
    page: Page;
}

export const EmptyPagePlaceholder = observer(function EmptyPagePlaceholder({ page }: EmptyPagePlaceholderProps) {
    const store = usePageStore();
    const mountedRef = useRef(true);

    const [subpagesState, setSubpagesState] = useState<DataState<PageListItem[]>>(DataState.init);
    const [editPageOpen, setEditPageOpen] = useState(false);
    const [createSubpageOpen, setCreateSubpageOpen] = useState(false);

    const loadSubpages = useCallback(() => {
        setSubpagesState(DataState.loading());
        queryPages({ parentPageId: page.id }).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setSubpagesState(DataState.data(result.data));
            } else {
                setSubpagesState(DataState.error(result.error));
            }
        });
    }, [page.id]);

    useEffect(() => {
        mountedRef.current = true;
        loadSubpages();
        return () => {
            mountedRef.current = false;
        };
    }, [loadSubpages]);

    const subpages = subpagesState.ifLoadedOr({
        loaded: (list) => list,
        or: () => [] as PageListItem[],
    });

    const hasSubpages = subpages.length > 0;

    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                toast.error('Clipboard is empty');
                return;
            }
            setEditPageOpen(true);
        } catch {
            setEditPageOpen(true);
        }
    }, []);

    return (
        <div className="subpage-explorer">
            <header className="subpage-heading">
                <div className="subpage-heading-copy">
                    <FolderTree size={20} aria-hidden="true" />
                    <div><h1>{page.title}</h1>{page.category && <p>{page.category}</p>}</div>
                </div>
                {store.isOwner && <div className="subpage-heading-actions">
                    <Button variant="outlined" size="sm" onClick={() => setCreateSubpageOpen(true)}><FilePlus size={14} aria-hidden="true" /> New subpage</Button>
                    <Button size="sm" onClick={() => setEditPageOpen(true)}><Pencil size={14} aria-hidden="true" /> Add content</Button>
                    {!hasSubpages && subpagesState.isLoaded && <Button variant="ghost" size="sm" onClick={handlePasteFromClipboard}><ClipboardPaste size={14} aria-hidden="true" /> Paste content</Button>}
                </div>}
            </header>
            {hasSubpages && <section className="subpage-list-section" aria-label="Subpages">
                <h2 className="subpage-list-label">Subpages · {subpages.length}</h2>
                <div className="subpage-list">
                    {subpages.map(subpage => <SubpageRow key={subpage.id} page={subpage} parentPageId={page.id}
                        showMetadata onDeleted={loadSubpages} onEdited={loadSubpages} />)}
                </div>
            </section>}
            {!hasSubpages && subpagesState.isLoaded && <div className="subpage-empty">
                <p>No subpages yet.</p>
                {store.isOwner && <p>Add content or create a subpage.</p>}
            </div>}
            {subpagesState.isLoading && <div className="flex justify-center p-6" role="status" aria-label="Loading subpages"><Loader /></div>}
            {subpagesState.isError && <div className="subpage-empty" role="alert">
                <p>Couldn’t load subpages.</p><Button variant="ghost" size="sm" onClick={loadSubpages}>Retry</Button>
            </div>}

            {/* Edit Current Page Dialog */}
            {store.isOwner && (
                <UpsertPageDialog
                    open={editPageOpen}
                    onOpenChange={setEditPageOpen}
                    parentPageId={page.parentPageId}
                    editPageId={page.id}
                    initialTitle={page.title}
                    initialContent={page.content}
                    initialCategory={page.category}
                />
            )}

            {/* Create Subpage Dialog */}
            {store.isOwner && (
                <UpsertPageDialog
                    open={createSubpageOpen}
                    onOpenChange={(open) => {
                        setCreateSubpageOpen(open);
                        if (!open) loadSubpages();
                    }}
                    parentPageId={page.id}
                />
            )}
        </div>
    );
});
