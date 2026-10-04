import { useEffect, useState } from 'react';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AppBarLogo } from './appbar-logo';
import { LogoutButton } from './logout-button';
import { Sparkles, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { settingsPageRoute, tasksPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { Observer, observer } from 'mobx-react-lite';
import { Button } from '@modules/core/ui/primitives/button';
import { MotivationReelsDialog } from '../motivation-reels';
import { canShowMotivations, useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';

export const AppBar = observer(function AppBar() {
    const authStore = useAuthStore();
    const motivationPreferences = useMotivationPreferences();
    const [reelsOpen, setReelsOpen] = useState(false);
    const motivationsAvailable = canShowMotivations(authStore.isAuthenticated, motivationPreferences.motivationsEnabled);

    useEffect(() => {
        if (!motivationsAvailable) setReelsOpen(false);
    }, [motivationsAvailable]);

    return (
        <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-2.5 sm:px-6">
            <AppBarLogo />
            <div className="flex items-center gap-3">
                <Link to={tasksPageRoute}>
                    <Button 
                        variant="outlined" 
                        size="sm" 
                        tooltip="Tasks & Time Tracker"
                        className="flex items-center gap-1.5 px-2.5 text-xs text-foreground/90 border-[var(--color-border-default)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]/50"
                    >
                        <ListTodo size={14} className="text-[var(--color-brand)] shrink-0" />
                        <span className="hidden sm:inline font-medium">Tasks</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wider">Beta</span>
                    </Button>
                </Link>
                {motivationsAvailable && <Button
                    variant="outlined" 
                    size="sm" 
                    onClick={() => setReelsOpen(true)} 
                    tooltip="Feeling bored? Swipe inspirations"
                    className="flex items-center gap-1.5 px-2.5 text-xs text-[var(--color-brand)] border-[var(--color-brand)]/40 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]/50"
                >
                    <Sparkles size={14} className="text-[var(--color-brand)] animate-pulse shrink-0" />
                    <span className="hidden sm:inline font-medium">Bored?</span>
                </Button>}
                <Observer>
                    {() => {
                        if (!authStore.isAuthenticated) return null;
                        const accountLabel = authStore.currentUser.label || 'User';
                        const firstChar = accountLabel.charAt(0).toUpperCase();
                        return (
                            <Link
                                to={settingsPageRoute}
                                title={`Logged in as ${accountLabel} — Open Settings`}
                                aria-label={`Logged in as ${accountLabel} — Open Settings`}
                                className="group flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brand)]"
                            >
                                <div aria-hidden="true" className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-[var(--color-brand)] text-[var(--color-text-on-brand)] font-semibold text-xs shadow-xs transition-all ring-2 ring-[var(--color-border-subtle)] group-hover:ring-[var(--color-brand)] select-none">
                                    {firstChar}
                                </div>
                                <span className="hidden max-w-40 truncate text-xs font-medium sm:block">{accountLabel}</span>
                            </Link>
                        );
                    }}
                </Observer>
                <ThemeSelector className="h-8 py-0 text-xs" />
                <LogoutButton />
            </div>
            {motivationsAvailable && <MotivationReelsDialog open={reelsOpen} onOpenChange={setReelsOpen} />}
        </header>
    );
});
