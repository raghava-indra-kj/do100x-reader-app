import { SidebarHeader, SidebarSearch, SidebarEmpty } from './sidebar-ui';
import { ReaderActionButton } from './reader-action-button';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loginPageRoute, vocabularyPageRoute } from '@boot/routes';
import { getVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { getExplanations } from '@domain/comment/services/comments-service';
import type { VocabularySummary } from '@domain/vocabulary/models/db-vocabulary';
import type { Comment } from '@domain/comment/models/comment';
import { useAuthStore } from '@modules/auth/provider/store';
import { localDay } from '@modules/reader/vocabulary/filters';
import { usePageStore } from '../store';

/** Personal words and page explanations are separate collections. */
export const PageVocabulary = observer(function PageVocabulary() {
    const store = usePageStore(), auth = useAuthStore();
    const [words, setWords] = useState<VocabularySummary[]>([]);
    const [total, setTotal] = useState(0);
    const [explanations, setExplanations] = useState<Comment[]>([]);
    const [tab, setTab] = useState<'words' | 'explanations'>('words');
    const [query, setQuery] = useState('');
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
    const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
    const shownWords = words.filter(word => matches(word.term));
    const shownExplanations = explanations.filter(note => matches(`${note.body} ${note.selectedText} ${note.sectionTitle ?? ''}`));
    return <div className="reader-panel">
        <SidebarHeader title="Saved words & notes" actions={<>
            <ReaderActionButton tooltip="Refresh saved items" className="reader-icon-button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /></ReaderActionButton>
            <Tooltip content="Open vocabulary review"><Link aria-label="Open vocabulary review" className="reader-icon-button" to={vocabularyPageRoute}><ArrowUpRight size={16} /></Link></Tooltip>
        </>} />
        <div className="reader-panel-tabs" role="group" aria-label="Saved collection">
            <button aria-pressed={tab === 'words'} onClick={() => { setTab('words'); setQuery(''); }}>Words</button>
            <button aria-pressed={tab === 'explanations'} onClick={() => { setTab('explanations'); setQuery(''); }}>Explanations</button>
        </div>
        <div className="reader-panel-toolbar">
            <SidebarSearch label={tab === 'words' ? 'Find a recent word' : 'Find an explanation'} value={query} onChange={setQuery} />
            {tab === 'words' ? <span className="reader-panel-meta">Recent words · {total} in your vocabulary</span> : <div className="reader-saved-scope" role="group" aria-label="Explanation scope">
                <button aria-pressed={mode === 'page'} onClick={() => setMode('page')}>This page</button>
                <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>By date</button>
                {mode === 'day' && <input aria-label="Explanations saved on date" type="date" value={date} onChange={event => setDate(event.target.value || localDay(new Date()))} />}
            </div>}
        </div>
        <div className="reader-panel-scroll">
            {error && <div role="alert" className="reader-panel-error">{error}<button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
            {loading && <p role="status" className="reader-panel-empty">Loading saved items…</p>}
            {!loading && !error && (tab === 'words' ? <>
                {!shownWords.length && <SidebarEmpty title={query ? 'No matching recent words' : 'Build your vocabulary'}>{query ? 'Try another word, or open vocabulary review to search your full collection.' : 'Select a word while reading and choose “Save word”.'}</SidebarEmpty>}
                {shownWords.map(word => <Link key={word.id} to={`${vocabularyPageRoute}?word=${encodeURIComponent(word.id)}`} className="reader-panel-row reader-saved-word"><strong>{word.term}</strong><span className="reader-panel-meta">{word.learningStatus === 'learned' ? 'Learned' : 'Learning'}</span></Link>)}
            </> : <>
                {!shownExplanations.length && <SidebarEmpty title={query ? 'No matching explanations' : 'Keep ideas in your own words'}>Use “Include comment in my explanations” in the question and comment composer.</SidebarEmpty>}
                {shownExplanations.map(note => <details key={note.id} className="reader-saved-note">
                    <summary><span className="reader-panel-meta">{mode === 'day' ? note.pageTitle : note.sectionTitle || 'This page'}</span><span className="reader-panel-summary">{note.body}</span></summary>
                    <div className="reader-saved-note-body"><blockquote className="reader-panel-quote">{note.selectedText}</blockquote><p>{note.body}</p></div>
                </details>)}
            </>)}
        </div>
    </div>;
});
