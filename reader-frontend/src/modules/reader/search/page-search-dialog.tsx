import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, X } from 'lucide-react';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { usePageSearch } from './use-page-search';

export function SearchDialog({ onClose, onNavigate }: { onClose: () => void; onNavigate?: (path: string) => void }) {
    const navigate = useNavigate();
    const titleId = useId(), listId = useId(), hintId = useId();
    const input = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const { data, error, loading, retry } = usePageSearch(query);
    const items = data?.items ?? [];
    const active = Math.min(selected, Math.max(0, items.length - 1));
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => input.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, []);
    useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, data, listId]);
    const choose = (id: string) => { onClose(); (onNavigate ?? navigate)(readerPageWithIdRouteValue(id)); };
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }} labelledBy={titleId} describedBy={hintId} className="reader-search-dialog">
        <div className="reader-search-heading"><h2 id={titleId}>Find a page</h2><Button variant="ghost" size="sm" iconOnly aria-label="Close search" onClick={onClose}><X size={16} aria-hidden="true" /></Button></div>
        <div className="reader-search-input"><Search size={16} aria-hidden="true" /><input ref={input} autoFocus value={query} maxLength={200} placeholder="Search titles and categories…" aria-label="Search pages" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-describedby={hintId} aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            onChange={event => { setQuery(event.target.value); setSelected(0); }}
            onKeyDown={event => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (items.length) setSelected((active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
                } else if (event.key === 'Enter' && items[active]) { event.preventDefault(); choose(items[active].id); }
            }} /></div>
        <p className="reader-search-caption">{query.trim() ? 'Matching pages' : 'Recently updated'}</p>
        <div id={listId} role="listbox" aria-label="Pages" aria-busy={loading} className="reader-search-results">
            {items.map((item, index) => {
                const path = `${item.pathIncomplete ? '… › ' : ''}${item.ancestors.map(parent => parent.title).join(' › ')}`;
                return <button key={item.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === active} tabIndex={-1} className="reader-search-result" onMouseDown={event => event.preventDefault()} onMouseEnter={() => setSelected(index)} onClick={() => choose(item.id)}>
                    <FileText size={16} aria-hidden="true" /><span><strong>{item.title}</strong>{path && <small title={path}>{path}</small>}{item.category && <small>{item.category}</small>}</span>
                </button>;
            })}
        </div>
        <div className="reader-search-status" role="status" aria-live="polite">{loading ? 'Searching…' : error ? <>{error} <Button variant="ghost" size="sm" onClick={retry}>Retry</Button></> : !items.length ? 'No pages found.' : data?.hasMore ? 'More pages match. Narrow your search.' : `${items.length} ${items.length === 1 ? 'page' : 'pages'}`}</div>
        <p id={hintId} className="reader-search-hint">↑ ↓ to select · Enter to open · Esc to close</p>
    </Dialog>;
}
