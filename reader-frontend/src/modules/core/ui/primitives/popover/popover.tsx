import type { ReactElement, ReactNode } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';

export interface PopoverProps {
    content: ReactNode;
    children: ReactElement;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    align?: 'start' | 'center' | 'end';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
}

export function Popover({
    content,
    children,
    side = 'bottom',
    sideOffset = 8,
    align = 'center',
    open,
    onOpenChange,
    defaultOpen,
}: PopoverProps) {
    return (
        <BasePopover.Root open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
            <BasePopover.Trigger render={children} />
            <BasePopover.Portal>
                <BasePopover.Positioner side={side} sideOffset={sideOffset} align={align} className="z-50">
                    <BasePopover.Popup className="origin-(--transform-origin) min-w-48 rounded-lg bg-(--color-surface-raised) p-3 text-sm text-(--color-text-body) shadow-lg outline-none ring-1 ring-(--color-border-subtle) transition-[opacity,transform] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
                        {content}
                    </BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    );
}

export { BasePopover };
