import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Page } from '@domain/page/models/page';
import { BasePopover } from '@modules/core/ui/primitives/popover';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { PageTree } from './page-tree';

export function PageBreadcrumbs({ page, compact = false }: { page: Page; compact?: boolean }) {
    const [open, setOpen] = useState(false);
    return <nav className="reader-bar-trail" data-compact={compact || undefined} aria-label="Page location">
        <BasePopover.Root open={open} onOpenChange={setOpen}>
            <Tooltip content="Show page path"><BasePopover.Trigger className="reader-path-trigger" aria-label={`Show page path for ${page.title}`}>
                <span className="reader-trail-current">{page.title}</span>
                <ChevronDown size={13} aria-hidden="true" />
            </BasePopover.Trigger></Tooltip>
            <BasePopover.Portal>
                <BasePopover.Positioner align="start" sideOffset={6} className="z-50">
                    <BasePopover.Popup className="reader-path-popup" aria-label="Page path">
                        {open && <PageTree page={page} onNavigate={() => setOpen(false)} />}
                    </BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    </nav>;
}
