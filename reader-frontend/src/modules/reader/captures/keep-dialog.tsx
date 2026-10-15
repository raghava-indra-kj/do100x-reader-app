import { useEffect, useId, useRef, useState } from 'react';
import { Folder, Search, X } from 'lucide-react';
import { searchPages } from '@domain/page/services/pages-service';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { getApiErrorMessage } from '@core/api/api-client';
import { keepCapture } from './api';
import './keep-dialog.css';

type Destination = { id: string | null; title: string; path: string };
type Props = { pageId: string; open: boolean; onClose: () => void; onSaved: (id: string) => void };
const home: Destination = { id: null, title: 'My Reader home', path: 'Home' };

export function KeepCaptureDialog({ open, ...props }: Props) {
    // Closing, changing capture, or an account-keyed parent unmount starts a
    // fresh session. Pending requests cannot update the next dialog.
    return open ? <KeepCaptureSession key={props.pageId} {...props} /> : null;
}

function KeepCaptureSession({ pageId, onClose, onSaved }: Omit<Props, 'open'>) {
    const titleId = useId(), descriptionId = useId(), radioName = useId();
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<Destination[]>([]);
    // Preserve selected identity and display context independently of search.
    const [destination, setDestination] = useState<Destination>(home);
    const [searching, setSearching] = useState(true), [searchError, setSearchError] = useState<string | null>(null), [retry, setRetry] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null), [saving, setSaving] = useState(false);
    const active = useRef(true), saveLock = useRef(false), searchSequence = useRef(0);
    const saveErrorRef = useRef<HTMLParagraphElement>(null);
    useEffect(() => { active.current = true; return () => { active.current = false; searchSequence.current++; }; }, []);
    useEffect(() => { if (saveError) saveErrorRef.current?.focus(); }, [saveError]);
    useEffect(() => {
        const sequence = ++searchSequence.current, controller = new AbortController();
        setSearching(true); setSearchError(null); setItems([]);
        const current = () => active.current && !controller.signal.aborted && sequence === searchSequence.current;
        const timeout = setTimeout(() => {
            void (async () => {
                try {
                    const result = await searchPages({ q: query, limit: 20, signal: controller.signal });
                    if (!current()) return;
                    if (result.ok) {
                        setItems(result.data.items.map(item => ({ id: item.id, title: item.title, path: [...(item.pathIncomplete ? ['…'] : []), ...item.ancestors.map(parent => parent.title)].join(' / ') })));
                        setSearchError(null);
                    } else setSearchError(result.error.message);
                } catch (cause) {
                    if (current()) setSearchError(getApiErrorMessage(cause, 'Couldn’t find destination pages. Try again.'));
                } finally { if (current()) setSearching(false); }
            })();
        }, 200);
        return () => { controller.abort(); clearTimeout(timeout); };
    }, [query, retry]);

    const close = () => {
        if (saveLock.current) return;
        active.current = false; searchSequence.current++; onClose();
    };
    const choose = (item: Destination) => {
        if (saveLock.current) return;
        setDestination(item); setSaveError(null);
    };
    const save = async () => {
        if (!active.current || saveLock.current) return;
        saveLock.current = true; setSaving(true); setSaveError(null);
        const captureId = pageId, destinationId = destination.id;
        try {
            const result = await keepCapture(captureId, destinationId);
            if (active.current) onSaved(result.id);
        } catch (cause) {
            if (active.current) setSaveError(getApiErrorMessage(cause, 'Couldn’t keep this capture. Try again.'));
        } finally {
            if (active.current) { saveLock.current = false; setSaving(false); }
        }
    };
    const destinationRow = (item: Destination) => <label key={item.id ?? 'home'} className={destination.id === item.id ? 'is-selected' : undefined}>
        <input type="radio" name={radioName} checked={destination.id === item.id} disabled={saving} onChange={() => choose(item)} />
        <span>{item.title}{item.id && <small>{item.path || 'Top-level page'}</small>}</span>
    </label>;

    return <Dialog open onOpenChange={value => { if (!value) close(); }} labelledBy={titleId} describedBy={descriptionId} className="capture-keep-dialog">
        <header className="capture-keep-heading"><h2 id={titleId}>Keep in my pages</h2><Button type="button" size="sm" variant="ghost" iconOnly tooltip="Close dialog" aria-label="Close dialog" disabled={saving} onClick={close}><X size={18} /></Button></header>
        <p id={descriptionId} className="capture-keep-intro">Keep this page, its notes and quizzes without expiry.</p>
        <section className="capture-keep-selected" aria-label="Selected destination">
            <Folder size={18} aria-hidden="true" /><div><span>Destination</span><Tooltip content={<span className="capture-keep-full-context">{destination.title}</span>}><strong tabIndex={0}>{destination.title}</strong></Tooltip><Tooltip content={<span className="capture-keep-full-context">{destination.path || 'Top-level page'}</span>}><small tabIndex={0}>{destination.path || 'Top-level page'}</small></Tooltip></div>
        </section>
        <div className="capture-keep-body">
            <div className="capture-keep-search"><Search size={16} aria-hidden="true" /><Input aria-label="Find destination page" placeholder="Search your saved pages…" value={query} disabled={saving} onChange={event => { if (!saveLock.current) setQuery(event.target.value); }} /></div>
            <div className="capture-keep-destinations" role="radiogroup" aria-label="Destination page" aria-busy={searching}>
                {destinationRow(home)}
                {!searching && !searchError && items.map(destinationRow)}
            </div>
            {searching && <p role="status" className="capture-keep-search-status">Finding pages…</p>}
            {searchError && <div className="capture-keep-search-error" role="alert"><p>{searchError}</p><Button type="button" size="sm" variant="outlined" disabled={saving} onClick={() => { if (!saveLock.current) setRetry(value => value + 1); }}>Retry search</Button></div>}
            {!searching && !searchError && !items.length && <p role="status" className="capture-keep-search-status">{query ? 'No saved pages match this search. Your selected destination is unchanged.' : 'No saved pages found. You can keep this page in Reader home.'}</p>}
            {saveError && <p ref={saveErrorRef} tabIndex={-1} role="alert" className="capture-keep-save-error">{saveError}</p>}
        </div>
        <footer className="capture-keep-footer">
            <p className="capture-keep-sharing">Kept pages follow their destination’s sharing settings. Choose a private destination for private content.</p>
            <div className="capture-keep-actions"><Button type="button" variant="outlined" disabled={saving} onClick={close}>Cancel</Button><Button type="button" loading={saving} disabled={saving} onClick={() => void save()}>Keep page</Button></div>
        </footer>
    </Dialog>;
}
