import { useCallback } from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { usePageStore } from '../store';

export function useSubpageReorder() {
    const store = usePageStore();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const error = await store.reorderSubpages(String(active.id), String(over.id));
        if (error) toast.error(error);
    }, [store]);
    return { sensors, onDragEnd };
}
