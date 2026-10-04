import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ListFilter, Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { readerPageRoute } from '@boot/routes';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import { VocabularySummarySchema, type VocabularyQuery, type VocabularySummary } from '@domain/vocabulary/models/db-vocabulary';
import { createVocabulary, deleteVocabulary, getVocabulary, readVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { useAuthStore } from '@modules/auth/provider/store';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { ReaderPageSearch } from '@modules/reader/search/page-search';
import { Button } from '@modules/core/ui/primitives/button';
import { ConfirmationDialog } from '@modules/core/ui/components/confirmation-dialog';
import { toast } from '@modules/core/ui/primitives/toast/toast';
import { localDay, savedDateRange, type DatePreset } from './filters';
import { WordDetail, type NavigationGuard } from './word-detail';
import './vocabulary.css';

type Filters = { difficulty: '' | Vocabulary['difficulty']; usageFrequency: '' | Vocabulary['usageFrequency']; learningStatus: '' | Vocabulary['learningStatus']; missingExplanation: boolean; sort: 'priority' | 'newest' };
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default observer(function VocabularyPage() {
    const auth = useAuthStore();
    return <VocabularyWorkspace key={auth.currentUser.id} />;
});

function VocabularyWorkspace() {
    const auth = useAuthStore();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const initialWord = useRef(params.get('word'));
    const guard = useRef<NavigationGuard>(action => action());
    const requestAction = useCallback((action: () => void) => guard.current(action), []);
    const [words, setWords] = useState<VocabularySummary[]>([]);
    const [selected, setSelected] = useState<Vocabulary | null>(null);
    const [editorKey, setEditorKey] = useState(0);
    const [showDetail, setShowDetail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [nextOffset, setNextOffset] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [querySearch, setQuerySearch] = useState('');
    const [preset, setPreset] = useState<DatePreset>('all');
    const [from, setFrom] = useState(() => localDay(new Date()));
    const [through, setThrough] = useState(() => localDay(new Date()));
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>({ difficulty: '', usageFrequency: '', learningStatus: '', missingExplanation: false, sort: 'priority' });
    const [refresh, setRefresh] = useState(0);
    const [newTerm, setNewTerm] = useState('');
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Vocabulary | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const listSequence = useRef(0), detailSequence = useRef(0);
    const selectedRef = useRef<Vocabulary | null>(null);
    const mutationRef = useRef(false);

    const select = useCallback(async (word: { id: string }, openDetail = true) => {
        const sequence = ++detailSequence.current;
        if (openDetail) setShowDetail(true);
        setReading(true); setError(null);
        const result = await readVocabulary(word.id);
        if (sequence !== detailSequence.current) return;
        setReading(false);
        if (result.ok) { selectedRef.current = result.data; setSelected(result.data); setEditorKey(k => k + 1); }
        else { setError(result.error.message); selectedRef.current = null; setSelected(null); }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => setQuerySearch(search), 200);
        return () => window.clearTimeout(timer);
    }, [search]);
    const query = useCallback((): VocabularyQuery => ({
        search: querySearch || undefined, ...savedDateRange(preset, from, through),
        difficulty: filters.difficulty || undefined, usageFrequency: filters.usageFrequency || undefined,
        learningStatus: filters.learningStatus || undefined, missingExplanation: filters.missingExplanation || undefined,
        sort: filters.sort, limit: 50,
    }), [querySearch, preset, from, through, filters]);

    useEffect(() => {
        const sequence = ++listSequence.current;
        ++detailSequence.current; setReading(false);
        setLoading(true); setError(null);
        let input: VocabularyQuery;
        try { input = query(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Choose a date range.'); setLoading(false); setWords([]); setSelected(null); selectedRef.current = null; setTotal(0); setNextOffset(null); return; }
        void getVocabulary(input).then(async result => {
            if (sequence !== listSequence.current) return;
            setLoading(false);
            if (!result.ok) { setError(result.error.message); return; }
            setWords(result.data.items); setTotal(result.data.total); setNextOffset(result.data.nextOffset);
            const requested = initialWord.current; initialWord.current = null;
            if (requested && !result.data.items.some(w => w.id === requested)) {
                setReading(true);
                const found = await readVocabulary(requested);
                if (sequence !== listSequence.current) return;
                if (found.ok) { void select(found.data); return; }
                setReading(false); setError(found.error.message);
            }
            const target = result.data.items.find(w => w.id === (requested ?? selectedRef.current?.id)) ?? result.data.items[0];
            if (target) {
                // Initial selection stays on the list on mobile; explicit choices open detail.
                void select(target, Boolean(requested));
            } else { selectedRef.current = null; setSelected(null); setShowDetail(false); }
        });
        return () => { ++listSequence.current; ++detailSequence.current; };
    }, [query, refresh, select]);

    const loadMore = useCallback(async (moveToNext = false) => {
        if (loading || nextOffset === null) return;
        const sequence = listSequence.current;
        setLoading(true); setError(null);
        const result = await getVocabulary({ ...query(), offset: nextOffset });
        if (sequence !== listSequence.current) return;
        setLoading(false);
        if (!result.ok) { setError(result.error.message); return; }
        const additions = result.data.items.filter(w => !words.some(old => old.id === w.id));
        setWords(old => [...old, ...additions]); setNextOffset(result.data.nextOffset); setTotal(result.data.total);
        if (moveToNext && additions[0]) void select(additions[0]);
    }, [loading, nextOffset, query, words, select]);
    const index = selected ? words.findIndex(w => w.id === selected.id) : -1;
    const move = useCallback((delta: number) => {
        if (loading || reading || deleteTarget) return;
        const target = words[index + delta];
        if (target) void select(target);
        else if (delta > 0 && nextOffset !== null) void loadMore(true);
    }, [loading, reading, deleteTarget, words, index, nextOffset, select, loadMore]);
    useEffect(() => {
        const keys = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('[role="dialog"]')) return;
            if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); requestAction(() => move(event.key === 'ArrowLeft' ? -1 : 1)); }
        };
        window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
    }, [move, requestAction]);

    const add = async () => {
        if (!newTerm.trim() || mutationRef.current) return;
        mutationRef.current = true; setAdding(true); setError(null);
        const result = await createVocabulary({ term: newTerm });
        mutationRef.current = false; setAdding(false);
        if (!result.ok) { setError(result.error.message); return; }
        setNewTerm(''); toast.success(result.data.created ? 'Word saved' : 'Already saved');
        // Keep active filters; a new word may be outside this list.
        initialWord.current = result.data.word.id; setRefresh(v => v + 1);
    };
    const remove = async () => {
        if (!deleteTarget || mutationRef.current) return;
        mutationRef.current = true; setDeleting(true); setDeleteError(null);
        const result = await deleteVocabulary({ vocabId: deleteTarget.id, expectedVersion: deleteTarget.version });
        mutationRef.current = false; setDeleting(false);
        if (!result.ok) { setDeleteError(result.error.message); return; }
        setDeleteTarget(null); selectedRef.current = null; setSelected(null); setRefresh(v => v + 1); toast.success('Word deleted');
    };
    const onUpdated = (word: Vocabulary) => {
        selectedRef.current = word; setSelected(word);
        const summary = VocabularySummarySchema.parse({ ...word, hasExplanation: Boolean(word.explanationMarkdown) });
        setWords(old => old.map(item => item.id === word.id ? summary : item));
        // Keep the current review queue until refresh, avoiding jumps mid-review.
    };
    const filterActive = Boolean(filters.difficulty || filters.usageFrequency || filters.learningStatus || filters.missingExplanation);
    return <div className="vocabulary-page">
        <AppBarLayout app="reader" breadcrumbs={<span>Vocabulary</span>} actions={<ReaderPageSearch onNavigate={path => requestAction(() => navigate(path))} />} />
        <div className={`vocabulary-workspace ${showDetail ? 'vocabulary-show-detail' : ''}`}>
            <aside className="vocabulary-list" aria-label="Saved words">
                <div className="vocabulary-list-heading"><h1><BookOpen size={18} /> Vocabulary</h1><Link to={readerPageRoute} title="Back to Reader" aria-label="Back to Reader"><ArrowLeft size={16} /></Link></div>
                <div className="vocabulary-list-controls">
                    <input aria-label="Search saved words" type="search" placeholder="Search words…" value={search} maxLength={255} onChange={e => { const value = e.target.value; requestAction(() => setSearch(value)); }} />
                    <div className="vocabulary-filter-toolbar">
                        <select aria-label="Saved date" value={preset} onChange={e => { const value = e.target.value as DatePreset; requestAction(() => setPreset(value)); }}>
                            {[['all', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom range']].map(([value, text]) => <option value={value} key={value}>{text}</option>)}
                        </select>
                        <Button variant="outlined" size="sm" iconOnly aria-label="Filter words" aria-expanded={filtersOpen} title="Filters" className={filterActive ? 'vocabulary-active-filter' : ''} onClick={() => setFiltersOpen(v => !v)}><ListFilter size={16} /></Button>
                        <Button variant="ghost" size="sm" iconOnly aria-label="Refresh words" disabled={loading || adding} onClick={() => requestAction(() => setRefresh(v => v + 1))}><RefreshCw size={15} /></Button>
                    </div>
                    {preset === 'custom' && <div className="vocabulary-date-range">
                        <label>From<input type="date" value={from} onChange={e => { const value = e.target.value; requestAction(() => setFrom(value)); }} /></label>
                        <label>Through<input type="date" value={through} onChange={e => { const value = e.target.value; requestAction(() => setThrough(value)); }} /></label>
                    </div>}
                    {filtersOpen && <div className="vocabulary-filters">
                        {(['learningStatus', 'difficulty', 'usageFrequency'] as const).map(field => <label key={field}>{field === 'learningStatus' ? 'Status' : field === 'difficulty' ? 'Difficulty' : 'Usage'}<select value={filters[field]} onChange={e => { const value = e.target.value; requestAction(() => setFilters(old => ({ ...old, [field]: value }))); }}>
                            <option value="">Any</option>{(field === 'learningStatus' ? ['learning', 'learned'] : field === 'difficulty' ? ['unrated', 'easy', 'medium', 'difficult'] : ['unrated', 'frequent', 'occasional', 'rare']).map(v => <option key={v} value={v}>{label(v)}</option>)}
                        </select></label>)}
                        <label>Order<select value={filters.sort} onChange={e => { const value = e.target.value as Filters['sort']; requestAction(() => setFilters(old => ({ ...old, sort: value }))); }}><option value="priority">Review priority</option><option value="newest">Newest first</option></select></label>
                        <label className="vocabulary-checkbox"><input type="checkbox" checked={filters.missingExplanation} onChange={e => { const checked = e.target.checked; requestAction(() => setFilters(old => ({ ...old, missingExplanation: checked }))); }} /> Needs explanation</label>
                    </div>}
                    <form className="vocabulary-add" onSubmit={e => { e.preventDefault(); requestAction(() => void add()); }}>
                        <input aria-label="New word or phrase" placeholder="Add a word…" value={newTerm} maxLength={255} onChange={e => setNewTerm(e.target.value)} disabled={adding} />
                        <Button type="submit" size="sm" iconOnly aria-label="Save word" disabled={!newTerm.trim() || adding} loading={adding}><Plus size={16} /></Button>
                    </form>
                </div>
                <div className="vocabulary-list-count" aria-live="polite">{words.length} of {total} words</div>
                <div className="vocabulary-word-list" aria-busy={loading}>
                    {error && <div className="vocabulary-list-error"><p role="alert">{error}</p><Button variant="outlined" size="sm" onClick={() => requestAction(() => setRefresh(v => v + 1))}>Retry</Button></div>}
                    {!loading && !error && !words.length && <p className="vocabulary-empty">No words here yet. Save one while reading, or add one above.</p>}
                    {words.map(word => <button type="button" key={word.id} aria-current={selected?.id === word.id ? 'true' : undefined} className="vocabulary-word-row" disabled={reading || adding || deleting} onClick={() => requestAction(() => void select(word))}>
                        <span>{word.term}</span><small>{word.learningStatus === 'learned' ? 'Learned' : !word.hasExplanation ? 'Needs explanation' : word.difficulty === 'difficult' ? 'Difficult' : 'Learning'}</small>
                    </button>)}
                    {loading && <p role="status" className="vocabulary-empty">Loading words…</p>}
                    {nextOffset !== null && <Button variant="ghost" size="sm" disabled={loading} onClick={() => requestAction(() => void loadMore())}>Load more</Button>}
                </div>
            </aside>
            <main className="vocabulary-main">
                {reading || loading ? <p role="status" className="vocabulary-empty">Loading words…</p> : selected ? <WordDetail key={`${selected.id}:${editorKey}`} word={selected} userId={auth.currentUser.id} guard={guard}
                    onUpdated={onUpdated} onDelete={() => { setDeleteError(null); setDeleteTarget(selected); }} onReload={() => void select(selected)} onBack={() => setShowDetail(false)}
                    onMove={move} position={index + 1} count={total} canNext={index >= 0 && (index < words.length - 1 || nextOffset !== null)} /> : <div className="vocabulary-start"><BookOpen size={28} /><h2>Your words, ready to learn</h2><p>Select a word to explore its meaning and practise using it.</p><Button className="vocabulary-mobile-back" variant="outlined" size="sm" onClick={() => setShowDetail(false)}>Back to words</Button></div>}
            </main>
        </div>
        <ConfirmationDialog open={Boolean(deleteTarget)} title={`Delete “${deleteTarget?.term ?? ''}”?`} description="This removes the word, its explanation and your practice sentence." confirmLabel="Delete word" pending={deleting} error={deleteError}
            onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>;
}
