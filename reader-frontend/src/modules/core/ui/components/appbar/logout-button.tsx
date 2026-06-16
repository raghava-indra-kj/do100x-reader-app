import { loginPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { LogOut } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';

export function LogoutButton() {
    const authStore = useAuthStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleLogout = useCallback(() => {
        authStore.logout();
        navigate(loginPageRoute, { replace: true });
    }, [authStore, navigate]);

    return (
        <Observer>
            {() => authStore.isAuthenticated
                ? <>
                    <Button variant="outlined" size="sm" iconOnly onClick={() => setOpen(true)} tooltip="Logout"><LogOut size={16} /></Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <div className="flex flex-col gap-6">
                            <p className="text-sm text-[var(--color-text-body)]">Are you sure you want to logout?</p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outlined" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button variant="primary" size="sm" onClick={handleLogout}>Logout</Button>
                            </div>
                        </div>
                    </Dialog>
                </>
                : null}
        </Observer>
    );
}
