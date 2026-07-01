import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AppBarLogo } from './appbar-logo';
import { LogoutButton } from './logout-button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { settingsPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { Observer } from 'mobx-react-lite';
import { Button } from '@modules/core/ui/primitives/button';

export function AppBar() {
    const authStore = useAuthStore();

    return (
        <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-2.5 sm:px-6">
            <AppBarLogo />
            <div className="flex items-center gap-3">
                <Observer>
                    {() => authStore.isAuthenticated ? (
                        <Link to={settingsPageRoute}>
                            <Button variant="outlined" size="sm" iconOnly tooltip="Settings">
                                <Settings size={16} />
                            </Button>
                        </Link>
                    ) : null}
                </Observer>
                <ThemeSelector className="h-8 py-0 text-xs" />
                <LogoutButton />
            </div>
        </header>
    );
}
