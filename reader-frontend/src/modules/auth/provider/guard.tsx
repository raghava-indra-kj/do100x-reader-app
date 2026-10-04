import { loginPageRoute } from '@boot/routes';
import { Observer } from 'mobx-react-lite';
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store';
import { Button } from '@modules/core/ui/primitives/button';

export function AuthGuard({ children }: { children: ReactNode }) {
    const store = useAuthStore();
    const location = useLocation();
    return <Observer>{() => {
        if (store.status === 'loading') return <p role="status" className="p-6 text-[var(--color-text-muted)]">Checking your session…</p>;
        if (store.status === 'error') return <div className="p-6 space-y-3"><p role="alert">{store.error}</p><Button onClick={() => void store.bootstrap()}>Retry</Button></div>;
        if (!store.isAuthenticated) return <Navigate to={loginPageRoute} state={{ returnTo: location.pathname + location.search + location.hash }} replace />;
        return <>{children}</>;
    }}</Observer>;
}
