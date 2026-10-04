import { useEffect, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Popover } from '@modules/core/ui/primitives/popover';

function useViewport(query: string) {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia(query);
        const update = () => setMatches(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [query]);
    return matches;
}

/** Mount each control once, either inline or in the compact overflow panel. */
export function AppBarTools({ label, primary, children }: { label: string; primary?: ReactNode; children: ReactNode }) {
    const wide = useViewport('(min-width: 1100px)');
    const roomForPrimary = useViewport('(min-width: 600px)');
    const [open, setOpen] = useState(false);
    useEffect(() => { setOpen(false); }, [wide, roomForPrimary]);
    return <div className="suite-inline-tools" role="toolbar" aria-label={label}>
        {(wide || roomForPrimary) && primary}
        {wide ? children : <Popover open={open} onOpenChange={setOpen} align="end" content={
            <div className="suite-overflow-tools" role="toolbar" aria-label={label}>
                {!roomForPrimary && primary}
                {children}
            </div>
        }>
            <Button type="button" variant="outlined" size="sm" iconOnly aria-label={`More ${label.toLowerCase()}`} tooltip={label}>
                <MoreHorizontal size={16} aria-hidden="true" />
            </Button>
        </Popover>}
    </div>;
}
