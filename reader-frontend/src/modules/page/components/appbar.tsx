import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from '@base-ui/react/menu';
import { Pencil } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useHotkeys } from 'react-hotkeys-hook';
import { homePageRoute, readerPageWithIdRouteValue } from '@boot/routes';
import { useAuthStore } from '@modules/auth/provider/store';
import { ReaderIcon } from '@modules/core/branding';
import { canShowMotivations, useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { AppBarTools } from '@modules/core/ui/components/appbar/appbar-tools';
import { useViewport } from '@modules/core/ui/components/appbar/use-viewport';
import { MotivationReelsDialog } from '@modules/core/ui/components/motivation-reels';
import { Select } from '@modules/core/ui/primitives/select';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { ReaderToolIcon } from '@modules/reader/reader-tool-icon';
import { useReaderPageSearchControl } from '@modules/reader/search/page-search';
import { shortcutIsInControl } from '../reader-shortcuts';
import { usePageStore } from '../store';
import { PageHeadingLevel } from '../theme/page-heading-level';
import { ReaderActionButton } from './reader-action-button';
import { PageBreadcrumbs } from './page-breadcrumbs';
import { copyReaderText } from './reader-clipboard';
import { PageSettingsDialog } from './settings';
import { ShareDialog } from './share-dialog';
import './reader-appbar.css';

type ToolProps = Omit<ComponentProps<typeof ReaderActionButton>, 'tooltip' | 'children'> & {
    icon: ComponentProps<typeof ReaderToolIcon>['name'];
    label: string;
    tooltip?: string;
    caption?: string;
};

function Tool({ icon, label, tooltip = label, caption, className = '', ...props }: ToolProps) {
    return <ReaderActionButton {...props} tooltip={tooltip} aria-label={label} className={`reader-bar-tool ${className}`}>
        <ReaderToolIcon name={icon} /><span className="reader-tool-caption">{caption ?? label}</span>
    </ReaderActionButton>;
}

interface SectionActionProps {
    onEditSection?: () => void;
    onCommentOnBlocks?: () => void;
}

const PageAppbar = observer(function PageAppbar({ onEditSection, onCommentOnBlocks }: SectionActionProps) {
    const store = usePageStore();
    const auth = useAuthStore();
    const preferences = useMotivationPreferences();
    const settings = store.uiSettingsStore;
    const page = store.optCurrentPage;
    const section = store.currentSection;
    const hasText = Boolean(page && !page.isEmpty);
    const inlineFrom = hasText ? 1024 : 760;
    const inlineTools = useViewport(`(min-width: ${inlineFrom}px)`);
    const privateLibrary = Boolean(auth.isAuthenticated && page && !page.isPubliclyAccessible);
    const search = useReaderPageSearchControl(privateLibrary);
    const moreTrigger = useRef<HTMLButtonElement>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [reelsOpen, setReelsOpen] = useState(false);
    const motivationsAvailable = Boolean(page) && canShowMotivations(
        auth.isAuthenticated, preferences.motivationsEnabled, page?.isPubliclyAccessible,
    );
    useEffect(() => {
        if (!motivationsAvailable) setReelsOpen(false);
    }, [motivationsAvailable]);

    const levels = new Set(store.flatSections.map(item => item.level));
    const headings = PageHeadingLevel.VALUES.filter(h => h.value !== null && levels.has(h.value));
    const fallback = headings.some(h => h.id === store.headingLevel.id) ? undefined : headings[0];
    useEffect(() => {
        if (fallback) store.setHeadingLevel(fallback);
    }, [store, fallback, page?.id]);

    const sections = store.navigableSections;
    const sectionNumber = section ? sections.indexOf(section) + 1 : 0;
    const hasPager = hasText && sections.length > 1;
    const readingShortcut = { ignoreEventWhen: shortcutIsInControl, preventDefault: true };
    useHotkeys('-', () => settings.decreaseFontSize(), { ...readingShortcut, enabled: hasText, useKey: true });
    useHotkeys('+', () => settings.increaseFontSize(), { ...readingShortcut, enabled: hasText, useKey: true, splitKey: '|' });
    useHotkeys('ArrowLeft', () => store.goToPrevSection(), { ...readingShortcut, enabled: hasPager });
    useHotkeys('ArrowRight', () => store.goToNextSection(), { ...readingShortcut, enabled: hasPager });
    useHotkeys('alt+b', () => setReelsOpen(prev => !prev), {
        ...readingShortcut, enabled: motivationsAvailable, ignoreEventWhen: event => !reelsOpen && shortcutIsInControl(event),
    });

    const parentId = page?.ancestors.at(-1)?.id ?? (page?.isOwner ? page.parentPageId : null);
    const parentPath = parentId ? readerPageWithIdRouteValue(parentId) : null;
    const breadcrumbs = page && <PageBreadcrumbs key={page.id} page={page} />;

    const sectionCommands = [
        { label: 'Edit section', icon: <Pencil size={16} aria-hidden="true" />, run: onEditSection },
        { label: 'Comment on blocks', icon: <ReaderToolIcon name="comments" size={16} />, run: onCommentOnBlocks },
    ].filter(command => command.run);
    const hasSectionActions = hasText && Boolean(section) && sectionCommands.length > 0;
    const sectionOverflowGroup = hasSectionActions && <div className="reader-section-command-group" role="group" aria-label="Current section">
        <span>Current section</span>
        {sectionCommands.map(({ label, icon, run }) => <button key={label} type="button" className="reader-section-command" data-appbar-dismiss onClick={run}>
            {icon}{label}
        </button>)}
    </div>;
    const sectionMenu = hasSectionActions && inlineTools && <Menu.Root>
        <Menu.Trigger aria-label="Section actions" title="Section actions" className="reader-bar-tool reader-section-menu-trigger"
            render={(props, state) => <button {...props} aria-expanded={state.open} />}>
            <ReaderToolIcon name="more" />
        </Menu.Trigger>
        <Menu.Portal>
            <Menu.Positioner align="end" sideOffset={6} className="z-50">
                <Menu.Popup aria-label="Section actions" className="reader-section-command-popup">
                    {sectionCommands.map(({ label, icon, run }) => <Menu.Item key={label} className="reader-section-command" onClick={run}>
                        {icon}{label}
                    </Menu.Item>)}
                </Menu.Popup>
            </Menu.Positioner>
        </Menu.Portal>
    </Menu.Root>;
    const pager = hasPager && <div className="reader-section-pager" role="group" aria-label="Section navigation">
        <Tool icon="previous" label="Previous section" tooltip="Previous section (←)" disabled={!store.hasPrevSection} onClick={() => store.goToPrevSection()} />
        <span aria-label={`Section ${sectionNumber} of ${sections.length}`}>{sectionNumber} / {sections.length}</span>
        <Tool icon="next" label="Next section" tooltip="Next section (→)" disabled={!store.hasNextSection} onClick={() => store.goToNextSection()} />
    </div>;
    const fontSize = hasText && <div className="reader-font-stepper" role="group" aria-label="Text size">
        <Tool icon="text-smaller" label="Decrease font size" tooltip="Smaller text (−)" disabled={!settings.isFontSizeDecreasable} onClick={() => settings.decreaseFontSize()} />
        <Tool icon="text-larger" label="Increase font size" tooltip="Larger text (+)" disabled={!settings.isFontSizeIncreasable} onClick={() => settings.increaseFontSize()} />
    </div>;
    const focus = <Tool icon={settings.focusMode ? 'exit-focus' : 'focus'} label={settings.focusMode ? 'Exit focus mode' : 'Enter focus mode'}
        caption={settings.focusMode ? 'Exit focus' : 'Focus'} className="reader-key-tool reader-focus-tool" aria-pressed={settings.focusMode}
        data-appbar-dismiss onClick={() => settings.setFocusMode(!settings.focusMode)} />;
    const display = <Tool icon="reading-settings" label="Reading settings" caption="Display" className="reader-key-tool"
        aria-haspopup="dialog" data-appbar-dismiss onClick={() => setSettingsOpen(true)} />;
    const headingDepth = hasText && headings.length > 0 && <Select
        ariaLabel="Heading level" tooltip="Section depth" className="reader-depth-select"
        value={fallback?.id ?? store.headingLevel.id} items={Object.fromEntries(headings.map(h => [h.id, h.label]))}
        onValueChange={id => {
            const level = headings.find(h => h.id === id);
            if (level) store.setHeadingLevel(level);
        }} />;

    const documentTools = <div className="reader-bar-group reader-document-tools" role="group" aria-label="Page tools">
        {hasText && section && <Tool icon="copy-section" label="Copy section" data-appbar-dismiss onClick={() => void copyReaderText(section.fullMarkdown, 'Section copied')} />}
        {hasText && page && <Tool icon="copy-page" label="Copy page" data-appbar-dismiss onClick={() => void copyReaderText(page.content, 'Page copied')} />}
        <Tool icon="dictionary" label={store.dictionaryStore.isOpen ? 'Close dictionary' : 'Open dictionary'} caption="Dictionary"
            aria-pressed={store.dictionaryStore.isOpen} data-appbar-dismiss onClick={() => {
                if (store.dictionaryStore.isOpen) store.dictionaryStore.close();
                else {
                    settings.setFocusMode(false);
                    store.dictionaryStore.open();
                }
            }} />
        {store.isOwner && page && !page.captureExpiresAt && <Tool icon="share"
            label={store.isPublic ? 'Manage page sharing' : 'Share page and subpages'} caption="Share page"
            aria-haspopup="dialog" data-appbar-dismiss onClick={() => setShareOpen(true)} />}
        {motivationsAvailable && <Tool icon="break" label="Take a break" tooltip="Take a break (Alt+B)"
            aria-haspopup="dialog" data-appbar-dismiss onClick={() => setReelsOpen(true)} />}
    </div>;

    const libraryTools = privateLibrary && <div className="reader-bar-group reader-library-tools" role="group" aria-label="Reader library">
        <Tooltip content="Temporary inbox"><Link to="/reader/captures" className="reader-bar-tool" aria-label="Temporary inbox" data-appbar-dismiss>
            <ReaderToolIcon name="inbox" /><span className="reader-tool-caption">Temporary inbox</span>
        </Link></Tooltip>
        <Tool icon="search" label="Find a page" caption="Find page" tooltip="Find a page (Ctrl+K / ⌘K)"
            className="reader-key-tool reader-search-tool" aria-keyshortcuts="Control+k Meta+k" aria-haspopup="dialog" data-appbar-dismiss
            onClick={event => search.openSearch(event.currentTarget, moreTrigger.current)} />
    </div>;

    const backTo = page?.captureExpiresAt ? '/reader/captures' : parentPath ?? homePageRoute;
    const backLabel = page?.captureExpiresAt ? 'Back to temporary inbox' : backTo === homePageRoute ? 'Back to home' : 'Back to parent page';
    const compactLeading = <div className="reader-compact-identity">
        <Tooltip content={backLabel}><Link to={backTo} aria-label={backLabel} className="reader-bar-tool"><ReaderToolIcon name="previous" /></Link></Tooltip>
        <span role="img" aria-label="Reader"><ReaderIcon size={26} /></span>
    </div>;

    return <>
        <AppBarLayout app="reader" showApps={privateLibrary} breadcrumbs={breadcrumbs}
            actions={libraryTools}
            tools={<div className="reader-bar-controls" data-has-text={hasText || undefined}>
                {focus}
                <AppBarTools label="Reading tools" primary={<>{pager}{sectionMenu}{display}</>}
                    inlineFrom={inlineFrom} overflowIcon={<ReaderToolIcon name="more" />}>
                    {!inlineTools && sectionOverflowGroup}
                    {hasText && <div className="reader-bar-group reader-display-tools" role="group" aria-label="Reading display">
                        {fontSize}{headingDepth && <div className="reader-menu-depth"><span>Section depth</span>{headingDepth}</div>}
                    </div>}
                    {documentTools}
                </AppBarTools>
            </div>}
            compact={{
                overflowTriggerRef: moreTrigger,
                leading: compactLeading,
                actions: fontSize,
                menu: <div className="reader-bar-menu">
                    {page && <PageBreadcrumbs key={page.id} page={page} compact />}
                    {pager}
                    {sectionOverflowGroup}
                    <div className="reader-bar-group" role="group" aria-label="Reading display">{focus}{display}
                        {headingDepth && <div className="reader-menu-depth"><span>Section depth</span>{headingDepth}</div>}
                    </div>
                    {documentTools}
                    {libraryTools}
                </div>,
            }}
        />
        {search.dialog}
        <PageSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
        {motivationsAvailable && <MotivationReelsDialog open={reelsOpen} onOpenChange={setReelsOpen} />}
    </>;
});

export { PageAppbar };
