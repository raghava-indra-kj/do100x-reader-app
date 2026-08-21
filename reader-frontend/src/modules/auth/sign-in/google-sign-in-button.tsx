import { useEffect, useRef } from 'react';

interface GoogleCredentialResponse {
    credential: string;
}

interface GoogleIdentityApi {
    initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select?: boolean }): void;
    renderButton(parent: HTMLElement, options: {
        theme: 'outline' | 'filled_black' | 'filled_blue';
        size: 'large';
        text: 'continue_with';
        shape: 'rectangular';
        logo_alignment: 'left';
        width: number;
    }): void;
    disableAutoSelect(): void;
}

declare global {
    interface Window {
        google?: { accounts?: { id?: GoogleIdentityApi } };
    }
}

let scriptPromise: Promise<GoogleIdentityApi> | undefined;
let initializedClientId: string | undefined;
let credentialCallback: ((credential: string) => void) | undefined;

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
    const existingApi = window.google?.accounts?.id;
    if (existingApi) return Promise.resolve(existingApi);
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => {
            const api = window.google?.accounts?.id;
            if (api) {
                resolve(api);
            } else {
                reject(new Error('Google Identity Services did not load correctly.'));
            }
        };
        script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
        document.head.appendChild(script);
    });

    return scriptPromise;
}

export function disableGoogleAutoSelect(): void {
    window.google?.accounts?.id?.disableAutoSelect();
}

interface GoogleSignInButtonProps {
    clientId: string;
    disabled?: boolean;
    onCredential: (credential: string) => void;
    onError: (message: string) => void;
}

/** Renders Google's required, user-gesture initiated button through GIS. */
export function GoogleSignInButton({ clientId, disabled = false, onCredential, onError }: GoogleSignInButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        void loadGoogleIdentity()
            .then((api) => {
                if (cancelled || !containerRef.current) return;
                credentialCallback = onCredential;

                if (initializedClientId && initializedClientId !== clientId) {
                    throw new Error('Google Sign-In was initialized with a different client ID. Reload the page after changing configuration.');
                }
                if (!initializedClientId) {
                    api.initialize({
                        client_id: clientId,
                        auto_select: false,
                        callback: (response) => credentialCallback?.(response.credential),
                    });
                    initializedClientId = clientId;
                }

                containerRef.current.replaceChildren();
                api.renderButton(containerRef.current, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: 320,
                });
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    onError(error instanceof Error ? error.message : 'Google Sign-In could not be initialized.');
                }
            });

        return () => {
            cancelled = true;
            credentialCallback = undefined;
            containerRef.current?.replaceChildren();
        };
    }, [clientId, onCredential, onError]);

    return (
        <div className={disabled ? 'pointer-events-none opacity-60' : undefined} aria-busy={disabled}>
            <div ref={containerRef} className="flex min-h-11 justify-center" />
        </div>
    );
}
