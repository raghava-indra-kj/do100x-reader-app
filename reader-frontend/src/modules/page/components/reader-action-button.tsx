import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';

/** A reader action with the same hint on hover and keyboard focus. */
export const ReaderActionButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: string }>(
    function ReaderActionButton({ tooltip, children, ...props }, ref) {
        return <Tooltip content={tooltip}><button type="button" aria-label={tooltip} {...props} ref={ref}>{children}</button></Tooltip>;
    },
);
