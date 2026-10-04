export interface GoogleIdentityApi {
    initialize(options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; ux_mode: 'popup'; auto_select: false; use_fedcm_for_button: boolean }): void;
    renderButton(element: HTMLElement, options: { type: 'standard'; theme: 'outline' | 'filled_black'; size: 'large'; text: 'signin_with'; shape: 'rectangular'; width: number }): void;
    disableAutoSelect(): void;
}

declare global { interface Window { google?: { accounts: { id: GoogleIdentityApi } }; } }
let loading: Promise<GoogleIdentityApi> | null = null;

export function loadGoogleIdentityServices(): Promise<GoogleIdentityApi> {
    if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
    if (loading) return loading;
    loading = new Promise<GoogleIdentityApi>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        const timeout = window.setTimeout(() => fail(), 15000);
        const fail = () => {
            window.clearTimeout(timeout);
            script.remove();
            loading = null;
            reject(new Error('Google sign-in could not load. Check your connection or browser blockers, then retry.'));
        };
        script.onerror = fail;
        script.onload = () => {
            window.clearTimeout(timeout);
            if (!window.google?.accounts.id) { fail(); return; }
            resolve(window.google.accounts.id);
        };
        document.head.appendChild(script);
    });
    return loading;
}

export function disableGoogleAutoSelect(): void { window.google?.accounts.id.disableAutoSelect(); }
