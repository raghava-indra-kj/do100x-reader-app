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
import { PageComments } from './components/comments-panel';
import { PageVocabulary } from './components/vocabulary-panel';
import { PageMeaningPanel } from './components/meaning-panel';
import { PageDoubtPanel } from './components/doubt-panel';
import { PageExplanationPanel } from './components/explanation-panel';
import { PageMain } from './components/main-content';
import { DictionaryPanel } from './components/dictionary-panel';
import { UpsertPageDialog } from './components/upsert-page';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { PageContext, PageStore, usePageStore } from './store';
import type { Motivation } from './store';
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
    if (uiSettings.sidebarPanel === 'comments') {
        return <PageComments />;
    }
    if (uiSettings.sidebarPanel === 'vocabulary') {
        return <PageVocabulary />;
    }
    if (uiSettings.sidebarPanel === 'meaning') {
        return <PageMeaningPanel />;
    }
    if (uiSettings.sidebarPanel === 'doubt') {
        return <PageDoubtPanel />;
    }
    if (uiSettings.sidebarPanel === 'explanation') {
        return <PageExplanationPanel />;
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
    useHotkeys('alt+m', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'comments') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('comments');
        }
    }, { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+v', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'vocabulary') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('vocabulary');
        }
    }, { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+a', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'meaning') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('meaning');
        }
    }, { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+d', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'doubt') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('doubt');
        }
    }, { preventDefault: true, enableOnFormTags: false });
    useHotkeys('alt+e', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'explanation') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('explanation');
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

    const [motivations, setMotivations] = useState<Motivation[]>([]);
    const prevProgressRef = useRef<number | null>(null);
    const completedPagesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        try {
            const stored = localStorage.getItem('motivation_completed_pages');
            if (stored) completedPagesRef.current = new Set(JSON.parse(stored));
        } catch { }
    }, []);

    useEffect(() => {
        fetch('/motivations.json').then(r => r.json()).then(setMotivations);
    }, []);

    useEffect(() => {
        const progress = store.readingProgress;
        if (prevProgressRef.current !== null
            && progress === 100
            && prevProgressRef.current < 100
            && motivations.length > 0
            && !completedPagesRef.current.has(store.pageId)
        ) {
            const idx = parseInt(localStorage.getItem('motivation_index') || '0', 10);
            const quote = motivations[idx % motivations.length];
            store.triggerMotivation(quote);
            localStorage.setItem('motivation_index', String(idx + 1));
            completedPagesRef.current.add(store.pageId);
            localStorage.setItem('motivation_completed_pages', JSON.stringify([...completedPagesRef.current]));
        }
        prevProgressRef.current = progress;
    });

    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar />
            <div className="h-1 shrink-0" style={{ backgroundColor: 'var(--color-border-default)', opacity: 0.25 }}>
                <Observer>
                    {() => (
                        <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{ width: `${store.readingProgress}%`, backgroundColor: 'var(--color-brand)' }}
                        />
                    )}
                </Observer>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full relative">
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
                        {() => store.meaningStore.isExpanded ? (
                            <div className="absolute inset-y-0 left-12 right-0 bg-[var(--color-surface-canvas)] z-20 flex flex-col h-full overflow-hidden border-l border-[var(--color-border-default)] animate-in fade-in slide-in-from-left duration-150">
                                <PageMeaningPanel />
                            </div>
                        ) : null}
                    </Observer>
                    <Observer>
                        {() => store.doubtStore.isExpanded ? (
                            <div className="absolute inset-y-0 left-12 right-0 bg-[var(--color-surface-canvas)] z-20 flex flex-col h-full overflow-hidden border-l border-[var(--color-border-default)] animate-in fade-in slide-in-from-left duration-150">
                                <PageDoubtPanel />
                            </div>
                        ) : null}
                    </Observer>
                    <Observer>
                        {() => store.explanationStore.isExpanded ? (
                            <div className="absolute inset-y-0 left-12 right-0 bg-[var(--color-surface-canvas)] z-20 flex flex-col h-full overflow-hidden border-l border-[var(--color-border-default)] animate-in fade-in slide-in-from-left duration-150">
                                <PageExplanationPanel />
                            </div>
                        ) : null}
                    </Observer>
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
            <Observer>
                {() => {
                    const quote = store.motivationQuote;
                    if (!quote) return null;
                    return (
                        <Dialog open={true} onOpenChange={() => store.dismissMotivation()}>
                            <div className="flex flex-col gap-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold text-[var(--color-brand)]">You completed this page!</p>
                                    </div>
                                    <BaseDialog.Close className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]">
                                        <span className="text-lg leading-none">&times;</span>
                                    </BaseDialog.Close>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <p className="text-base leading-relaxed font-[family-name:var(--font-serif)] italic text-[var(--color-text-strong)]">
                                        &ldquo;{quote.quote}&rdquo;
                                    </p>
                                    <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                                        {quote.meaning}
                                    </p>
                                    <p className="text-xs font-semibold text-[var(--color-text-strong)]">
                                        &mdash; {quote.by}
                                    </p>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={() => store.dismissMotivation()}>
                                        Keep reading
                                    </Button>
                                </div>
                            </div>
                        </Dialog>
                    );
                }}
            </Observer>
        </div>
    );
});