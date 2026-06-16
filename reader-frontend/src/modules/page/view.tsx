import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { PageAppbar } from './components/appbar';
import { StartPanel } from './components/start-panel';
import { PageMain } from './components/main-content';
import { PageContext, PageStore, usePageStore } from './store';

function PageProvider({ pageId, children }: { pageId: string; children: React.ReactNode }) {
    const store = useMemo(() => new PageStore({ pageId }), [pageId]);

    useEffect(() => {
        store.mount();
        return () => {
            store.unmount();
        };
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

const PageContent = observer(function PageContent() {
    const store = usePageStore();
    const uiSettings = store.uiSettingsStore;
    const tocPanelRef = usePanelRef();
    const isOpen = uiSettings.tocPanelOpen;

    useEffect(() => {
        const panel = tocPanelRef.current;
        if (!panel) return;
        if (isOpen) {
            panel.expand();
        } else {
            panel.collapse();
        }
    }, [isOpen]);

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar />
            <div className="flex-1 overflow-hidden">
                <Group orientation="horizontal">
                    <Panel
                        panelRef={tocPanelRef}
                        defaultSize={260}
                        minSize={260}
                        maxSize={260}
                        collapsible
                        onResize={(size) => {
                            uiSettings.setTocPanelOpen(size.asPercentage > 0);
                        }}
                        className="bg-[var(--color-surface-raised)]"
                    >
                        <StartPanel />
                    </Panel>
                    <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-brand)] active:bg-[var(--color-brand)] transition-colors cursor-col-resize relative">
                        <div className="absolute inset-y-0 -left-1 -right-1" />
                    </Separator>
                    <Panel>
                        <main className="h-full overflow-y-auto">
                            <PageMain />
                        </main>
                    </Panel>
                </Group>
            </div>
        </div>
    );
});