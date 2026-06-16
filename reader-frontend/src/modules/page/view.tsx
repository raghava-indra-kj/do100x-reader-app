import { useEffect, useMemo } from 'react';
import { PageAppbar } from './components/appbar';
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


function PageContent() {
    const store = usePageStore();
    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar />
            <div className="flex-1 overflow-y-auto">
                <PageMain />
            </div>
        </div>
    );
}

function PageMain() {
    return null;
}