import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../provider/store';
import { GoogleSignIn } from './google-sign-in';
import { safeReturnPath } from './return-path';

export default observer(function LoginPage() {
    const auth = useAuthStore();
    const location = useLocation();
    if (auth.isAuthenticated) return <Navigate to={safeReturnPath(location.state?.returnTo)} replace />;
    return <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
        <AppBar />
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-4">
            <section className="w-full max-w-sm space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-xl font-semibold text-[var(--color-text-strong)]">Welcome to Reader</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Sign in with your Google account to use Reader and Tasks.</p>
                </div>
                {auth.status === 'loading' ? <p role="status" className="text-center text-sm">Checking your session…</p>
                    : auth.status === 'error' ? <div className="space-y-3"><p role="alert">{auth.error}</p><Button onClick={() => void auth.bootstrap()}>Retry</Button></div>
                    : <GoogleSignIn />}
            </section>
        </main>
    </div>;
});
