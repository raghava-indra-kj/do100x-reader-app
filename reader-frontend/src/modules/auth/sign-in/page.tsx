import { pagesPageWithIdRouteValue } from '@boot/routes';
import { env } from '@core/models/env';
import { FormError } from '@modules/core/ui/primitives/form-error';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import { useAuthStore } from '@modules/auth/provider';
import { observer } from 'mobx-react-lite';
import { BookOpen } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from './google-sign-in-button';

function SignInPage() {
    const authStore = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [signingIn, setSigningIn] = useState(false);
    const googleClientId = env.googleClientId.trim();

    const handleCredential = useCallback(async (idToken: string) => {
        setSigningIn(true);
        setError(null);
        const result = await authStore.signInWithGoogle(idToken);
        setSigningIn(false);

        if (result.ok) {
            navigate(pagesPageWithIdRouteValue(result.data.homepageId), { replace: true });
        } else {
            setError(result.error.message);
        }
    }, [authStore, navigate]);

    const handleGoogleError = useCallback((message: string) => setError(message), []);

    if (authStore.isInitializing) {
        return <div className="grid min-h-screen place-items-center bg-[var(--color-surface-canvas)]"><Loader /></div>;
    }

    if (authStore.isAuthenticated) {
        return <Navigate to={pagesPageWithIdRouteValue(authStore.currentUser.homepageId)} replace />;
    }

    return (
        <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_var(--color-brand-soft),_var(--color-surface-canvas)_42%)] px-4 py-8">
            <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 shadow-sm sm:p-8">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                        <BookOpen size={24} aria-hidden />
                    </div>
                    <h1 className="font-[family-name:var(--font-serif)] text-2xl font-bold tracking-tight text-[var(--color-text-strong)]">Welcome to Reader</h1>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">Sign in securely to keep your reading space in sync.</p>
                </div>

                {googleClientId ? (
                    <GoogleSignInButton
                        clientId={googleClientId}
                        disabled={signingIn}
                        onCredential={handleCredential}
                        onError={handleGoogleError}
                    />
                ) : (
                    <FormError message="Google Sign-In is not configured. Add the web client ID to reader-frontend/public/env.json." />
                )}

                {signingIn && <div className="mt-4 flex justify-center"><Loader /></div>}
                {error && <div className="mt-4"><FormError message={error} /></div>}
                <p className="mt-7 text-center text-xs leading-relaxed text-[var(--color-text-subtle)]">By continuing, you authenticate with your Google account. Reader never stores a Google password.</p>
            </section>
        </main>
    );
}

export default observer(SignInPage);
