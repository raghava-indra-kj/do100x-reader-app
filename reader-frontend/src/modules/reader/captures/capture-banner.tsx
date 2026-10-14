import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageStore } from '@modules/page/store';
import { Button } from '@modules/core/ui/primitives/button';
import { KeepCaptureDialog } from './keep-dialog';
import './captures.css';

export const CaptureBanner = observer(function CaptureBanner() {
    const store = usePageStore();
    const page = store.optCurrentPage;
    const expires = page?.captureExpiresAt?.getTime();
    const [keeping, setKeeping] = useState(false);
    useEffect(() => {
        if (!expires) return;
        const reload = () => { if (Date.now() >= expires) void store.loadPage(); };
        const timer = setTimeout(reload, Math.max(0, expires - Date.now()) + 50);
        window.addEventListener('focus', reload);
        return () => { clearTimeout(timer); window.removeEventListener('focus', reload); };
    }, [expires, store]);
    if (!page?.captureExpiresAt || !store.isOwner) return null;
    return <aside className="capture-banner" aria-label="Temporary capture">
        <div><strong>Temporary capture</strong><span>Expires {page.captureExpiresAt.toLocaleString()}. Keep it to retain this page, its notes and quizzes.</span>
            {page.captureSourceUrl && <a href={page.captureSourceUrl} target="_blank" rel="noopener noreferrer">Original source</a>}
        </div>
        <div className="capture-actions"><Link to="/reader/captures">Temporary inbox</Link><Button size="sm" onClick={() => setKeeping(true)}>Keep in my pages</Button></div>
        <KeepCaptureDialog pageId={page.id} open={keeping} onClose={() => setKeeping(false)} onSaved={() => { setKeeping(false); void store.loadPage(); }} />
    </aside>;
});
