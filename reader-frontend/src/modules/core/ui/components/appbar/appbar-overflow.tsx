import { useState, type ReactElement, type ReactNode, type Ref } from 'react';
import { Ellipsis } from 'lucide-react';
import { BasePopover } from '@modules/core/ui/primitives/popover';
import { Button } from '@modules/core/ui/primitives/button';
import './appbar-compact.css';

/** Mark one-shot actions with data-appbar-dismiss. Adjustments and nested pickers stay open. */
export function AppBarOverflow({ children, label = 'More options', trigger, triggerRef }: {
    children: ReactNode;
    label?: string;
    trigger?: ReactElement;
    triggerRef?: Ref<HTMLButtonElement>;
}) {
    const [open, setOpen] = useState(false);
    return <BasePopover.Root open={open} onOpenChange={setOpen}>
        <BasePopover.Trigger ref={triggerRef} render={trigger ?? (
            <Button type="button" variant="ghost" size="md" iconOnly aria-label={label} tooltip={label}>
                <Ellipsis size={20} aria-hidden="true" />
            </Button>
        )} />
        <BasePopover.Portal>
            <BasePopover.Positioner sideOffset={6} align="end" className="z-50">
                <BasePopover.Popup aria-label={label} className="suite-appbar-overflow-panel" onClick={event => {
                    const action = event.target instanceof Element && event.target.closest('[data-appbar-dismiss], a[href]');
                    if (action && event.currentTarget.contains(action)) setOpen(false);
                }}>
                    {children}
                </BasePopover.Popup>
            </BasePopover.Positioner>
        </BasePopover.Portal>
    </BasePopover.Root>;
}
