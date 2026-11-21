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
import { FolderOpen, FilePlus, FilePenLine, FileText, ClipboardPaste, FileUp, Ellipsis, ListFilter, RefreshCw, CircleAlert } from 'lucide-react';
import { SubpageRow } from './subpage-row';
import { Popover } from '@modules/core/ui/primitives/popover';
import { ImportMarkdownDialog } from './import-markdown';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SubpageItem } from './subpage-item';
import { useSubpageReorder } from '../hooks/use-subpage-reorder';
import { sortSubpages, groupSubpages } from '../subpage-order';
import { PageSubpageSort, PageSubpageGroup } from '../theme';

export interface EmptyPagePlaceholderProps {
    page: Page;
}

export const EmptyPagePlaceholder = observer(function EmptyPagePlaceholder({ page }: EmptyPagePlaceholderProps) {
    const store = usePageStore();
    const mountedRef = useRef(true);
    const requestVersion = useRef(0);
    const { sensors, onDragEnd } = useSubpageReorder();
    const settings = store.uiSettingsStore;

    const [subpagesState, setSubpagesState] = useState<DataState<PageListItem[]>>(DataState.init);
    const [editPageOpen, setEditPageOpen] = useState(false);
    const [createSubpageOpen, setCreateSubpageOpen] = useState(false);

    const [actionsOpen, setActionsOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [clipboardText, setClipboardText] = useState<string>();

    const loadSubpages = useCallback(() => {
        const request = ++requestVersion.current;
        setSubpagesState(DataState.loading());
        queryPages({ parentPageId: page.id }).then((result) => {
            if (!mountedRef.current || request !== requestVersion.current) return;
            if (result.ok) {
                setSubpagesState(DataState.data(result.data));
            } else {
                setSubpagesState(DataState.error(result.error));
            }
        });
    }, [page.id, store.subpagesVersion]);

    useEffect(() => {
        mountedRef.current = true;
        loadSubpages();
        return () => {
            mountedRef.current = false;
            requestVersion.current++;
        };
    }, [loadSubpages]);

    const subpages = subpagesState.ifLoadedOr({
        loaded: (list) => list,
        or: () => [] as PageListItem[],
    });

    const hasSubpages = subpages.length > 0;
    const sorted = sortSubpages(subpages, settings.subpageSort);
    const grouped = settings.subpageGroup.groupByCategory;
    const canManage = store.isOwner && !page.captureExpiresAt;
    const empty = subpagesState.isLoaded && !hasSubpages;
    const canReorder = subpages.length > 1 && canManage && !grouped && settings.subpageSort === PageSubpageSort.SORT_ORDER;
    const renderRows = (items: PageListItem[]) => <div className="subpage-list">
        {items.map(subpage => canReorder
            ? <SubpageItem key={subpage.id} page={subpage} parentPageId={page.id} showMetadata />
            : <SubpageRow key={subpage.id} page={subpage} parentPageId={page.id} showMetadata />)}
    </div>;

    function writePage() {
        setActionsOpen(false);
        setClipboardText(undefined);
        setEditPageOpen(true);
    }

    async function pasteContent() {
        setActionsOpen(false);
        const version = requestVersion.current;
        try {
            const text = await navigator.clipboard.readText();
            if (!mountedRef.current || requestVersion.current !== version) return;
            if (!text.trim()) {
                toast.error('Copy some text first.');
                return;
            }
            setClipboardText(text);
            setEditPageOpen(true);
        } catch {
            if (!mountedRef.current || requestVersion.current !== version) return;
            writePage();
            toast.show('Paste your text into the editor.');
        }
    }

    return (
        <div className="subpage-explorer">
            <header className="subpage-heading">
                <div className="subpage-heading-copy">
                    <span className="subpage-page-icon" aria-hidden="true">{hasSubpages ? <FolderOpen size={20} /> : <FileText size={20} />}</span>
                    <div><h1>{page.title}</h1>{page.category && <p>{page.category}</p>}</div>
                </div>
                {canManage && <div className="subpage-heading-actions">
                    {hasSubpages && <Button size="sm" onClick={() => setCreateSubpageOpen(true)}><FilePlus size={15} /> New subpage</Button>}
                    <Popover align="end" open={actionsOpen} onOpenChange={setActionsOpen} content={
                        <div className="subpage-actions" role="group" aria-label="More page actions">
                            {!empty && <Button variant="ghost" size="sm" onClick={writePage}><FilePenLine size={15} /> Write on this page</Button>}
                            {!empty && !hasSubpages && <Button variant="ghost" size="sm" onClick={() => { setActionsOpen(false); setCreateSubpageOpen(true); }}><FilePlus size={15} /> New subpage</Button>}
                            <Button variant="ghost" size="sm" onClick={() => { setActionsOpen(false); setImportOpen(true); }}><FileUp size={15} /> Import Markdown</Button>
                            <Button variant="ghost" size="sm" onClick={pasteContent}><ClipboardPaste size={15} /> Paste content</Button>
                        </div>
                    }><Button variant="outlined" size="sm" iconOnly aria-label="More page actions" tooltip="More page actions"><Ellipsis size={17} /></Button></Popover>
                </div>}
            </header>
            {hasSubpages && <section className="subpage-list-section" aria-label="Subpages">
                <div className="subpage-list-toolbar">
                    <h2>Subpages <span>{subpages.length}</span></h2>
                    {subpages.length > 1 && <Popover align="end" content={<div className="subpage-view-options">
                        <label>Sort <select aria-label="Sort main page list" value={settings.subpageSort.id} onChange={event => {
                            const value = PageSubpageSort.VALUES.find(item => item.id === event.target.value);
                            if (value) settings.setSubpageSort(value);
                        }}>{PageSubpageSort.VALUES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                        <label>Group <select aria-label="Group main page list" value={settings.subpageGroup.id} onChange={event => {
                            const value = PageSubpageGroup.VALUES.find(item => item.id === event.target.value);
                            if (value) settings.setSubpageGroup(value);
                        }}>{PageSubpageGroup.VALUES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                        {canManage && !canReorder && <Button variant="ghost" size="sm" onClick={() => {
                            settings.setSubpageSort(PageSubpageSort.SORT_ORDER); settings.setSubpageGroup(PageSubpageGroup.NONE);
                        }}>Rearrange pages</Button>}
                    </div>}><Button variant="ghost" size="sm"><ListFilter size={15} /> View options</Button></Popover>}
                </div>
                {grouped ? groupSubpages(sorted).map(group => <div key={group.category ?? '__uncategorized__'} className="subpage-list-group">
                    <h3 className="subpage-list-label">{group.category ?? 'Uncategorized'}</h3>{renderRows(group.pages)}
                </div>) : canReorder ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={sorted.map(item => item.id)} strategy={verticalListSortingStrategy}>{renderRows(sorted)}</SortableContext>
                </DndContext> : renderRows(sorted)}
            </section>}
            {empty && <section className="subpage-empty">
                <span className="subpage-state-icon" aria-hidden="true">{canManage ? <FilePenLine size={24} /> : <FileText size={24} />}</span>
                <h2>{canManage ? 'Start this page' : 'This page is empty'}</h2>
                <p>{canManage ? 'Write a note here, or create a subpage for a related topic.' : 'No notes or subpages to read yet.'}</p>
                {canManage && <div className="subpage-empty-actions">
                    <Button size="sm" onClick={writePage}><FilePenLine size={15} /> Write on this page</Button>
                    <Button variant="outlined" size="sm" onClick={() => setCreateSubpageOpen(true)}><FilePlus size={15} /> New subpage</Button>
                </div>}
            </section>}
            {subpagesState.isLoading && <div className="flex justify-center p-6" role="status" aria-label="Loading subpages"><Loader /></div>}
            {subpagesState.isError && <div className="subpage-empty" role="alert">
                <span className="subpage-state-icon"><CircleAlert size={24} /></span>
                <h2>Couldn’t load the subpages</h2>
                <Button variant="outlined" size="sm" onClick={loadSubpages}><RefreshCw size={14} /> Try again</Button>
            </div>}
            {canManage && <>
                <ImportMarkdownDialog open={importOpen} onOpenChange={setImportOpen} />
                <UpsertPageDialog open={editPageOpen} onOpenChange={setEditPageOpen}
                    parentPageId={page.parentPageId} page={page} initialContent={clipboardText} />
            </>}

            {/* Create Subpage Dialog */}
            {canManage && (
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
