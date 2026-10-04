import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { apiClient, getApiErrorMessage } from '@core/api/api-client';
import { readerPageWithIdRouteValue } from '@boot/routes';
import { Button } from '@modules/core/ui/primitives/button';
import { AppBar } from '@modules/core/ui/components/appbar';

export default function ReaderHome() {
    const [homePageId, setHomePageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let disposed = false;
        setError(null);
        void apiClient.post('/reader/home').then(response => {
            const data = z.object({ homePageId: z.string().uuid() }).parse(response.data);
            if (!disposed) setHomePageId(data.homePageId);
        }).catch(cause => { if (!disposed) setError(getApiErrorMessage(cause, 'Couldn’t open Reader. Try again.')); });
        return () => { disposed = true; };
    }, [attempt]);
    if (homePageId) return <Navigate to={readerPageWithIdRouteValue(homePageId)} replace />;
    return <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]"><AppBar /><div className="p-6 space-y-3">
        {error ? <><p role="alert">{error}</p><Button onClick={() => setAttempt(value => value + 1)}>Retry</Button></> : <p role="status">Opening Reader…</p>}
    </div></div>;
}
