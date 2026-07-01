import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageStore } from '../store';
import {
    getVocabulary,
    deleteVocabulary,
} from '@domain/vocabulary/services/vocabulary-service';
import { getExplanations } from '@domain/comment/services/comments-service';
import { getPage } from '@domain/page/services/pages-service';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import type { Comment } from '@domain/comment/models/comment';
import { DataState } from '@lib/utils/data-state';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import {
    NotebookPen,
    Trash2,
    Sparkles,
    Calendar,
    FileText,
} from 'lucide-react';

function formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
}

function toIsoDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const TODAY = toIsoDay(new Date());

export const PageVocabulary = observer(function PageVocabulary() {
    const store = usePageStore();
    const mountedRef = useRef(true);

    const [mode, setMode] = useState<'page' | 'day'>('page');
    const [date, setDate] = useState(TODAY);

    const [vocabState, setVocabState] = useState<DataState<Vocabulary[]>>(DataState.init);
    const [explState, setExplState] = useState<DataState<Comment[]>>(DataState.init);
    const [titleCache, setTitleCache] = useState<Record<string, string>>({});

    const vocabVersion = store.vocabVersion;
    const commentsVersion = store.commentsVersion;

    const load = useCallback(() => {
        setVocabState(DataState.loading());
        setExplState(DataState.loading());

        const vocabParams = mode === 'page' ? { pageId: store.pageId } : { date };
        const explParams = mode === 'page' ? { pageId: store.pageId } : { date };

        getVocabulary(vocabParams).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setVocabState(DataState.data(result.data));

                if (mode === 'day') {
                    const uniquePageIds = Array.from(
                        new Set(result.data.map((v) => v.pageId))
                    ).filter((id) => !(id in titleCache));
                    uniquePageIds.forEach((id) => {
                        getPage({ pageId: id }).then((r) => {
                            if (mountedRef.current && r.ok) {
                                setTitleCache((prev) => ({
                                    ...prev,
                                    [id]: r.data.title,
                                }));
                            }
                        });
                    });
                }
            } else {
                setVocabState(DataState.error(result.error));
            }
        });

        getExplanations(explParams).then((result) => {
            if (!mountedRef.current) return;
            if (result.ok) {
                setExplState(DataState.data(result.data));
            } else {
                setExplState(DataState.error(result.error));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, date, store.pageId, vocabVersion, commentsVersion]);

    useEffect(() => {
        mountedRef.current = true;
        load();
        return () => {
            mountedRef.current = false;
        };
    }, [load]);

    const vocab = vocabState.ifLoadedOr({ loaded: (c) => c, or: () => [] as Vocabulary[] });
    const explanations = explState.ifLoadedOr({ loaded: (c) => c, or: () => [] as Comment[] });

    const handleDeleteVocab = useCallback(async (vocabId: string) => {
        const result = await deleteVocabulary({ vocabId });
        if (result.ok) {
            store.bumpVocabVersion();
        }
    }, [store]);

    const resolvePageTitle = useCallback(
        (pageId: string): string => {
            if (pageId === store.pageId) return store.optCurrentPage?.title ?? pageId;
            return titleCache[pageId] ?? pageId;
        },
        [store, titleCache]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-col gap-1.5 shrink-0 px-3 pt-3 pb-2 border-b border-[var(--color-border-subtle)]">
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                    Vocabulary
                </span>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setMode('page')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                            mode === 'page'
                                ? 'bg-[var(--color-surface-card)] text-[var(--color-brand)]'
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]'
                        }`}
                        title="Vocabulary for this page"
                    >
                        <FileText size={11} />
                        <span>This page</span>
                    </button>
                    <button
                        onClick={() => setMode('day')}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                            mode === 'day'
                                ? 'bg-[var(--color-surface-card)] text-[var(--color-brand)]'
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]'
                        }`}
                        title="Vocabulary across all pages for a day"
                    >
                        <Calendar size={11} />
                        <span>Day</span>
                    </button>
                    {mode === 'day' && (
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value || TODAY)}
                            className="ml-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-brand)]"
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                    <span>{vocab.length} words</span>
                    <span>·</span>
                    <span>{explanations.length} explanations</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {vocabState.fold({
                    pending: () => (
                        <div className="flex items-center justify-center p-8">
                            <Loader />
                        </div>
                    ),
                    loaded: () => (
                        <div className="flex flex-col gap-3 p-3">
                            {/* Words added */}
                            <section className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
                                    <NotebookPen size={12} />
                                    <span>Words you looked up</span>
                                </div>
                                {vocab.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-subtle)] pl-0.5">
                                        Select a word on the page and pick “Add to Vocabulary”.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {vocab.map((v) => (
                                            <div
                                                key={v.id}
                                                className="group flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-2 py-1.5"
                                            >
                                                <span className="text-xs text-[var(--color-text-strong)] truncate flex-1 min-w-0">
                                                    {v.term}
                                                </span>
                                                {mode === 'day' && (
                                                    <span
                                                        className="text-[10px] text-[var(--color-text-subtle)] truncate max-w-[120px]"
                                                        title={resolvePageTitle(v.pageId)}
                                                    >
                                                        {resolvePageTitle(v.pageId)}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-[var(--color-text-subtle)] tabular-nums shrink-0">
                                                    {formatRelativeTime(v.createdAt)}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteVocab(v.id)}
                                                    className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-error)] hover:bg-[var(--color-surface-soft)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                                    title="Remove from vocabulary"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Explanations */}
                            <section className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
                                    <Sparkles size={12} />
                                    <span>Your explanations</span>
                                </div>
                                {explanations.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-subtle)] pl-0.5">
                                        When adding a comment, tick “Mark as my explanation” to collect them here.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {explanations.map((c) => (
                                            <div
                                                key={c.id}
                                                className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-2 py-1.5"
                                            >
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    {c.sectionTitle && (
                                                        <span className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider truncate">
                                                            {c.sectionTitle}
                                                        </span>
                                                    )}
                                                    {mode === 'day' && (
                                                        <span
                                                            className="text-[10px] text-[var(--color-text-subtle)] truncate ml-auto"
                                                            title={c.pageTitle}
                                                        >
                                                            {c.pageTitle}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="rounded bg-[var(--color-surface-soft)] border-l-2 border-[var(--color-brand)] px-2 py-1 text-[11px] text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap mb-1">
                                                    {c.selectedText}
                                                </div>
                                                <p className="text-xs text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap">
                                                    {c.body}
                                                </p>
                                                <span className="text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                                                    {formatRelativeTime(c.createdAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    ),
                    error: () => (
                        <div className="p-4 text-sm text-[var(--color-text-error)]">
                            Failed to load vocabulary
                        </div>
                    ),
                })}
            </div>
        </div>
    );
});