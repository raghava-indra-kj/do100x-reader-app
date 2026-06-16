import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AppBarLogo } from './appbar-logo';
import { LogoutButton } from './logout-button';

export function AppBar() {
    return (
        <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-2.5 sm:px-6">
            <AppBarLogo />
            <div className="flex items-center gap-3">
                <ThemeSelector className="h-8 py-0 text-xs" />
                <LogoutButton />
            </div>
        </header>
    );
}
