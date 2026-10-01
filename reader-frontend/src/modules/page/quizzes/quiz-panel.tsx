import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardList, Edit3, Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { Button } from '@modules/core/ui/primitives/button';
import { useAuthStore } from '@modules/auth/provider/store';
import { usePageStore } from '../store';
import { quizApi, type QuizListItem, type AttemptList } from './quiz-api';
import { QuizEditor } from './quiz-editor';
import { QuizAttempt } from './quiz-attempt';
import { QuizPreview } from './quiz-preview';

export const PageQuizzes = observer(function PageQuizzes() {
    const page = usePageStore();
    const auth = useAuthStore();
    const [items, setItems] = useState<QuizListItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [archived, setArchived] = useState<QuizListItem[]>([]);
    const [archivedCursor, setArchivedCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editor, setEditor] = useState<string | 'new' | null>(null);
    const [attempt, setAttempt] = useState<{ quizId: string; attemptId?: string } | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [historyQuiz, setHistoryQuiz] = useState<string | null>(null);
    const [history, setHistory] = useState<AttemptList | null>(null);
    const [archivePending, setArchivePending] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [result, older] = await Promise.all([quizApi.list(page.pageId), auth.isAuthenticated ? quizApi.list(page.pageId, undefined, true) : Promise.resolve(null)]);
            setItems(result.items); setNextCursor(result.nextCursor);
            setArchived(older?.items ?? []); setArchivedCursor(older?.nextCursor ?? null);
        }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load quizzes'); }
        finally { setLoading(false); }
    }, [page.pageId, auth.isAuthenticated]);
    useEffect(() => { void refresh(); }, [refresh]);
    const more = async () => {
        if (!nextCursor) return;
        setLoading(true);
        try { const result = await quizApi.list(page.pageId, nextCursor); setItems((previous) => [...previous, ...result.items]); setNextCursor(result.nextCursor); }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load more quizzes'); }
        finally { setLoading(false); }
    };
    const swap = async (first: QuizListItem, second: QuizListItem) => {
        try { await quizApi.swap(first.id, second.id); await refresh(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not reorder quizzes'); }
    };
    const archive = async (item: QuizListItem) => {
        try { await quizApi.archive(item.id, item.revisionNo); setArchivePending(null); await refresh(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not archive quiz'); }
    };
    const showHistory = async (quizId: string) => {
        if (historyQuiz === quizId) { setHistoryQuiz(null); setHistory(null); return; }
        setHistoryQuiz(quizId); setHistory(null);
        try { setHistory(await quizApi.attempts(quizId)); }
        catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load attempts'); }
    };

    return <div className="flex h-full flex-col bg-[var(--color-surface-raised)]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-3 py-3">
            <div><h2 className="text-sm font-semibold">Quizzes</h2><p className="text-[11px] text-[var(--color-text-muted)]">Question papers for this page</p></div>
            {page.isOwner && <Button iconOnly size="sm" tooltip="Create quiz" aria-label="Create quiz" onClick={() => setEditor('new')}><Plus size={15} /></Button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
            {error && <div role="alert" className="rounded border border-[var(--color-error)] p-2 text-xs text-[var(--color-error)]">{error}<button className="ml-2 underline" onClick={refresh}>Retry</button></div>}
            {!loading && items.length === 0 && <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--color-text-muted)]"><ClipboardList size={26} /><p className="text-xs">No quizzes on this page yet.</p></div>}
            {items.map((item, index) => <div key={item.id} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold" title={item.title}>{item.title}</p><p className="text-[11px] text-[var(--color-text-muted)]">Revision {item.revisionNo}</p></div>
                    {page.isOwner && <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]" aria-label={`Edit ${item.title}`} title="Edit quiz" onClick={() => setEditor(item.id)}><Edit3 size={14} /></button>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5"><Button size="sm" variant="outlined" onClick={() => setPreview(item.id)}>Preview</Button><Button size="sm" onClick={() => setAttempt({ quizId: item.id })} disabled={!auth.isAuthenticated}>Take quiz</Button>
                    {auth.isAuthenticated && <Button size="sm" variant="outlined" onClick={() => showHistory(item.id)}>{historyQuiz === item.id ? 'Hide attempts' : 'My attempts'}</Button>}
                </div>
                {!auth.isAuthenticated && <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">Sign in to save an attempt.</p>}
                {page.isOwner && <><div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border-subtle)] pt-2 text-[11px]"><button disabled={index === 0} aria-label={`Move ${item.title} up`} className="disabled:opacity-30" onClick={() => swap(item, items[index - 1])}><ArrowUp size={14} /></button><button disabled={index === items.length - 1} aria-label={`Move ${item.title} down`} className="disabled:opacity-30" onClick={() => swap(item, items[index + 1])}><ArrowDown size={14} /></button><button className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-error)]" onClick={() => setArchivePending(item.id)}>Archive</button></div>{archivePending === item.id && <div className="mt-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-2 text-xs"><p className="mb-2">Hide this quiz from new attempts? Past submissions stay available.</p><div className="flex justify-end gap-2"><Button size="sm" variant="outlined" onClick={() => setArchivePending(null)}>Keep quiz</Button><Button size="sm" onClick={() => archive(item)}>Archive now</Button></div></div>}</>}
                {historyQuiz === item.id && <div className="mt-3 space-y-1 border-t border-[var(--color-border-subtle)] pt-2">{!history && <p className="text-xs">Loading attempts…</p>}{history?.items.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">No attempts yet.</p>}{history?.items.map((entry) => <button key={entry.id} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--color-surface-soft)]" onClick={() => setAttempt({ quizId: item.id, attemptId: entry.id })}>{new Date(entry.startedAt).toLocaleDateString()} · Revision {entry.revisionNo} · {entry.status === 'SUBMITTED' ? 'Submitted' : 'Continue'}</button>)}{history?.nextCursor && <button className="text-xs underline" onClick={async () => { const next = await quizApi.attempts(item.id, history.nextCursor!); setHistory({ items: [...history.items, ...next.items], nextCursor: next.nextCursor }); }}>More attempts</button>}</div>}
            </div>)}
            {loading && <p className="py-3 text-center text-xs text-[var(--color-text-muted)]">Loading…</p>}
            {nextCursor && !loading && <Button size="sm" variant="outlined" onClick={more}>Load more</Button>}
            {archived.length > 0 && <div className="border-t border-[var(--color-border-default)] pt-4">
                <h3 className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Archived quizzes</h3>
                {archived.map((item) => <div key={item.id} className="mb-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-3">
                    <p className="truncate text-sm font-medium">{item.title}</p><p className="text-[11px] text-[var(--color-text-muted)]">Revision {item.revisionNo} · Past attempts remain available</p>
                    <Button size="sm" variant="outlined" onClick={() => showHistory(item.id)}>{historyQuiz === item.id ? 'Hide attempts' : 'My attempts'}</Button>
                    {historyQuiz === item.id && <div className="mt-2 space-y-1">{!history && <p className="text-xs">Loading…</p>}{history?.items.length === 0 && <p className="text-xs">No attempts.</p>}{history?.items.map((entry) => <button key={entry.id} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-[var(--color-surface-canvas)]" onClick={() => setAttempt({ quizId: item.id, attemptId: entry.id })}>{new Date(entry.startedAt).toLocaleDateString()} · Revision {entry.revisionNo} · {entry.status}</button>)}{history?.nextCursor && <button className="text-xs underline" onClick={async () => { const next = await quizApi.attempts(item.id, history.nextCursor!); setHistory({ items: [...history.items, ...next.items], nextCursor: next.nextCursor }); }}>More attempts</button>}</div>}
                </div>)}
                {archivedCursor && <Button size="sm" variant="outlined" onClick={async () => { try { const next = await quizApi.list(page.pageId, archivedCursor, true); setArchived((current) => [...current, ...next.items]); setArchivedCursor(next.nextCursor); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load archived quizzes'); } }}>More archived</Button>}
            </div>}
        </div>
        <div className="border-t border-[var(--color-border-default)] p-2"><button className="flex w-full items-center justify-center gap-1 text-xs text-[var(--color-text-muted)]" onClick={refresh}><RefreshCw size={12} /> Refresh</button></div>
        {editor && <QuizEditor pageId={page.pageId} quizId={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={refresh} />}
        {preview && <QuizPreview quizId={preview} canAttempt={auth.isAuthenticated} onClose={() => setPreview(null)} onStart={() => { setAttempt({ quizId: preview }); setPreview(null); }} />}
        {attempt && <QuizAttempt quizId={attempt.quizId} attemptId={attempt.attemptId} onClose={() => setAttempt(null)} onChanged={() => { if (historyQuiz === attempt.quizId) void quizApi.attempts(attempt.quizId).then(setHistory); }} />}
    </div>;
});
