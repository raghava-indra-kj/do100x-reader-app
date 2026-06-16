import { pagesPageWithIdRouteValue, homePageRoute } from '@boot/routes';
import { AppBarLogo } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { Select } from '@modules/core/ui/primitives/select';
import { Minus, Plus, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState } from 'react';
import { usePageStore } from '../store';
import { PageHeadingLevel } from '../theme/page-heading-level';
import type { Section } from '@domain/page/models/section';
import { PageSettingsDialog } from './settings';

function collectLevels(sections: Section[]): Set<number> {
    const levels = new Set<number>();
    function walk(items: Section[]) {
        for (const s of items) {
            levels.add(s.level);
            walk(s.children);
        }
    }
    walk(sections);
    return levels;
}

export function PageAppbar() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);

    useHotkeys('-', () => uiSettings.decreaseFontSize(), { useKey: true, preventDefault: true });
    useHotkeys('+', () => uiSettings.increaseFontSize(), { useKey: true, splitKey: '|', preventDefault: true });

    return (
        <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
                <Observer>
                    {() => (
                        <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() => uiSettings.setTocPanelOpen(!uiSettings.tocPanelOpen)}
                            tooltip={uiSettings.tocPanelOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            {uiSettings.tocPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </Button>
                    )}
                </Observer>
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
            </div>
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
                <Observer>
                    {() => {
                        const page = store.optCurrentPage;
                        const availableLevels = page
                            ? collectLevels(page.sections)
                            : new Set<number>();
                        const availableHeadings = PageHeadingLevel.VALUES.filter(
                            (h) => h.value !== null && availableLevels.has(h.value),
                        );
                        const currentId = uiSettings.headingLevel.id;
                        const isCurrentAvailable = availableHeadings.some((h) => h.id === currentId);
                        if (!isCurrentAvailable && availableHeadings.length > 0) {
                            uiSettings.setHeadingLevel(availableHeadings[0]);
                        }
                        const headingLevelItems = Object.fromEntries(
                            availableHeadings.map((h) => [h.id, h.label]),
                        );
                        if (Object.keys(headingLevelItems).length === 0) return null;
                        return (
                            <Select
                                value={uiSettings.headingLevel.id}
                                onValueChange={(id) => {
                                    const level = PageHeadingLevel.VALUES.find(h => h.id === id);
                                    if (level) uiSettings.setHeadingLevel(level);
                                }}
                                items={headingLevelItems}
                                placeholder="Heading"
                                className="h-8 py-0 text-xs"
                                tooltip="Heading level"
                            />
                        );
                    }}
                </Observer>
                <Button variant="outlined" size="sm" iconOnly onClick={() => setSettingsOpen(true)} tooltip="Settings">
                    <Settings size={16} />
                </Button>
                <PageSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
            </div>
        </header>
    );
}