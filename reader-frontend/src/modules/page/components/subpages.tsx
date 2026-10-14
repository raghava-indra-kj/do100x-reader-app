import { SidebarHeader, SidebarSearch, SidebarEmpty } from './sidebar-ui';
import { queryPages } from '@domain/page/services/pages-service';
import type { PageListItem } from '@domain/page/models/page-list-item';
import { DataState } from '@lib/utils/data-state';
import { Button } from '@modules/core/ui/primitives/button';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { Select } from '@modules/core/ui/primitives/select';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePageStore } from '../store';
import { SubpageItem } from './subpage-item';
import { UpsertPageDialog } from './upsert-page';
import { ImportMarkdownAction } from './import-markdown';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSubpageReorder } from '../hooks/use-subpage-reorder';
import { sortSubpages, groupSubpages } from '../subpage-order';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { PageSubpageSort, PageSubpageGroup } from '../theme';

const SORT_ITEMS = Object.fromEntries(PageSubpageSort.VALUES.map(s => [s.id, s.label]));
const GROUP_ITEMS = Object.fromEntries(PageSubpageGroup.VALUES.map(g => [g.id, g.label]));

export const PageSubpages = observer(function PageSubpages() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;
    const [dataState, setDataState] = useState<DataState<PageListItem[]>>(DataState.init);
    const [search, setSearch] = useState('');
    const [upsertOpen, setUpsertOpen] = useState(false);
    const mountedRef = useRef(true);
    const requestVersion = useRef(0);
    const hasSearch = !!search.trim();

    const load = useCallback(() => {
        const request = ++requestVersion.current;
        setDataState(DataState.loading());
        queryPages({ parentPageId: store.pageId }).then((result) => {
            if (!mountedRef.current || request !== requestVersion.current) return;
            if (result.ok) {
                setDataState(DataState.data(result.data));
            } else {
                setDataState(DataState.error(result.error));
            }
        });
    }, [store.pageId, store.subpagesVersion]);

    useEffect(() => {
        mountedRef.current = true;
        load();
        return () => {
            mountedRef.current = false;
            requestVersion.current++;
        };
    }, [load]);

    const { sensors, onDragEnd } = useSubpageReorder();

    const filtered = useMemo(() => {
        return dataState.ifLoadedOr({
            loaded: (pages) => {
                if (!hasSearch) return pages;
                const q = search.toLowerCase();
                return pages.filter((p) => p.title.toLowerCase().includes(q));
            },
            or: () => [],
        });
    }, [dataState, hasSearch, search]);

    const sorted = useMemo(() => sortSubpages(filtered, uiSettings.subpageSort), [filtered, uiSettings.subpageSort]);
    const isGrouped = uiSettings.subpageGroup.groupByCategory && !hasSearch;
    const canDragReorder = store.isOwner && !hasSearch && !isGrouped && uiSettings.subpageSort === PageSubpageSort.SORT_ORDER;

    const grouped = useMemo(() => {
        if (!isGrouped) return null;
        return groupSubpages(sorted);
    }, [isGrouped, sorted]);

    return (
        <div className="reader-panel subpage-sidebar">
            <SidebarHeader title="Subpages" actions={<>
                {store.isOwner && !store.optCurrentPage?.captureExpiresAt && <ImportMarkdownAction iconOnly />}
                {store.isOwner && !store.optCurrentPage?.captureExpiresAt && (
                    <Button size="sm" iconOnly onClick={() => setUpsertOpen(true)} tooltip="New subpage" aria-label="New subpage">
                        <Plus size={14} />
                    </Button>
                )}
            </>} />
            <div className="reader-panel-toolbar">
                <SidebarSearch label="Find a subpage" value={search} onChange={setSearch} />
            <div className="reader-panel-filters">
                <label>Sort
                <Select
                    value={uiSettings.subpageSort.id}
                    onValueChange={(id) => {
                        const sort = PageSubpageSort.VALUES.find(s => s.id === id);
                        if (sort) uiSettings.setSubpageSort(sort);
                    }}
                    items={SORT_ITEMS}
                    placeholder="Sort"
                    className="h-7 py-0 text-xs flex-1"
                    tooltip="Sort subpages"
                    ariaLabel="Sort subpages"
                /></label>
                <label>Group<Select
                    value={uiSettings.subpageGroup.id}
                    onValueChange={(id) => {
                        const group = PageSubpageGroup.VALUES.find(g => g.id === id);
                        if (group) uiSettings.setSubpageGroup(group);
                    }}
                    items={GROUP_ITEMS}
                    placeholder="Group"
                    className="h-7 py-0 text-xs flex-1"
                    tooltip="Group subpages"
                    ariaLabel="Group subpages"
                />
            </label></div></div>
            <div className="reader-panel-scroll">
                {dataState.fold({
                    pending: () => (
                        <div className="flex items-center justify-center p-8">
                            <Loader />
                        </div>
                    ),
                    loaded: () => {
                        if (sorted.length === 0) {
                            return hasSearch ? <SidebarEmpty title="No matching subpages"><button onClick={() => setSearch('')}>Clear search</button></SidebarEmpty> : <SidebarEmpty title="Keep related reading together">Create a subpage or import a Markdown file using the tools above.</SidebarEmpty>;
                        }

                        if (isGrouped && grouped) {
                            return (
                                <div className="flex flex-col gap-2">
                                    {grouped.map((group) => (
                                        <div key={group.category ?? '__uncategorized__'}>
                                            <div className="px-3 pt-3 pb-1 text-xs font-medium text-[var(--color-text-muted)]">
                                                {group.category ?? 'Uncategorized'}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                {group.pages.map((page) => (
                                                    <SubpageItem
                                                        key={page.id}
                                                        page={page}
                                                        onDeleted={load}
                                                        onEdited={load}
                                                        parentPageId={store.pageId}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        if (canDragReorder) {
                            return (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={onDragEnd}
                                >
                                    <SortableContext
                                        items={sorted.map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex flex-col">
                                            {sorted.map((page) => (
                                                <SubpageItem
                                                    key={page.id}
                                                    page={page}
                                                    onDeleted={load}
                                                        onEdited={load}
                                                    parentPageId={store.pageId}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            );
                        }

                        return (
                            <div className="flex flex-col">
                                {sorted.map((page) => (
                                    <SubpageItem
                                        key={page.id}
                                        page={page}
                                        onDeleted={load}
                                                        onEdited={load}
                                        parentPageId={store.pageId}
                                        hideDrag
                                    />
                                ))}
                            </div>
                        );
                    },
                    error: () => (
                        <div className="reader-panel-error" role="alert">Couldn’t load subpages.<button onClick={load}>Retry</button></div>
                    ),
                })}
            </div>
            <UpsertPageDialog
                open={upsertOpen}
                onOpenChange={setUpsertOpen}
                parentPageId={store.pageId}
            />
        </div>
    );
});
