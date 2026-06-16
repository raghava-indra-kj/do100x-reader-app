import { queryPages, swapSortOrder } from '@domain/page/services/pages-service';
import type { PageListItem } from '@domain/page/models/page-list-item';
import { DataState } from '@lib/utils/data-state';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageStore } from '../store';
import { SubpageItem } from './subpage-item';
import { UpsertPageDialog } from './upsert-page';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FileText, Plus, Search } from 'lucide-react';

export const PageSubpages = observer(function PageSubpages() {
    const store = usePageStore();
    const [dataState, setDataState] = useState<DataState<PageListItem[]>>(DataState.init);
    const [search, setSearch] = useState('');
    const [upsertOpen, setUpsertOpen] = useState(false);
    const mountedRef = useRef(true);
    const hasSearch = !!search.trim();

    const load = useCallback(() => {
        setDataState(DataState.loading());
        queryPages({ parentPageId: store.pageId }).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setDataState(DataState.data(result.data));
            } else {
                setDataState(DataState.error(result.error));
            }
        });
    }, [store.pageId]);

    useEffect(() => {
        mountedRef.current = true;
        load();
        return () => {
            mountedRef.current = false;
        };
    }, [load]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const result = await swapSortOrder({
            pageId1: String(active.id),
            pageId2: String(over.id),
        });
        if (result.ok) load();
    }, [load]);

    const filtered = dataState.ifLoadedOr({
        loaded: (pages) => {
            if (!hasSearch) return pages;
            const q = search.toLowerCase();
            return pages.filter((p) => p.title.toLowerCase().includes(q));
        },
        or: () => [],
    });

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                    <Input
                        size="sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search…"
                        autoComplete="off"
                        className="pl-8"
                    />
                </div>
                <Button size="sm" iconOnly onClick={() => setUpsertOpen(true)} tooltip="New page">
                    <Plus size={14} />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {dataState.fold({
                    pending: () => (
                        <div className="flex items-center justify-center p-8">
                            <Loader />
                        </div>
                    ),
                    loaded: () => {
                        if (filtered.length === 0) {
                            if (hasSearch) {
                                return (
                                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                                        <Search size={24} className="text-[var(--color-text-subtle)]" />
                                        <p className="text-sm text-[var(--color-text-muted)]">No matching pages</p>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex flex-col items-center gap-2 p-8 text-center">
                                    <FileText size={24} className="text-[var(--color-text-subtle)]" />
                                    <p className="text-sm text-[var(--color-text-muted)]">No subpages yet</p>
                                </div>
                            );
                        }
                        return (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={filtered.map((p) => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex flex-col gap-0.5 p-3">
                                        {filtered.map((page) => (
                                            <SubpageItem
                                                key={page.id}
                                                page={page}
                                                onDeleted={load}
                                                parentPageId={store.pageId}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        );
                    },
                    error: () => (
                        <div className="p-4 text-sm text-[var(--color-text-error)]">Failed to load subpages</div>
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
