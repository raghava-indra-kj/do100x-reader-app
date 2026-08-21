import { useEffect, useMemo, type ReactNode } from 'react';
import { AuthContext, AuthStore } from './store';

export function AuthProvider({ children }: { children: ReactNode }) {
    const store = useMemo(() => new AuthStore(), []);
    useEffect(() => {
        void store.initialize();
    }, [store]);
    return (
        <AuthContext.Provider value={store}>
            {children}
        </AuthContext.Provider>
    );
}
