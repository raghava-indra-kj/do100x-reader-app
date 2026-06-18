import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Group, Panel, Separator, usePanelRef, useDefaultLayout } from 'react-resizable-panels';
import { Observer } from 'mobx-react-lite';
import type { ExtractedPaste } from '@lib/md-parser';
import { PageAppbar } from './components/appbar';
import { NavRail } from './components/nav-rail';
import { PageSubpages } from './components/subpages';
import { PageToc } from './components/toc';
import { PageMain } from './components/main-content';
import { DictionaryPanel } from './components/dictionary-panel';
import { UpsertPageDialog } from './components/upsert-page';
import { PageContext, PageStore, usePageStore } from './store';
import { useClipboardPaste } from './hooks/use-clipboard-paste';

const SCROLL_STEP = 80;

function PageProvider({ pageId, children }: { pageId: string; children: React.ReactNode }) {
    const store = useMemo(() => new PageStore({ pageId }), [pageId]);

    useEffect(() => {
        store.mount();
    }, [store]);

    return (
        <PageContext.Provider value={store}>
            {children}
        </PageContext.Provider>
    );
}

export function PageView({ pageId }: { pageId: string }) {
    return (
        <PageProvider pageId={pageId}>
            <PageContent />
        </PageProvider>
    );
}

const SidebarPanel = observer(function SidebarPanel() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;

    if (uiSettings.sidebarPanel === 'subpages') {
        return <PageSubpages />;
    }
    return <PageToc />;
});

const PageContent = observer(function PageContent() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;
    const contentPanelRef = usePanelRef();
    const scrollRef = useRef<HTMLElement>(null);
    const isOpen = uiSettings.sidebarPanelOpen;
    const currentSectionId = store.currentSection?.id;

    useEffect(() => {
        const panel = contentPanelRef.current;
        if (!panel) return;
        if (isOpen) {
            panel.expand();
        } else {
            panel.collapse();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [currentSectionId]);

    useHotkeys('ArrowUp', () => scrollRef.current?.scrollBy({ top: -SCROLL_STEP }), { preventDefault: true, enableOnFormTags: false });
    useHotkeys('ArrowDown', () => scrollRef.current?.scrollBy({ top: SCROLL_STEP }), { preventDefault: true, enableOnFormTags: false });
    useHotkeys('mod+\\', () => uiSettings.setSidebarPanelOpen(!uiSettings.sidebarPanelOpen), { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+c', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'contents') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('contents');
        }
    }, { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+s', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'subpages') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('subpages');
        }
    }, { preventDefault: true, enableOnFormTags: false });

    const [createWithPaste, setCreateWithPaste] = useState<{ open: boolean; title: string; content: string; category: string | null }>({ open: false, title: '', content: '', category: null });

    const handleGlobalPaste = useCallback((data: ExtractedPaste) => {
        setCreateWithPaste({
            open: true,
            title: data.title ?? '',
            content: data.content,
            category: data.category,
        });
    }, []);

    useClipboardPaste(handleGlobalPaste);

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar />
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                    <NavRail />
                    <Group orientation="horizontal" {...useDefaultLayout({ id: "page-sidebar" })}>
                        <Panel
                            panelRef={contentPanelRef}
                            defaultSize={260}
                            minSize={220}
                            maxSize={360}
                            collapsible
                            onResize={(size) => {
                                uiSettings.setSidebarPanelOpen(size.asPercentage > 0);
                            }}
                            className="bg-[var(--color-surface-raised)]"
                        >
                            <SidebarPanel />
                        </Panel>
                        <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-brand)] active:bg-[var(--color-brand)] transition-colors cursor-col-resize relative">
                            <div className="absolute inset-y-0 -left-1 -right-1" />
                        </Separator>
                        <Panel>
                            <main ref={scrollRef} className="h-full overflow-y-auto">
                                <PageMain />
                            </main>
                        </Panel>
                    </Group>
                    <Observer>
                        {() => store.dictionaryStore.isOpen ? (
                            <div className="w-80 shrink-0 border-l border-[var(--color-border-default)] bg-[var(--color-surface-raised)] h-full overflow-hidden">
                                <DictionaryPanel />
                            </div>
                        ) : null}
                    </Observer>
                </div>
            </div>
            <UpsertPageDialog
                open={createWithPaste.open}
                onOpenChange={(open) => setCreateWithPaste({ open, title: open ? createWithPaste.title : '', content: open ? createWithPaste.content : '', category: open ? createWithPaste.category : null })}
                parentPageId={store.pageId}
                initialTitle={createWithPaste.title}
                initialContent={createWithPaste.content}
                initialCategory={createWithPaste.category}
            />
        </div>
    );
});