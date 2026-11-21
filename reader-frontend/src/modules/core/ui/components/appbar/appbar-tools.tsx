import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { AppBarOverflow } from './appbar-overflow';
import { useViewport } from './use-viewport';

/** Mount each control once, either inline or in the compact overflow panel. */
export function AppBarTools({ label, primary, children, inlineFrom = 1100, overflowIcon }: {
    label: string;
    primary?: ReactNode;
    children: ReactNode;
    inlineFrom?: number;
    overflowIcon?: ReactNode;
}) {
    const wide = useViewport(`(min-width: ${inlineFrom}px)`);
    const roomForPrimary = useViewport('(min-width: 600px)');
    const overflowLabel = `More ${label.toLowerCase()}`;
    return <div className="suite-inline-tools" role="toolbar" aria-label={label}>
        {(wide || roomForPrimary) && primary}
        {wide ? children : <AppBarOverflow key={roomForPrimary ? 'secondary' : 'all'} label={overflowLabel} trigger={
            <Button type="button" variant="outlined" size="sm" iconOnly aria-label={overflowLabel} tooltip={label}>
                {overflowIcon ?? <MoreHorizontal size={16} aria-hidden="true" />}
            </Button>
        }>
            <div className="suite-overflow-tools" role="toolbar" aria-label={label}>
                {!roomForPrimary && primary}
                {children}
            </div>
        </AppBarOverflow>}
    </div>;
}
