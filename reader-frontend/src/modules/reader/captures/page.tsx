import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { Button } from '@modules/core/ui/primitives/button';
import { Input } from '@modules/core/ui/primitives/input';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { getApiErrorMessage } from '@core/api/api-client';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { discardCapture, loadCaptures, type CaptureItem } from './api';
import { KeepCaptureDialog } from './keep-dialog';
import './captures.css';

export default function CapturesPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<CaptureItem[]>([]);
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [keeping, setKeeping] = useState<string | null>(null);
    const [discarding, setDiscarding] = useState<CaptureItem | null>(null);
    const [busy, setBusy] = useState(false);
    const loadSequence = useRef(0);
    const load = useCallback(async () => {
        const sequence = ++loadSequence.current;
        setLoading(true); setError(null);
        try { const response = await loadCaptures(); if (sequence === loadSequence.current) setItems(response.items); }
        catch (cause) { if (sequence === loadSequence.current) setError(getApiErrorMessage(cause, 'Couldn’t load temporary captures.')); }
        finally { if (sequence === loadSequence.current) setLoading(false); }
    }, []);
    useEffect(() => {
        void load();
        const refresh = () => void load();
        window.addEventListener('focus', refresh);
        const timer = setInterval(refresh, 60_000);
        return () => { loadSequence.current++; window.removeEventListener('focus', refresh); clearInterval(timer); };
    }, [load]);
    const discard = async () => {
        if (!discarding) return;
        setBusy(true); setError(null);
        try { await discardCapture(discarding.id); setDiscarding(null); await load(); }
        catch (cause) { setError(getApiErrorMessage(cause, 'Couldn’t discard this capture.')); }
        finally { setBusy(false); }
    };
    const visible = items.filter(item => item.captureExpiresAt.getTime() > Date.now() && `${item.title} ${item.captureSourceUrl ?? ''}`.toLowerCase().includes(query.toLowerCase()));
    return <div className="capture-page"><AppBarLayout app="reader" breadcrumbs="Temporary inbox" />
        <main className="capture-content">
            <header className="capture-heading"><div><h1>Temporary inbox</h1><p>Captures expire after 7 days. Keep a page to retain its content, notes and quizzes.</p></div><div className="capture-actions"><Link to="/reader">My pages</Link><Button variant="outlined" onClick={() => void load()} disabled={loading}>Refresh</Button></div></header>
            <Input aria-label="Search temporary captures" placeholder="Search captures or source websites…" value={query} onChange={event => setQuery(event.target.value)} />
            {error && <p role="alert">{error}</p>}
            {loading && <p role="status">Loading captures…</p>}
            <div className="capture-list">
                {visible.map(item => <article className="capture-card" key={item.id}><div><h2><Link to={readerPageWithIdRouteValue(item.id)}>{item.title}</Link></h2>
                    {item.captureSourceUrl && <p>{new URL(item.captureSourceUrl).hostname}</p>}<time dateTime={item.captureExpiresAt.toISOString()}>Expires {item.captureExpiresAt.toLocaleString()}</time></div>
                    <div className="capture-actions"><Button variant="outlined" size="sm" onClick={() => setKeeping(item.id)}>Keep in my pages</Button><Button variant="ghost" size="sm" onClick={() => setDiscarding(item)}>Discard</Button></div>
                </article>)}
                {!loading && !error && !visible.length && <div className="capture-empty"><p>{items.length ? 'No captures match your search.' : 'No temporary captures yet. Use the do100x Chrome extension to read a selection or article here.'}</p></div>}
            </div>
        </main>
        {keeping && <KeepCaptureDialog pageId={keeping} open onClose={() => setKeeping(null)} onSaved={id => navigate(readerPageWithIdRouteValue(id))} />}
        <Dialog open={Boolean(discarding)} onOpenChange={open => { if (!open && !busy) setDiscarding(null); }}><div className="capture-dialog"><h2>Discard this capture?</h2><p>“{discarding?.title}” and its attached notes and quizzes will be removed. Saved pages and your vocabulary library are kept.</p>{error && <p role="alert">{error}</p>}<div className="capture-actions"><Button variant="outlined" disabled={busy} onClick={() => setDiscarding(null)}>Cancel</Button><Button disabled={busy} loading={busy} onClick={() => void discard()}>Discard capture</Button></div></div></Dialog>
    </div>;
}
