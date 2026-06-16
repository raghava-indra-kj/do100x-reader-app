import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { safeParseMarkdown } from '@lib/md-parser';
import { PageAppbar } from './components/appbar';
import { NavRail } from './components/nav-rail';
import { PageSubpages } from './components/subpages';
import { PageToc } from './components/toc';
import { PageMain } from './components/main-content';
import { UpsertPageDialog } from './components/upsert-page';
import { PageContext, PageStore, usePageStore } from './store';

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

    const [createWithPaste, setCreateWithPaste] = useState<{ open: boolean; title: string; content: string }>({ open: false, title: '', content: '' });

    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!e.clipboardData) return;
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        const text = e.clipboardData.getData('text/plain');
        if (!text.trim()) return;
        e.preventDefault();

        let title = '';
        let content = text;

        const result = safeParseMarkdown(text);
        if (result.ok) {
            const fm = result.data.frontmatter;
            if (fm && typeof fm.title === 'string') {
                title = fm.title;
                const bodyStart = text.indexOf('---', text.indexOf('---') + 3) + 3;
                content = text.slice(bodyStart).trim();
            }
        }

        setCreateWithPaste({ open: true, title, content });
    }, []);

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar />
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                    <NavRail />
                    <Group orientation="horizontal">
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
                </div>
            </div>
            <UpsertPageDialog
                open={createWithPaste.open}
                onOpenChange={(open) => setCreateWithPaste({ open, title: open ? createWithPaste.title : '', content: open ? createWithPaste.content : '' })}
                parentPageId={store.pageId}
                initialTitle={createWithPaste.title}
                initialContent={createWithPaste.content}
            />
        </div>
    );
});