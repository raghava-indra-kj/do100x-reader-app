import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiClient, getApiErrorMessage } from '@core/api/api-client';
import { signInWithGoogle } from '@domain/auth/services/auth-service';
import { useAuthStore } from '../provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { loadGoogleIdentityServices } from './google-client';

const configSchema = z.object({ googleClientId: z.string().min(1) });
const challengeSchema = z.object({ nonce: z.string().min(1) });

export function GoogleSignIn() {
    const auth = useAuthStore();
    const container = useRef<HTMLDivElement>(null);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let disposed = false;
        let submitting = false;
        const element = container.current!;
        const initialize = async () => {
            setStatus('loading');
            setError(null);
            try {
                // Obtain a fresh challenge only after the shared script is ready.
                const google = await loadGoogleIdentityServices();
                if (disposed) return;
                const [config, challenge] = await Promise.all([apiClient.get('/auth/config'), apiClient.get('/auth/challenge')]);
                if (disposed) return;
                const { googleClientId } = configSchema.parse(config.data);
                const { nonce } = challengeSchema.parse(challenge.data);
                google.initialize({
                    client_id: googleClientId, nonce, ux_mode: 'popup', auto_select: false, use_fedcm_for_button: true,
                    callback: async response => {
                        if (disposed || submitting) return;
                        submitting = true;
                        setStatus('submitting');
                        const result = await signInWithGoogle(response.credential, nonce);
                        if (disposed) return;
                        if (result.ok) auth.setCurrentUser(result.data);
                        else { setError(result.error.message); setStatus('error'); }
                    },
                });
                element.replaceChildren();
                google.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: Math.min(320, element.clientWidth || 280) });
                setStatus('ready');
            } catch (cause) {
                if (!disposed) { setError(getApiErrorMessage(cause, cause instanceof Error ? cause.message : 'Google sign-in unavailable')); setStatus('error'); }
            }
        };
        void initialize();
        return () => { disposed = true; element.replaceChildren(); };
    }, [attempt, auth]);

    return <div className="space-y-4">
        <div ref={container} className={status === 'error' || status === 'submitting' ? 'hidden' : 'flex min-h-11 justify-center'} />
        {status === 'loading' && <p role="status" className="text-center text-sm text-[var(--color-text-muted)]">Loading Google sign-in…</p>}
        {status === 'submitting' && <p role="status" className="text-center text-sm text-[var(--color-text-muted)]">Signing you in…</p>}
        {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
        {status === 'error' && <Button variant="outlined" className="w-full" onClick={() => setAttempt(value => value + 1)}>Retry Google sign-in</Button>}
    </div>;
}
