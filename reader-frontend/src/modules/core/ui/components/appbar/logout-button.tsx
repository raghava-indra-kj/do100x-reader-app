import { loginPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { LogOut } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { disableGoogleAutoSelect } from '@modules/auth/login/google-client';

export function LogoutButton({ showLabel = false }: { showLabel?: boolean }) {
    const authStore = useAuthStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const [pending, setPending] = useState(false);
    const handleLogout = useCallback(async () => {
        setPending(true);
        const success = await authStore.logout();
        setPending(false);
        if (!success) return;
        disableGoogleAutoSelect();
        navigate(loginPageRoute, { replace: true });
    }, [authStore, navigate]);

    return (
        <Observer>
            {() => authStore.isAuthenticated
                ? <>
                    <Button variant="outlined" size="sm" iconOnly={!showLabel} aria-label="Sign out" onClick={() => setOpen(true)} tooltip="Sign out"><LogOut size={16} aria-hidden="true" />{showLabel && <span>Sign out</span>}</Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2 text-sm text-[var(--color-text-body)]">
                                <p className="break-words">Signed in as <span className="font-semibold text-[var(--color-text-strong)]">{authStore.currentUser.label}</span></p>
                                <p>Sign out of do100x?</p>
                                {authStore.error && <p role="alert">{authStore.error}</p>}
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outlined" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button variant="primary" size="sm" disabled={pending} onClick={() => void handleLogout()}>Sign out</Button>
                            </div>
                        </div>
                    </Dialog>
                </>
                : null}
        </Observer>
    );
}
