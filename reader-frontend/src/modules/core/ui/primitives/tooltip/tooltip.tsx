import type { ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

export const TooltipProvider = BaseTooltip.Provider;

export interface TooltipProps {
    content: ReactNode;
    children: ReactElement;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
}

export function Tooltip({ content, children, side = 'top', sideOffset = 6 }: TooltipProps) {
    if (content == null || content === '') return children;
    return (
        <BaseTooltip.Root>
            <BaseTooltip.Trigger render={children} />
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="z-50">
                    <BaseTooltip.Popup className="origin-(--transform-origin) rounded-sm bg-(--tooltip-bg) px-2 py-1 text-xs font-medium text-(--tooltip-text) shadow-md transition-[opacity,transform] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
                        {content}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    );
}

export { BaseTooltip };
