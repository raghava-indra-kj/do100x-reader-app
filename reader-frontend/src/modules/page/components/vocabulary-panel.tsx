import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loginPageRoute, vocabularyPageRoute } from '@boot/routes';
import { getVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { getExplanations } from '@domain/comment/services/comments-service';
import type { VocabularySummary } from '@domain/vocabulary/models/db-vocabulary';
import type { Comment } from '@domain/comment/models/comment';
import { useAuthStore } from '@modules/auth/provider/store';
import { Button } from '@modules/core/ui/primitives/button';
import { localDay } from '@modules/reader/vocabulary/filters';
import { usePageStore } from '../store';

/** Personal words and page explanations are separate collections. */
export const PageVocabulary = observer(function PageVocabulary() {
    const store = usePageStore(), auth = useAuthStore();
    const [words, setWords] = useState<VocabularySummary[]>([]);
    const [total, setTotal] = useState(0);
    const [explanations, setExplanations] = useState<Comment[]>([]);
    const [mode, setMode] = useState<'page' | 'day'>('page');
    const [date, setDate] = useState(() => localDay(new Date()));
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [retry, setRetry] = useState(0);
    const vocabVersion = store.vocabVersion, commentsVersion = store.commentsVersion;
    useEffect(() => {
        if (!auth.isAuthenticated) return;
        let cancelled = false;
        setLoading(true); setError(null);
        void Promise.all([
            getVocabulary({ limit: 12, sort: 'newest' }),
            getExplanations(mode === 'page' ? { pageId: store.pageId } : { date }),
        ]).then(([vocabulary, savedExplanations]) => {
            if (cancelled) return;
            setLoading(false);
            if (vocabulary.ok) { setWords(vocabulary.data.items); setTotal(vocabulary.data.total); }
            else setError(vocabulary.error.message);
            if (savedExplanations.ok) setExplanations(savedExplanations.data);
            else setError(savedExplanations.error.message);
        });
        return () => { cancelled = true; };
    }, [auth.isAuthenticated, store.pageId, vocabVersion, commentsVersion, mode, date, retry]);
    if (!auth.isAuthenticated) return <p className="p-4 text-xs text-[var(--color-text-muted)]">Your words are private. <Link to={loginPageRoute} className="underline">Sign in</Link> to save and review them.</p>;
    return <div className="flex h-full flex-col overflow-y-auto text-[var(--color-text-strong)]">
        <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] p-3">
            <h2 className="text-xs font-semibold">Saved words <span className="text-[var(--color-text-muted)]">{total}</span></h2>
            <Link to={vocabularyPageRoute} className="text-xs font-medium text-[var(--color-brand)]">Review words</Link>
        </header>
        {error && <div className="p-3"><p role="alert" className="text-xs text-[var(--color-text-error)]">{error}</p><Button variant="ghost" size="sm" onClick={() => setRetry(v => v + 1)}>Retry</Button></div>}
        {loading && <p role="status" className="p-3 text-xs">Loading…</p>}
        <section className="grid gap-1 p-3" aria-label="Recently saved words">
            {!words.length && !loading && <p className="text-xs text-[var(--color-text-muted)]">Select a word and choose “Save word”.</p>}
            {words.map(word => <Link key={word.id} to={`${vocabularyPageRoute}?word=${encodeURIComponent(word.id)}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs hover:bg-[var(--color-surface-soft)]">
                <span className="truncate">{word.term}</span><span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{word.learningStatus === 'learned' ? 'Learned' : 'Learning'}</span>
            </Link>)}
        </section>
        <section className="border-t border-[var(--color-border-subtle)] p-3" aria-label="Saved explanations">
            <h2 className="mb-2 text-xs font-semibold">Your explanations</h2>
            <div className="mb-3 flex flex-wrap items-center gap-1">
                <Button variant={mode === 'page' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('page')}>This page</Button>
                <Button variant={mode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('day')}>Day</Button>
                {mode === 'day' && <input aria-label="Explanations saved on date" type="date" value={date} onChange={e => setDate(e.target.value || localDay(new Date()))} className="min-w-0 max-w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-2 py-1 text-xs" />}
            </div>
            {!explanations.length && !loading && <p className="text-xs text-[var(--color-text-muted)]">Choose “Save to my explanations” when adding a comment.</p>}
            <div className="grid gap-2">{explanations.map(c => <div key={c.id} className="rounded-md border border-[var(--color-border-subtle)] p-2 text-xs">
                {c.sectionTitle && <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">{c.sectionTitle}</p>}
                {mode === 'day' && <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">{c.pageTitle}</p>}
                <blockquote className="mb-2 whitespace-pre-wrap border-l-2 border-[var(--color-brand)] pl-2 text-[var(--color-text-muted)]">{c.selectedText}</blockquote>
                <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
            </div>)}</div>
        </section>
    </div>;
});
