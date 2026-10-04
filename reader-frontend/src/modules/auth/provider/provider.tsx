import { useEffect, useMemo, type ReactNode } from 'react';
import { AuthContext, AuthStore } from './store';

export function AuthProvider({ children }: { children: ReactNode }) {
    const store = useMemo(() => new AuthStore(), []);
    useEffect(() => {
        // Remove previously persisted credentials; they are never read or accepted.
        localStorage.removeItem('current_user');
        const expire = () => store.expireSession();
        const refresh = () => { if (document.visibilityState === 'visible') void store.bootstrap(); };
        window.addEventListener('reader:session-expired', expire);
        document.addEventListener('visibilitychange', refresh);
        void store.bootstrap();
        return () => {
            window.removeEventListener('reader:session-expired', expire);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [store]);
    return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
