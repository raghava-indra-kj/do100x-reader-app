import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Inbox } from 'lucide-react';
import { usePageStore } from '@modules/page/store';
import { Button } from '@modules/core/ui/primitives/button';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { KeepCaptureDialog } from './keep-dialog';
import { captureExpiry, captureSourceHref } from './list-model';
import './captures.css';

export const CaptureBanner = observer(function CaptureBanner() {
    const store = usePageStore();
    const page = store.optCurrentPage;
    const expires = page?.captureExpiresAt?.getTime();
    const [keeping, setKeeping] = useState(false);
    const [clock, setClock] = useState(Date.now);
    useEffect(() => {
        if (!expires) return;
        setClock(Date.now());
        const reload = () => { setClock(Date.now()); if (Date.now() >= expires) void store.loadPage(); };
        const timer = setTimeout(reload, Math.max(0, expires - Date.now()) + 50);
        const clockTimer = setInterval(() => setClock(Date.now()), 60_000);
        window.addEventListener('focus', reload);
        return () => { clearTimeout(timer); clearInterval(clockTimer); window.removeEventListener('focus', reload); };
    }, [expires, store]);
    if (!page?.captureExpiresAt || !store.isOwner) return null;
    const expiry = captureExpiry(page.captureExpiresAt, clock), source = captureSourceHref(page.captureSourceUrl);
    return <aside className="capture-banner" aria-label="Temporary capture">
        <div className="capture-banner-status"><strong>Temporary capture</strong><Tooltip content={`Expires ${expiry.exact}`}><time className={`capture-expiry-${expiry.urgency}`} tabIndex={0} dateTime={page.captureExpiresAt.toISOString()} aria-label={`Expires ${expiry.exact}`}>{expiry.label}</time></Tooltip>
        </div>
        <div className="capture-banner-actions">
            {source && <Tooltip content="Open original source"><a className="capture-banner-link" href={source} target="_blank" rel="noopener noreferrer" aria-label="Open original source"><ExternalLink size={16} /></a></Tooltip>}
            <Tooltip content="Temporary inbox"><Link className="capture-banner-link" to="/reader/captures" aria-label="Temporary inbox"><Inbox size={16} /></Link></Tooltip>
            <Button size="sm" aria-label="Keep in my pages" onClick={() => setKeeping(true)}><span className="capture-keep-wide">Keep in my pages</span><span className="capture-keep-short">Keep</span></Button>
        </div>
        <KeepCaptureDialog pageId={page.id} open={keeping} onClose={() => setKeeping(false)} onSaved={() => { setKeeping(false); void store.loadPage(); }} />
    </aside>;
});
