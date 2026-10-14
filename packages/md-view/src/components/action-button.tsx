import { Tooltip } from '@base-ui/react/tooltip';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

/** Shared, keyboard-accessible hints for code and diagram controls. */
export const MarkdownActionButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: string }>(
  function MarkdownActionButton({ tooltip, children, ...props }, ref) {
    return <Tooltip.Root>
      <Tooltip.Trigger render={<button type="button" aria-label={tooltip} {...props} ref={ref}>{children}</button>} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={6} style={{ zIndex: 100010 }}>
          <Tooltip.Popup className="md-action-tooltip">{tooltip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>;
  },
);
