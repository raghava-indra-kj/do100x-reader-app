import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuthStore } from '@modules/auth/provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { SearchDialog } from './page-search-dialog';
import './page-search.css';

/** Keep search and its shortcut mounted when a responsive toolbar moves the trigger into a menu. */
export function useReaderPageSearchControl(enabled: boolean, onNavigate?: (path: string) => void) {
    const auth = useAuthStore();
    const { pathname } = useLocation();
    const available = enabled && auth.isAuthenticated;
    const scope = available ? `${auth.currentUser.id}:${pathname}` : null;
    const [openScope, setOpenScope] = useState<string | null>(null);
    const returnFocus = useRef<{ opener?: HTMLElement | null; fallback?: HTMLElement | null }>({});
    const openSearch = useCallback((opener?: HTMLElement | null, fallback?: HTMLElement | null) => {
        if (!scope) return;
        returnFocus.current = { opener: opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null), fallback };
        setOpenScope(scope);
    }, [scope]);
    const close = () => {
        setOpenScope(null);
        const { opener, fallback } = returnFocus.current;
        requestAnimationFrame(() => (opener?.isConnected ? opener : fallback)?.focus());
    };
    if (openScope !== null && openScope !== scope) setOpenScope(null);
    useEffect(() => {
        if (!available) return;
        const shortcut = (event: KeyboardEvent) => {
            if (event.isComposing || event.repeat || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
            if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
            if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
            event.preventDefault();
            openSearch();
        };
        window.addEventListener('keydown', shortcut);
        return () => window.removeEventListener('keydown', shortcut);
    }, [available, openSearch]);
    const dialog = scope && openScope === scope ? <SearchDialog onClose={close} onNavigate={onNavigate} /> : null;
    return { available, openSearch, dialog };
}

export const ReaderPageSearch = observer(function ReaderPageSearch({ enabled = true, onNavigate }: { enabled?: boolean; onNavigate?: (path: string) => void }) {
    const { available, openSearch, dialog } = useReaderPageSearchControl(enabled, onNavigate);
    if (!available) return null;
    return <><Button className="reader-search-trigger" variant="outlined" size="sm" iconOnly aria-label="Find a page" aria-keyshortcuts="Control+k Meta+k" tooltip="Find a page (Ctrl+K / ⌘K)" onClick={event => openSearch(event.currentTarget)}><Search size={16} aria-hidden="true" /></Button>{dialog}</>;
});
