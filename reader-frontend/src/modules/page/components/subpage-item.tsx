import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { observer } from 'mobx-react-lite';
import { usePageStore } from '../store';
import { SubpageRow, type SubpageRowProps } from './subpage-row';

export interface SubpageItemProps extends SubpageRowProps {
    hideDrag?: boolean;
}

export const SubpageItem = observer(function SubpageItem({ hideDrag, ...props }: SubpageItemProps) {
    const store = usePageStore();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: props.page.id, disabled: !store.isOwner || hideDrag,
    });
    return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined }}>
        <SubpageRow {...props} dragHandle={store.isOwner && !hideDrag ? <button type="button" {...attributes} {...listeners}
            className="subpage-drag" title="Drag to reorder" aria-label={`Reorder ${props.page.title}`}>
            <GripVertical size={12} aria-hidden="true" />
        </button> : undefined} />
    </div>;
});
