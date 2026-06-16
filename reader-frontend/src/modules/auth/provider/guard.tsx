import { loginPageRoute } from '@boot/routes';
import { Observer } from 'mobx-react-lite';
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './store';

export function AuthGuard({ children }: { children: ReactNode }) {
    const store = useAuthStore();
    return (
        <Observer>
            {() => {
                if (!store.isAuthenticated) {
                    return <Navigate to={loginPageRoute} replace />;
                }
                return <>{children}</>;
            }}
        </Observer>
    );
}