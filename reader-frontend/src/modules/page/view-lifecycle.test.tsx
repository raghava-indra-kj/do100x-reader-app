// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { observable, runInAction } from 'mobx';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ auth: {} as any, stores: [] as any[], makeStore: null as any, compact: false, mediaListeners: new Set<() => void>() }));
vi.mock('./store', async () => {
    const React = await import('react');
    const context = React.createContext<any>(null);
    return { PageContext: context, usePageStore: () => React.useContext(context), PageStore: function({ pageId }: { pageId: string }) { return fixture.makeStore(pageId); } };
});
vi.mock('@modules/auth/provider/store', () => ({ useAuthStore: () => fixture.auth }));
vi.mock('@modules/core/preferences/motivation-preferences', () => ({ useMotivationPreferences: () => ({ motivationsEnabled: false }), canShowMotivations: () => false }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: () => {} }));
vi.mock('react-resizable-panels', async () => {
    const React = await import('react');
    return { Group: ({ children, inert, 'aria-hidden': hidden }: any) => <div data-group inert={inert} aria-hidden={hidden}>{children}</div>, Panel: ({ children }: any) => <section>{children}</section>, Separator: () => <div />, usePanelRef: () => React.useRef({ expand() {}, collapse() {} }), useDefaultLayout: () => ({}) };
});
vi.mock('./hooks/use-clipboard-paste', () => ({ useClipboardPaste: () => {} }));
vi.mock('./components/appbar', () => ({ PageAppbar: () => <div>Toolbar</div> }));
vi.mock('@modules/reader/captures/capture-banner', () => ({ CaptureBanner: () => null }));
vi.mock('./components/nav-rail', () => ({ NavRail: () => <nav><button>Contents rail</button></nav> }));
vi.mock('./components/subpages', () => ({ PageSubpages: () => <div>Subpages</div> }));
vi.mock('./quizzes/quiz-panel', () => ({ PageQuizzes: () => <div>Quizzes</div> }));
vi.mock('./components/toc', () => ({ PageToc: () => <div>Table of contents</div> }));
vi.mock('./components/comments-panel', () => ({ PageComments: () => <div>Comments</div> }));
vi.mock('./components/vocabulary-panel', () => ({ PageVocabulary: () => <div>Vocabulary</div> }));
vi.mock('./components/meaning-panel', () => ({ PageMeaningPanel: () => <textarea aria-label="Meaning editor" /> }));
vi.mock('./components/doubt-panel', () => ({ PageDoubtPanel: () => <textarea aria-label="Questions editor" /> }));
vi.mock('./components/explanation-panel', () => ({ PageExplanationPanel: () => <textarea aria-label="Explanation editor" /> }));
vi.mock('./components/main-content', () => ({ PageMain: () => <button>Reading action</button> }));
vi.mock('./components/dictionary-panel', () => ({ DictionaryPanel: () => <input aria-label="Dictionary search" /> }));
vi.mock('./components/upsert-page', () => ({ UpsertPageDialog: () => null }));
vi.mock('./components/reader-action-button', () => ({ ReaderActionButton: ({ tooltip, children, ...props }: any) => <button aria-label={tooltip} {...props}>{children}</button> }));
import { PageView } from './view';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
beforeEach(() => {
    fixture.stores = []; fixture.compact = false; fixture.mediaListeners.clear();
    fixture.auth = observable({ optCurrentUser: { id: 'user-a' } as { id: string } | null, isAuthenticated: true });
    fixture.makeStore = (pageId: string) => {
        const lookup = () => observable({ isExpanded: false, history: [], dispose: vi.fn() }, { dispose: false });
        const uiSettingsStore = observable({ sidebarPanel: 'doubt', sidebarPanelOpen: true, focusMode: false, setSidebarPanelOpen(open: boolean) { this.sidebarPanelOpen = open; }, setSidebarPanel(panel: string) { this.sidebarPanel = panel; this.sidebarPanelOpen = true; } });
        const store = { pageId, uiSettingsStore, meaningStore: lookup(), doubtStore: lookup(), explanationStore: lookup(), dictionaryStore: { isOpen: false }, currentSection: { id: 'first' }, optCurrentPage: null, isOwner: false, readingProgress: 0, motivationQuote: null, dismissMotivation: vi.fn(), mount: vi.fn(), bumpSubpagesVersion: vi.fn() };
        fixture.stores.push(store); return store;
    };
    vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return fixture.compact; }, addEventListener: (_: string, cb: () => void) => fixture.mediaListeners.add(cb), removeEventListener: (_: string, cb: () => void) => fixture.mediaListeners.delete(cb) })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => { cb(0); return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    HTMLElement.prototype.scrollTo = vi.fn();
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
const render = async (pageId = 'page-a') => { await act(async () => root.render(<PageView pageId={pageId} />)); };
const edit = async (fn: () => void) => { await act(async () => runInAction(fn)); };

it('renders exactly one selected AI panel through expansion, compact layout and focus mode', async () => {
    await render(); const store = fixture.stores[0];
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    await edit(() => { store.doubtStore.isExpanded = true; });
    expect(host.querySelectorAll('[aria-label="Questions editor"]')).toHaveLength(1);
    expect(host.querySelector('[data-group]')!.hasAttribute('inert')).toBe(true);
    expect(host.querySelector('[data-group] textarea')).toBeNull();
    await act(async () => { fixture.compact = true; fixture.mediaListeners.forEach(cb => cb()); });
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    expect(host.querySelector('.reader-mobile-sidebar')).toBeNull();

    await edit(() => { store.uiSettingsStore.sidebarPanel = 'meaning'; store.meaningStore.isExpanded = true; });
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    expect(host.querySelector('[aria-label="Questions editor"]')).toBeNull();
    await edit(() => { store.uiSettingsStore.focusMode = true; });
    expect(host.querySelectorAll('textarea')).toHaveLength(0);
    expect(host.querySelector('[data-group]')!.hasAttribute('inert')).toBe(false);
    await edit(() => { store.uiSettingsStore.focusMode = false; store.meaningStore.isExpanded = false; });
    expect(host.querySelectorAll('textarea')).toHaveLength(1);
    expect(host.querySelector('.reader-mobile-sidebar textarea')).not.toBeNull();
    await edit(() => store.uiSettingsStore.setSidebarPanelOpen(false));
    expect(host.querySelectorAll('textarea')).toHaveLength(0);
});

it('reuses a page store for the same user but isolates changed users, anonymous readers and other pages', async () => {
    await render(); const original = fixture.stores[0];
    await edit(() => { fixture.auth.optCurrentUser = { id: 'user-a' }; });
    expect(fixture.stores).toHaveLength(1);
    await edit(() => { fixture.auth.optCurrentUser = { id: 'user-b' }; });
    expect(fixture.stores).toHaveLength(2);
    expect(original.doubtStore.dispose).toHaveBeenCalledOnce();
    expect(original.meaningStore.dispose).toHaveBeenCalledOnce();
    expect(original.explanationStore.dispose).toHaveBeenCalledOnce();
    await edit(() => { fixture.auth.optCurrentUser = null; fixture.auth.isAuthenticated = false; });
    expect(fixture.stores).toHaveLength(3);
    expect(host.querySelector('[aria-label="Questions editor"]')).not.toBeNull();
    await render('page-b');
    expect(fixture.stores).toHaveLength(4);
    expect(fixture.stores[3].pageId).toBe('page-b');
});
