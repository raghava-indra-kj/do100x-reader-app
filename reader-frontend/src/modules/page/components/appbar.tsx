import { pagesPageWithIdRouteValue, homePageRoute } from '@boot/routes';
import { AppBarLogo, LogoutButton } from '@modules/core/ui/components/appbar';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { Button } from '@modules/core/ui/primitives/button';
import { Minus, Plus } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePageStore } from '../store';

export function PageAppbar() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;
    const navigate = useNavigate();

    useHotkeys('-', () => uiSettings.decreaseFontSize(), { useKey: true, preventDefault: true });
    useHotkeys('+', () => uiSettings.increaseFontSize(), { useKey: true, splitKey: '|', preventDefault: true });

    return (
        <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-2.5 sm:px-6">
            <Observer>
                {() => {
                    const page = store.optCurrentPage;
                    if (page) {
                        return (
                            <div
                                className="flex cursor-pointer items-center gap-2.5 min-w-0"
                                onClick={() => page.parentPageId ? navigate(pagesPageWithIdRouteValue(page.parentPageId)) : navigate(homePageRoute)}
                            >
                                <img src="/logo.png" alt="" className="h-6 w-6 shrink-0" />
                                <span className="truncate font-[family-name:var(--font-serif)] text-base font-semibold text-[var(--color-text-strong)]">{page.title}</span>
                            </div>
                        );
                    }
                    return <AppBarLogo />;
                }}
            </Observer>
            <div className="flex items-center gap-3">
                <Observer>
                    {() => (
                        <>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => uiSettings.decreaseFontSize()} disabled={!uiSettings.isFontSizeDecreasable} tooltip="Decrease font size">
                                <Minus size={16} />
                            </Button>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => uiSettings.increaseFontSize()} disabled={!uiSettings.isFontSizeIncreasable} tooltip="Increase font size">
                                <Plus size={16} />
                            </Button>
                        </>
                    )}
                </Observer>
                <ThemeSelector className="h-8 py-0 text-xs" />
                <LogoutButton />
            </div>
        </header>
    );
}