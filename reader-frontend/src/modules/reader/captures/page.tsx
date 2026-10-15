import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Clock3, FolderPlus, Inbox, RefreshCw, Search, Trash2 } from 'lucide-react';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { useAuthStore } from '@modules/auth/provider/store';
import { getApiErrorMessage } from '@core/api/api-client';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { discardCapture, loadCaptures, type CaptureItem } from './api';
import { captureExpiry, captureList, captureSourceLabel } from './list-model';
import { KeepCaptureDialog } from './keep-dialog';
import './captures.css';

export function CapturesWorkspace() {
    const navigate = useNavigate();
    const [items, setItems] = useState<CaptureItem[]>([]);
    const [query, setQuery] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [discardError, setDiscardError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [clock, setClock] = useState(Date.now);
    const [keeping, setKeeping] = useState<string | null>(null);
    const [discarding, setDiscarding] = useState<CaptureItem | null>(null);
    const [busy, setBusy] = useState(false);
    const loadSequence = useRef(0), lifetime = useRef(0), mounted = useRef(false), mutation = useRef(false);
    const searchRef = useRef<HTMLInputElement>(null), captureLinks = useRef(new Map<string, HTMLAnchorElement>());
    const afterDiscardFocus = useRef<{ generation: number; nextId: string | null } | null>(null);
    const discardTitle = useId(), discardDescription = useId();
    const load = useCallback(async () => {
        if (!mounted.current) return;
        const sequence = ++loadSequence.current, generation = lifetime.current;
        const current = () => mounted.current && generation === lifetime.current && sequence === loadSequence.current;
        setClock(Date.now()); setLoading(true); setLoadError(null);
        try { const response = await loadCaptures(); if (current()) setItems(response.items); }
        catch (cause) { if (current()) setLoadError(getApiErrorMessage(cause, 'Couldn’t load temporary captures.')); }
        finally { if (current()) setLoading(false); }
    }, []);
    useEffect(() => {
        mounted.current = true; lifetime.current++;
        void load();
        const refresh = () => void load();
        window.addEventListener('focus', refresh);
        const timer = setInterval(refresh, 60_000);
        return () => { mounted.current = false; lifetime.current++; loadSequence.current++; window.removeEventListener('focus', refresh); clearInterval(timer); };
    }, [load]);
    useEffect(() => {
        if (discarding || !afterDiscardFocus.current) return;
        const target = afterDiscardFocus.current;
        afterDiscardFocus.current = null;
        // The removed row cannot receive the dialog's usual return focus. Wait
        // until that restoration finishes, then focus a surviving reader link.
        const frame = requestAnimationFrame(() => {
            if (!mounted.current || target.generation !== lifetime.current) return;
            const next = target.nextId ? captureLinks.current.get(target.nextId) : null;
            (next?.isConnected ? next : searchRef.current)?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [discarding]);
    const closeDiscard = () => { if (!mutation.current) { setDiscarding(null); setDiscardError(null); } };
    const discard = async () => {
        if (!discarding || mutation.current || !mounted.current) return;
        const id = discarding.id, generation = lifetime.current;
        const current = () => mounted.current && generation === lifetime.current;
        mutation.current = true;
        setBusy(true); setDiscardError(null);
        try {
            await discardCapture(id);
            if (!current()) return;
            loadSequence.current++;
            const index = visible.findIndex(item => item.id === id);
            const remaining = visible.filter(item => item.id !== id);
            afterDiscardFocus.current = { generation, nextId: remaining[Math.min(Math.max(0, index), remaining.length - 1)]?.id ?? null };
            setItems(previous => previous.filter(item => item.id !== id));
            setDiscarding(null);
            void load();
        }
        catch (cause) { if (current()) setDiscardError(getApiErrorMessage(cause, 'Couldn’t discard this capture. Please try again.')); }
        finally { if (current()) { mutation.current = false; setBusy(false); } }
    };
    const { active, visible, empty } = captureList(items, query, clock);
    return <div className="capture-page"><AppBarLayout app="reader" breadcrumbs="Temporary inbox" />
        <main className="capture-content capture-inbox">
            <header className="capture-heading">
                <h1>Temporary inbox</h1>
                <div className="capture-actions"><Link to="/reader">My pages</Link><Button variant="ghost" size="sm" iconOnly tooltip="Refresh captures" aria-label="Refresh captures" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /></Button></div>
                <p>Keep what matters. Captures expire after 7 days, including their notes and quizzes.</p>
            </header>
            <div className="capture-toolbar"><label className="capture-search"><Search size={16} aria-hidden="true" /><Input ref={searchRef} aria-label="Search temporary captures" size="sm" placeholder="Search captures or websites…" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="capture-list-summary">{query.trim() ? `${visible.length} of ${active.length}` : active.length} {active.length === 1 ? 'capture' : 'captures'}<span aria-hidden="true"> · </span>Expiring first</span></div>
            {loadError && <p className="capture-error" role="alert">{loadError}</p>}
            {loading && <p className="capture-loading" role="status">{items.length ? 'Refreshing captures…' : 'Loading captures…'}</p>}
            {visible.length > 0 && <ul className="capture-list" aria-label="Temporary captures">
                {visible.map(item => {
                    const expiry = captureExpiry(item.captureExpiresAt, clock);
                    return <li key={item.id}><article className="capture-card">
                        <div className="capture-card-content"><h2><Link ref={node => { if (node) captureLinks.current.set(item.id, node); else captureLinks.current.delete(item.id); }} to={readerPageWithIdRouteValue(item.id)}>{item.title}</Link></h2>
                            <div className="capture-meta"><span className="capture-source">{captureSourceLabel(item.captureSourceUrl)}</span><span className={`capture-expiry capture-expiry-${expiry.urgency}`}><Clock3 size={12} aria-hidden="true" /><Tooltip content={`Expires ${expiry.exact}`}><time tabIndex={0} dateTime={item.captureExpiresAt.toISOString()} aria-label={`Expires ${expiry.exact}`}>{expiry.label}</time></Tooltip></span></div>
                        </div>
                        <div className="capture-actions capture-row-actions"><Button variant="outlined" size="sm" startIcon={<FolderPlus size={14} />} aria-label={`Keep ${item.title}`} onClick={() => setKeeping(item.id)}>Keep</Button><Button variant="ghost" size="sm" startIcon={<Trash2 size={14} />} aria-label={`Discard ${item.title}`} onClick={() => { if (!mutation.current) { setDiscardError(null); setDiscarding(item); } }}>Discard</Button></div>
                    </article></li>;
                })}
            </ul>}
            {!loading && !loadError && !visible.length && <div className="capture-empty"><Inbox size={24} aria-hidden="true" />
                <h2>{empty === 'search' ? 'No matching captures' : empty === 'expired' ? 'No active captures' : 'Your inbox is empty'}</h2>
                <p>{empty === 'search' ? 'Try a different title or source website.' : empty === 'expired' ? 'These captures have expired. New captures will appear here for 7 days.' : 'Use the do100x Chrome extension to send a selection or article here.'}</p>
                {empty === 'search' && <Button size="sm" variant="outlined" onClick={() => setQuery('')}>Clear search</Button>}
            </div>}
        </main>
        {keeping && <KeepCaptureDialog pageId={keeping} open onClose={() => setKeeping(null)} onSaved={id => { if (mounted.current) navigate(readerPageWithIdRouteValue(id)); }} />}
        <Dialog open={Boolean(discarding)} onOpenChange={open => { if (!open) closeDiscard(); }} labelledBy={discardTitle} describedBy={discardDescription} className="capture-discard-dialog">
            <div className="capture-discard-body"><h2 id={discardTitle}>Discard this capture?</h2><p className="capture-discard-name">{discarding?.title}</p><p id={discardDescription}>This capture and its attached notes and quizzes will be removed. Saved pages and your vocabulary library are kept.</p>{discardError && <p className="capture-error" role="alert">{discardError}</p>}</div>
            <div className="capture-discard-actions"><Button variant="outlined" disabled={busy} onClick={closeDiscard}>Cancel</Button><Button disabled={busy} loading={busy} onClick={() => void discard()}>Discard capture</Button></div>
        </Dialog>
    </div>;
}

export default observer(function CapturesPage() {
    const auth = useAuthStore();
    return <CapturesWorkspace key={auth.currentUser.id} />;
});
