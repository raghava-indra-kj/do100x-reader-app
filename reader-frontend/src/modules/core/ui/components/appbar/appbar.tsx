import { useState } from 'react';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { AppBarLogo } from './appbar-logo';
import { LogoutButton } from './logout-button';
import { Sparkles, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { settingsPageRoute, tasksPageRoute } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { Observer } from 'mobx-react-lite';
import { Button } from '@modules/core/ui/primitives/button';
import { MotivationReelsDialog } from '../motivation-reels';

export function AppBar() {
    const authStore = useAuthStore();
    const [reelsOpen, setReelsOpen] = useState(false);

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
                <Button 
                    variant="outlined" 
                    size="sm" 
                    onClick={() => setReelsOpen(true)} 
                    tooltip="Feeling bored? Swipe inspirations"
                    className="flex items-center gap-1.5 px-2.5 text-xs text-[var(--color-brand)] border-[var(--color-brand)]/40 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]/50"
                >
                    <Sparkles size={14} className="text-[var(--color-brand)] animate-pulse shrink-0" />
                    <span className="hidden sm:inline font-medium">Bored?</span>
                </Button>
                <Observer>
                    {() => {
                        if (!authStore.isAuthenticated) return null;
                        const displayName = authStore.currentUser.displayName || 'User';
                        const firstChar = displayName.charAt(0).toUpperCase();
                        return (
                            <Link to={settingsPageRoute} title={`Logged in as ${displayName} — Open Settings`}>
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-brand)] text-[var(--color-surface-canvas)] font-semibold text-xs shadow-xs hover:opacity-90 transition-all cursor-pointer ring-2 ring-[var(--color-border-subtle)] hover:ring-[var(--color-brand)] select-none">
                                    {firstChar}
                                </div>
                            </Link>
                        );
                    }}
                </Observer>
                <ThemeSelector className="h-8 py-0 text-xs" />
                <LogoutButton />
            </div>
            <MotivationReelsDialog open={reelsOpen} onOpenChange={setReelsOpen} />
        </header>
    );
}
