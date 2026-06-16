import { pagesPageWithIdRouteValue, signupPageRoute } from '@boot/routes';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { FormError } from '@modules/core/ui/primitives/form-error';
import { Input } from '@modules/core/ui/primitives/input';
import { Observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../provider/store';
import { LoginStore } from './store';

export default function LoginPage() {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const loginStore = useMemo(() => new LoginStore({ navigate, authStore }), [authStore]);

    if (authStore.isAuthenticated) {
        const currentUser = authStore.currentUser;
        const redirectUrl = pagesPageWithIdRouteValue(currentUser.homepageId);
        return <Navigate to={redirectUrl} replace />;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await loginStore.submit();
    };

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <AppBar />
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full flex flex-col p-4">
                    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto my-auto space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-6">
                    <h1 className="text-lg font-semibold text-[var(--color-text-strong)]">Login</h1>
                    <Observer>
                        {() => (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-text-body)]">Username</label>
                                <Input value={loginStore.username} onValueChange={(v) => loginStore.setUsername(v)} placeholder="Enter username" />
                            </div>
                        )}
                    </Observer>
                    <Observer>
                        {() => (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--color-text-body)]">Password</label>
                                <Input type="password" value={loginStore.password} onValueChange={(v) => loginStore.setPassword(v)} placeholder="Enter password" />
                            </div>
                        )}
                    </Observer>
                    <Observer>
                        {() => (
                            <>
                                {loginStore.error && <FormError message={loginStore.error} />}
                                <Button type="submit" className="w-full" disabled={!loginStore.isSubmittable || loginStore.submitting}>
                                    {loginStore.submitting ? 'Logging in...' : 'Login'}
                                </Button>
                            </>
                        )}
                    </Observer>
                        <p className="text-center text-sm text-[var(--color-text-subtle)]">
                            Don't have an account?{' '}
                            <Link to={signupPageRoute} className="text-[var(--color-text-body)] underline">
                                Sign Up
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
