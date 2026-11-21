import { ReaderActionButton } from './components/reader-action-button';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Group, Panel, Separator, usePanelRef, useDefaultLayout } from 'react-resizable-panels';
import { Observer } from 'mobx-react-lite';
import type { ExtractedPaste } from '@lib/md-parser';
import { PageAppbar } from './components/appbar';
import { CaptureBanner } from '@modules/reader/captures/capture-banner';
import { NavRail } from './components/nav-rail';
import { PageSubpages } from './components/subpages';
import { PageQuizzes } from './quizzes/quiz-panel';
import { PageToc } from './components/toc';
import { PageComments } from './components/comments-panel';
import { PageVocabulary } from './components/vocabulary-panel';
import { PageMeaningPanel } from './components/meaning-panel';
import { PageDoubtPanel } from './components/doubt-panel';
import { PageExplanationPanel } from './components/explanation-panel';
import { PageMain, type ReaderSectionActions } from './components/main-content';
import { DictionaryPanel } from './components/dictionary-panel';
import { UpsertPageDialog } from './components/upsert-page';
import { Dialog, BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { PageContext, PageStore, usePageStore } from './store';
import type { Motivation } from './store';
import { useClipboardPaste } from './hooks/use-clipboard-paste';
import { useAuthStore } from '@modules/auth/provider/store';
import { canShowMotivations, useMotivationPreferences } from '@modules/core/preferences/motivation-preferences';
import { X } from 'lucide-react';
import './components/reader-experience.css';
import { READER_COMPACT_QUERY } from './reader-layout';
import { shortcutIsInControl } from './reader-shortcuts';

const SCROLL_STEP = 80;

export const PageProvider = observer(function PageProvider({ pageId, children }: { pageId: string; children: React.ReactNode }) {
    const auth = useAuthStore();
    const identity = auth.optCurrentUser?.id ?? 'anonymous';
    const store = useMemo(() => new PageStore({ pageId }), [pageId, identity]);

    useEffect(() => {
        store.mount();
        const refreshCollection = () => store.bumpSubpagesVersion();
        window.addEventListener('focus', refreshCollection);
        return () => {
            window.removeEventListener('focus', refreshCollection);
            store.meaningStore.dispose();
            store.explanationStore.dispose();
            store.doubtStore.dispose();
        };
    }, [store]);

    return (
        <PageContext.Provider key={`${identity}:${pageId}`} value={store}>
            {children}
        </PageContext.Provider>
    );
});

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
    if (uiSettings.sidebarPanel === 'quizzes') {
        return <PageQuizzes />;
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
    const authStore = useAuthStore();
    const motivationPreferences = useMotivationPreferences();
    const uiSettings = store.uiSettingsStore;
    const userId = authStore.optCurrentUser?.id ?? null;
    const currentPage = store.optCurrentPage;
    const motivationsAvailable = Boolean(currentPage) && canShowMotivations(
        authStore.isAuthenticated,
        motivationPreferences.motivationsEnabled,
        currentPage?.isPubliclyAccessible,
    );
    const contentPanelRef = usePanelRef();
    const scrollRef = useRef<HTMLElement>(null);
    const sectionActions = useRef<ReaderSectionActions>(null);
    const isOpen = uiSettings.sidebarPanelOpen && !uiSettings.focusMode;
    const expandedAi = isOpen && (
        (uiSettings.sidebarPanel === 'meaning' && store.meaningStore.isExpanded) ||
        (uiSettings.sidebarPanel === 'doubt' && store.doubtStore.isExpanded) ||
        (uiSettings.sidebarPanel === 'explanation' && store.explanationStore.isExpanded)
    );
    const [compact, setCompact] = useState(() => window.matchMedia(READER_COMPACT_QUERY).matches);
    useEffect(() => {
        const media = window.matchMedia(READER_COMPACT_QUERY);
        const update = () => setCompact(media.matches);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    const currentSectionId = store.currentSection?.id;

    useEffect(() => {
        const panel = contentPanelRef.current;
        if (!panel) return;
        // Keep the panel registered across mobile/desktop transitions. Wait for
        // the resizable group's layout registration before issuing commands.
        const frame = requestAnimationFrame(() => {
            if (isOpen && !compact) panel.expand();
            else panel.collapse();
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen, compact]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [currentSectionId]);

    const scrollShortcut = { preventDefault: true, enableOnFormTags: false, ignoreEventWhen: shortcutIsInControl };
    useHotkeys('ArrowUp', () => scrollRef.current?.scrollBy({ top: -SCROLL_STEP }), scrollShortcut);
    useHotkeys('ArrowDown', () => scrollRef.current?.scrollBy({ top: SCROLL_STEP }), scrollShortcut);
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
    useHotkeys('alt+q', () => {
        if (uiSettings.sidebarPanelOpen && uiSettings.sidebarPanel === 'quizzes') {
            uiSettings.setSidebarPanelOpen(false);
        } else {
            uiSettings.setSidebarPanel('quizzes');
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
        if (!store.isOwner) return;
        setCreateWithPaste({
            open: true,
            title: data.title ?? '',
            content: data.content,
            category: data.category,
        });
    }, [store.isOwner]);

    useClipboardPaste(handleGlobalPaste, !currentPage?.captureExpiresAt);

    const [motivations, setMotivations] = useState<Motivation[]>([]);
    const prevProgressRef = useRef<number | null>(null);
    const completedPagesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        completedPagesRef.current = new Set();
        prevProgressRef.current = null;
        if (!userId) return;
        try {
            const stored = localStorage.getItem(`motivation_completed_pages:${userId}`);
            if (stored) completedPagesRef.current = new Set(JSON.parse(stored));
        } catch { }
    }, [userId]);

    useEffect(() => {
        prevProgressRef.current = null;
    }, [store.pageId]);

    useEffect(() => {
        if (!motivationsAvailable) {
            setMotivations([]);
            store.dismissMotivation();
            return;
        }
        let cancelled = false;
        fetch('/motivations.json')
            .then(r => r.json())
            .then((data: Motivation[]) => { if (!cancelled && Array.isArray(data)) setMotivations(data); })
            .catch(() => { if (!cancelled) setMotivations([]); });
        return () => { cancelled = true; };
    }, [motivationsAvailable, store]);

    useEffect(() => {
        const progress = store.readingProgress;
        if (prevProgressRef.current !== null
            && motivationsAvailable
            && userId
            && progress === 100
            && prevProgressRef.current < 100
            && motivations.length > 0
            && !completedPagesRef.current.has(store.pageId)
        ) {
            const idx = parseInt(localStorage.getItem(`motivation_index:${userId}`) || '0', 10);
            const quote = motivations[idx % motivations.length];
            store.triggerMotivation(quote);
            localStorage.setItem(`motivation_index:${userId}`, String(idx + 1));
            completedPagesRef.current.add(store.pageId);
            localStorage.setItem(`motivation_completed_pages:${userId}`, JSON.stringify([...completedPagesRef.current]));
        }
        prevProgressRef.current = progress;
    });

    const activeSection = store.currentSection;
    const hasArticle = currentPage && !currentPage.isEmpty && activeSection && !store.initDataState.isLoading && !store.initDataState.isError;
    const startBlockSelection = () => {
        if (expandedAi || (compact && isOpen)) uiSettings.setSidebarPanelOpen(false);
        if (compact && store.dictionaryStore.isOpen) store.dictionaryStore.close();
        sectionActions.current?.commentOnBlocks();
    };
    const sections = store.optCurrentPage && !store.optCurrentPage.isEmpty ? store.navigableSections : [];
    const position = activeSection ? sections.indexOf(activeSection) + 1 : 0;
    return (
        <div className="flex h-screen flex-col bg-[var(--color-surface-canvas)]">
            <PageAppbar
                onEditSection={hasArticle && currentPage.isOwner && activeSection.sourceRange ? () => sectionActions.current?.editSection() : undefined}
                onCommentOnBlocks={hasArticle && currentPage.document ? startBlockSelection : undefined}
            />
            {position > 0 && sections.length > 1 && <progress
                className="reader-page-progress" aria-label="Page section progress"
                aria-valuetext={`Section ${position} of ${sections.length}`}
                value={position} max={sections.length}
            />}
            <CaptureBanner />
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full relative">
                    {!uiSettings.focusMode && <NavRail />}
                    {compact && isOpen && !expandedAi && <aside className="reader-mobile-sidebar" aria-label="Reader sidebar">
                        <div className="reader-mobile-sidebar-close"><ReaderActionButton tooltip="Close reader sidebar" className="reader-icon-button" onClick={() => uiSettings.setSidebarPanelOpen(false)}><X size={16} /></ReaderActionButton></div>
                        <div className="reader-mobile-sidebar-body"><SidebarPanel /></div>
                    </aside>}
                    <Group inert={expandedAi ? true : undefined} aria-hidden={expandedAi || undefined} orientation="horizontal" {...useDefaultLayout({ id: "page-sidebar" })}>
                        <Panel
                            panelRef={contentPanelRef}
                            defaultSize={320}
                            minSize={240}
                            maxSize={460}
                            collapsible
                            onResize={(size) => {
                                if (!compact && !uiSettings.focusMode) uiSettings.setSidebarPanelOpen(size.asPercentage > 0);
                            }}
                            className="bg-[var(--color-surface-raised)]"
                        >
                            {isOpen && !compact && !expandedAi && <SidebarPanel />}
                        </Panel>
                        {!compact && <Separator className="w-px bg-[var(--color-border-default)] hover:bg-[var(--color-brand)] active:bg-[var(--color-brand)] transition-colors cursor-col-resize relative">
                            <div className="absolute inset-y-0 -left-1 -right-1" />
                        </Separator>}
                        <Panel>
                            <main ref={scrollRef} className="h-full overflow-y-auto">
                                <PageMain ref={sectionActions} />
                            </main>
                        </Panel>
                    </Group>
                    {expandedAi && <div className="absolute inset-y-0 left-12 right-0 bg-[var(--color-surface-canvas)] z-20 flex flex-col h-full overflow-hidden border-l border-[var(--color-border-default)]">
                        <SidebarPanel />
                    </div>}
                    <Observer>
                        {() => !uiSettings.focusMode && !expandedAi && store.dictionaryStore.isOpen ? (
                            <div className={`${compact ? 'absolute inset-y-0 left-12 right-0 z-40' : 'w-80 shrink-0'} border-l border-[var(--color-border-default)] bg-[var(--color-surface-raised)] h-full overflow-hidden`}>
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
                    if (!motivationsAvailable || !quote) return null;
                    return (
                        <Dialog open={true} onOpenChange={() => store.dismissMotivation()}>
                            <div className="flex flex-col gap-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold text-[var(--color-brand)]">Page finished</p>
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
                                        Continue reading
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
