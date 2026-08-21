import { signInPageRoute } from '@boot/routes';
import { Observer } from 'mobx-react-lite';
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

export function AuthGuard({ children }: { children: ReactNode }) {
    const store = useAuthStore();
    return (
        <Observer>
            {() => {
                if (store.isInitializing) {
                    return <div className="grid min-h-screen place-items-center bg-[var(--color-surface-canvas)] text-sm text-[var(--color-text-muted)]">Restoring your session…</div>;
                }
                if (!store.isAuthenticated) {
                    return <Navigate to={signInPageRoute} replace />;
                }
                return <>{children}</>;
            }}
        </Observer>
    );
}
