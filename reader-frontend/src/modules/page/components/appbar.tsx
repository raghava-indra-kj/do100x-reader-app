import { readerPageWithIdRouteValue } from '@boot/routes';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { AppBarTools } from '@modules/core/ui/components/appbar/appbar-tools';
import { Button } from '@modules/core/ui/primitives/button';
import { Select } from '@modules/core/ui/primitives/select';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { 
    Minus, 
    Plus, 
    ArrowLeft, 
    ChevronLeft, 
    ChevronRight, 
    Settings, 
    Copy, 
    ClipboardList, 
    BookOpen, 
    Sparkles, 
    Share2, 
    Globe 
} from 'lucide-react';
import { Observer, observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useEffect, useState } from 'react';
import { usePageStore } from '../store';
import { isDialogConsuming } from '../clipboard-paste';
import { PageHeadingLevel } from '../theme/page-heading-level';
import type { Section } from '@domain/page/models/section';
import { PageSettingsDialog } from './settings';
import { ShareDialog } from './share-dialog';
import { MotivationReelsDialog } from '@modules/core/ui/components/motivation-reels';
import { useAuthStore } from '@modules/auth/provider/store';
import { canShowMotivations, useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';

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

export const PageAppbar = observer(function PageAppbar() {
    const store = usePageStore();
    const authStore = useAuthStore();
    const motivationPreferences = useMotivationPreferences();
    const uiSettings = store.uiSettingsStore;
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [reelsOpen, setReelsOpen] = useState(false);
    const page = store.optCurrentPage;
    const motivationsAvailable = Boolean(page) && canShowMotivations(
        authStore.isAuthenticated,
        motivationPreferences.motivationsEnabled,
        page?.isPubliclyAccessible,
    );

    useEffect(() => {
        if (!motivationsAvailable) setReelsOpen(false);
    }, [motivationsAvailable]);

    useHotkeys('-', () => uiSettings.decreaseFontSize(), { useKey: true, preventDefault: true });
    useHotkeys('+', () => uiSettings.increaseFontSize(), { useKey: true, splitKey: '|', preventDefault: true });
    useHotkeys('ArrowLeft', () => { if (!isDialogConsuming()) store.goToPrevSection(); }, { preventDefault: true });
    useHotkeys('ArrowRight', () => { if (!isDialogConsuming()) store.goToNextSection(); }, { preventDefault: true });
    useHotkeys('alt+b', () => {
        if (motivationsAvailable) setReelsOpen(prev => !prev);
    }, { preventDefault: true, enabled: motivationsAvailable }, [motivationsAvailable]);

    return (
        <>
            <AppBarLayout app="reader" showApps={Boolean(authStore.isAuthenticated && page && !page.isPubliclyAccessible)}
                breadcrumbs={<div className="flex items-center gap-1.5 min-w-0 text-xs leading-tight">

                <Observer>
                    {() => {
                        const page = store.optCurrentPage;
                        const section = store.currentSection;
                        if (!page) {
                            return (
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-4 w-4 rounded bg-[var(--color-surface-raised)] animate-pulse shrink-0" />
                                    <div className="h-4 w-32 rounded bg-[var(--color-surface-raised)] animate-pulse" />
                                </div>
                            );
                        }
                        const parentTitle = store.parentPageTitle;
                        const parentPageId = page.parentPageId;

                        return (
                            <div className="flex items-center gap-1 min-w-0">
                                {parentPageId ? (
                                    <>
                                        <span
                                            className="truncate max-w-[100px] cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-colors"
                                            onClick={() => navigate(readerPageWithIdRouteValue(parentPageId))}
                                            title={parentTitle ?? undefined}
                                        >
                                            {parentTitle || '\u2026'}
                                        </span>
                                        <ChevronRight size={10} className="shrink-0 text-[var(--color-text-muted)]" />
                                    </>
                                ) : null}
                                <span className="truncate font-semibold text-[var(--color-text-strong)] max-w-[160px]" title={page.title}>
                                    {page.title}
                                </span>
                                {page.isPublic && !page.isPubliclyAccessible && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                        <Globe size={10} />
                                        <span>Public</span>
                                    </span>
                                )}
                                {section?.title && (
                                    <>
                                        <ChevronRight size={10} className="shrink-0 text-[var(--color-text-muted)]" />
                                        <span className="truncate text-[var(--color-text-muted)] max-w-[200px]" title={section.title}>
                                            {section.title}
                                        </span>
                                    </>
                                )}
                            </div>
                        );
                    }}
                </Observer>
            </div>}
                tools={<AppBarTools label="Reading tools" primary={<>
                {page?.parentPageId && <Button variant="outlined" size="sm" iconOnly
                    aria-label="Back to parent page" tooltip="Back to parent page"
                    onClick={() => navigate(readerPageWithIdRouteValue(page.parentPageId!))}>
                    <ArrowLeft size={16} />
                </Button>}
                <Observer>
                    {() => {
                        const section = store.currentSection;
                        const page = store.optCurrentPage;
                        const navigable = store.navigableSections;
                        const total = navigable.length;
                        const currentIndex = section ? navigable.indexOf(section) + 1 : 0;
                        return (
                            <>
                                <Button variant="outlined" size="sm" iconOnly onClick={() => store.goToPrevSection()} disabled={!store.hasPrevSection} tooltip="Previous section (←)">
                                    <ChevronLeft size={16} />
                                </Button>
                                {page && total > 0 && (
                                    <span className="text-xs font-semibold text-[var(--color-text-muted)] min-w-[3rem] text-center select-none font-mono">
                                        {currentIndex} / {total}
                                    </span>
                                )}
                                <Button variant="outlined" size="sm" iconOnly onClick={() => store.goToNextSection()} disabled={!store.hasNextSection} tooltip="Next section (→)">
                                    <ChevronRight size={16} />
                                </Button>
                            </>
                        );
                    }}
                </Observer>
                <Button variant="outlined" size="sm" iconOnly aria-label="Reading settings" onClick={() => setSettingsOpen(true)} tooltip="Reading settings">
                    <Settings size={16} />
                </Button>
                </>}>
                <Observer>
                    {() => {
                        const section = store.currentSection;
                        const page = store.optCurrentPage;
                        return (<>
                                {section && (
                                    <Button variant="outlined" size="sm" iconOnly onClick={() => { navigator.clipboard.writeText(section.fullMarkdown); toast.success('Section copied'); }} tooltip="Copy section">
                                        <Copy size={16} />
                                    </Button>
                                )}
                                {page && (
                                    <Button variant="outlined" size="sm" iconOnly onClick={() => { navigator.clipboard.writeText(page.content); toast.success('Page copied'); }} tooltip="Copy page">
                                        <ClipboardList size={16} />
                                    </Button>
                                )}
                            </>
                        );
                    }}
                </Observer>
                <Observer>
                    {() => (
                        <>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => uiSettings.decreaseFontSize()} disabled={!uiSettings.isFontSizeDecreasable} tooltip="Decrease font size (−)">
                                <Minus size={16} />
                            </Button>
                            <Button variant="outlined" size="sm" iconOnly onClick={() => uiSettings.increaseFontSize()} disabled={!uiSettings.isFontSizeIncreasable} tooltip="Increase font size (+)">
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
                        const currentId = store.headingLevel.id;
                        const isCurrentAvailable = availableHeadings.some((h) => h.id === currentId);
                        if (!isCurrentAvailable && availableHeadings.length > 0) {
                            store.setHeadingLevel(availableHeadings[0]);
                        }
                        const headingLevelItems = Object.fromEntries(
                            availableHeadings.map((h) => [h.id, h.label]),
                        );
                        if (Object.keys(headingLevelItems).length === 0) return null;
                        return (
                            <Select
                                value={store.headingLevel.id}
                                onValueChange={(id) => {
                                    const level = PageHeadingLevel.VALUES.find(h => h.id === id);
                                    if (level) store.setHeadingLevel(level);
                                }}
                                items={headingLevelItems}
                                placeholder="Heading"
                                className="h-8 py-0 text-xs"
                                tooltip="Heading level"
                            />
                        );
                    }}
                </Observer>
                <Observer>
                    {() => {
                        const isOpen = store.dictionaryStore.isOpen;
                        return (
                            <Button
                                variant={isOpen ? 'secondary' : 'outlined'}
                                size="sm"
                                iconOnly
                                onClick={() => {
                                    if (isOpen) {
                                        store.dictionaryStore.close();
                                    } else {
                                        store.dictionaryStore.open();
                                    }
                                }}
                                tooltip={isOpen ? 'Close dictionary' : 'Open dictionary'}
                            >
                                <BookOpen size={16} />
                            </Button>
                        );
                    }}
                </Observer>
                <Observer>
                    {() => {
                        const isOwner = store.isOwner;
                        if (!isOwner) return null;
                        return (
                            <Button 
                                variant={store.isPublic ? 'secondary' : 'outlined'}
                                size="sm" 
                                onClick={() => setShareOpen(true)} 
                                tooltip="Share page and subpages"
                                className="flex items-center gap-1.5 px-2.5 text-xs"
                            >
                                <Share2 size={14} className={store.isPublic ? 'text-emerald-500' : ''} />
                                <span className="hidden sm:inline font-medium">
                                    {store.isPublic ? 'Shared' : 'Share'}
                                </span>
                            </Button>
                        );
                    }}
                </Observer>
                {motivationsAvailable && <Button
                    variant="outlined" 
                    size="sm" 
                    onClick={() => setReelsOpen(true)} 
                    tooltip="Take a break (Alt+B)"
                    className="flex items-center gap-1.5 px-2.5 text-xs text-[var(--color-brand)] border-[var(--color-brand)]/40 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]/50"
                >
                    <Sparkles size={14} className="text-[var(--color-brand)] animate-pulse shrink-0" />
                    <span className="hidden sm:inline font-medium">Take a break</span>
                </Button>}

                </AppBarTools>}
            />
                <PageSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
                <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
                {motivationsAvailable && <MotivationReelsDialog open={reelsOpen} onOpenChange={setReelsOpen} />}
        </>
    );
});
