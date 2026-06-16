import { useMemo, type ReactNode } from 'react';
import { AuthContext, AuthStore } from './store';

export function AuthProvider({ children }: { children: ReactNode }) {
    const store = useMemo(() => new AuthStore(), []);
    return (
        <AuthContext.Provider value={store}>
            {children}
        </AuthContext.Provider>
    );
}
