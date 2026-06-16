import { loginPageRoute, pagesPageWithIdRouteValue } from '@boot/routes';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { FormError } from '@modules/core/ui/primitives/form-error';
import { Input } from '@modules/core/ui/primitives/input';
import { Observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../provider/store';
import { SignupStore } from './store';

export default function SignupPage() {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const signupStore = useMemo(() => new SignupStore({ navigate, authStore }), [authStore]);

    if (authStore.isAuthenticated) {
        return <Navigate to={pagesPageWithIdRouteValue(authStore.currentUser.homepageId)} replace />;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await signupStore.submit();
    };

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <AppBar />
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full flex flex-col p-4">
                    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto my-auto space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-6">
                        <h1 className="text-lg font-semibold text-[var(--color-text-strong)]">Sign Up</h1>
                        <Observer>
                            {() => (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--color-text-body)]">Username</label>
                                    <Input value={signupStore.username} onValueChange={(v) => signupStore.setUsername(v)} placeholder="Enter username" />
                                </div>
                            )}
                        </Observer>
                        <Observer>
                            {() => (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--color-text-body)]">Password</label>
                                    <Input type="password" value={signupStore.password} onValueChange={(v) => signupStore.setPassword(v)} placeholder="Enter password" />
                                </div>
                            )}
                        </Observer>
                        <Observer>
                            {() => (
                                <>
                                    {signupStore.error && <FormError message={signupStore.error} />}
                                    <Button type="submit" className="w-full" disabled={!signupStore.isSubmittable || signupStore.submitting}>
                                        {signupStore.submitting ? 'Creating account...' : 'Sign Up'}
                                    </Button>
                                </>
                            )}
                        </Observer>
                        <p className="text-center text-sm text-[var(--color-text-subtle)]">
                            Already have an account?{' '}
                            <Link to={loginPageRoute} className="text-[var(--color-text-body)] underline">
                                Login
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
