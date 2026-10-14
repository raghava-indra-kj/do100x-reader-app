import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { Button } from '@modules/core/ui/primitives/button';
import { getApiErrorMessage } from '@core/api/api-client';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { capturePayloadSchema, saveCapture } from './api';
import './captures.css';

function acknowledgeCapture(captureKey: string) {
    return new Promise<void>(resolve => {
        const finish = () => { clearTimeout(timer); window.removeEventListener('message', receive); resolve(); };
        const receive = (event: MessageEvent) => {
            if (event.source === window && event.origin === window.location.origin && event.data?.type === 'do100x.capture.acknowledged' && event.data?.captureKey === captureKey) finish();
        };
        const timer = setTimeout(finish, 1500);
        window.addEventListener('message', receive);
        window.postMessage({ type: 'do100x.capture.saved', captureKey }, window.location.origin);
    });
}

export default function CaptureImportPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const key = new URLSearchParams(window.location.hash.slice(1)).get('capture');
        if (!key || !/^[0-9a-f-]{36}$/i.test(key)) { setError('Open this screen using the do100x extension.'); return; }
        let disposed = false;
        let saving = false;
        setError(null);
        const receive = async (event: MessageEvent) => {
            if (event.source !== window || event.origin !== window.location.origin || event.data?.type !== 'do100x.capture.payload' || event.data?.captureKey !== key || saving) return;
            const parsed = capturePayloadSchema.safeParse(event.data.payload);
            if (!parsed.success || parsed.data.captureKey !== key) { setError('The extension sent an invalid capture. Please capture the selection again.'); return; }
            saving = true;
            clearInterval(retry); clearTimeout(timeout);
            try {
                const saved = await saveCapture(parsed.data);
                if (disposed) return;
                await acknowledgeCapture(key);
                if (disposed) return;
                navigate(readerPageWithIdRouteValue(saved.id), { replace: true });
            } catch (cause) { if (!disposed) setError(getApiErrorMessage(cause, 'Couldn’t save the capture. Your extension keeps the pending capture for 30 minutes while Chrome stays open.')); }
        };
        const request = () => window.postMessage({ type: 'do100x.capture.request', captureKey: key }, window.location.origin);
        window.addEventListener('message', receive);
        const retry = setInterval(request, 500);
        const timeout = setTimeout(() => { clearInterval(retry); if (!disposed && !saving) setError('The capture is unavailable. Enable the extension or capture the page again.'); }, 15_000);
        request();
        return () => { disposed = true; clearInterval(retry); clearTimeout(timeout); window.removeEventListener('message', receive); };
    }, [attempt, navigate]);
    return <div className="capture-page"><AppBarLayout app="reader" /><main className="capture-content"><header className="capture-heading"><div><h1>Opening your capture</h1><p>The page will be private and expire in 7 days unless you keep it.</p></div></header>{error ? <><p role="alert">{error}</p><div className="capture-actions"><Button onClick={() => setAttempt(value => value + 1)}>Try again</Button><Link to="/reader/captures">Open temporary inbox</Link></div></> : <p role="status">Receiving content from the extension…</p>}</main></div>;
}
