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
import { Select } from '@modules/core/ui/primitives/select';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
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

export function VocabularyWorkspace() {
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
    const [addError, setAddError] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [boundaryError, setBoundaryError] = useState<{ message: string; offset: number; fromId: string | null } | null>(null);
    const [readTarget, setReadTarget] = useState<{ id: string; term?: string } | null>(null);
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
    const mounted = useRef(false), lifetime = useRef(0), morePending = useRef(false), replacementPending = useRef(false);
    const headingRef = useRef<HTMLHeadingElement>(null), errorHeadingRef = useRef<HTMLHeadingElement>(null), readingRef = useRef<HTMLParagraphElement>(null), searchRef = useRef<HTMLInputElement>(null);
    const rowRefs = useRef(new Map<string, HTMLButtonElement>()), focusDetail = useRef(false), focusList = useRef<string | null>(null);

    useEffect(() => { mounted.current = true; lifetime.current++; return () => { mounted.current = false; lifetime.current++; ++listSequence.current; ++detailSequence.current; }; }, []);
    useEffect(() => {
        if (!focusDetail.current || !showDetail) return;
        const target = reading ? readingRef.current : detailError ? errorHeadingRef.current : headingRef.current;
        target?.focus(); if (!reading && target) focusDetail.current = false;
    }, [reading, detailError, selected, editorKey, showDetail]);
    useEffect(() => {
        if (showDetail || !focusList.current) return;
        const id = focusList.current; focusList.current = null;
        const generation = lifetime.current;
        const frame = requestAnimationFrame(() => { if (mounted.current && generation === lifetime.current) (rowRefs.current.get(id) ?? searchRef.current)?.focus(); });
        return () => cancelAnimationFrame(frame);
    }, [showDetail, deleteTarget]);
    const back = () => { focusDetail.current = false; focusList.current = readTarget?.id ?? selectedRef.current?.id ?? ''; ++detailSequence.current; setReading(false); setBoundaryError(null); setShowDetail(false); };

    const select = useCallback(async (word: { id: string; term?: string }, openDetail = true) => {
        if (!mounted.current || mutationRef.current) return;
        const sequence = ++detailSequence.current;
        const generation = lifetime.current, current = () => mounted.current && generation === lifetime.current && sequence === detailSequence.current;
        if (openDetail) { focusDetail.current = true; setShowDetail(true); }
        setReadTarget(word); setReading(true); setDetailError(null); setBoundaryError(null);
        try {
            const result = await readVocabulary(word.id);
            if (!current()) return;
            if (result.ok) { selectedRef.current = result.data; setSelected(result.data); setReadTarget(result.data); setEditorKey(k => k + 1); }
            else setDetailError(result.error.message);
        } catch (cause) { if (current()) setDetailError(cause instanceof Error ? cause.message : 'Couldn’t load this word.'); }
        finally { if (current()) setReading(false); }
    }, []);

    useEffect(() => {
        if (mutationRef.current) return;
        const timer = window.setTimeout(() => setQuerySearch(search), 200);
        return () => window.clearTimeout(timer);
    }, [search, adding, deleting]);
    const query = useCallback((): VocabularyQuery => ({
        search: querySearch || undefined, ...savedDateRange(preset, from, through),
        difficulty: filters.difficulty || undefined, usageFrequency: filters.usageFrequency || undefined,
        learningStatus: filters.learningStatus || undefined, missingExplanation: filters.missingExplanation || undefined,
        sort: filters.sort, limit: 50,
    }), [querySearch, preset, from, through, filters]);

    useEffect(() => {
        if (mutationRef.current) return;
        const sequence = ++listSequence.current;
        replacementPending.current = true;
        ++detailSequence.current; setReading(false);
        morePending.current = false;
        setLoading(true); setError(null); setBoundaryError(null);
        let input: VocabularyQuery;
        try { input = query(); }
        catch (cause) { replacementPending.current = false; setError(cause instanceof Error ? cause.message : 'Choose a date range.'); setLoading(false); setWords([]); setSelected(null); selectedRef.current = null; setTotal(0); setNextOffset(null); return; }
        void getVocabulary(input).then(async result => {
            if (!mounted.current || sequence !== listSequence.current) return;
            replacementPending.current = false;
            setLoading(false);
            if (!result.ok) { setError(result.error.message); return; }
            setWords(result.data.items); setTotal(result.data.total); setNextOffset(result.data.nextOffset);
            const requested = initialWord.current; initialWord.current = null;
            const guardedSelection = (action: () => void) => requestAction(() => { if (mounted.current && sequence === listSequence.current) action(); });
            if (requested && !result.data.items.some(w => w.id === requested)) { guardedSelection(() => void select({ id: requested })); return; }
            const target = result.data.items.find(w => w.id === (requested ?? selectedRef.current?.id)) ?? result.data.items[0];
            if (target) {
                // Refreshing the queue must not replace a draft that was started
                // while the request was pending. Reload word is explicit.
                if (!requested && target.id === selectedRef.current?.id) return;
                // Initial selection stays on the list on mobile; explicit choices open detail.
                guardedSelection(() => void select(target, Boolean(requested)));
            } else guardedSelection(() => { selectedRef.current = null; setSelected(null); setReadTarget(null); setDetailError(null); setShowDetail(false); });
        }).catch(cause => { if (mounted.current && sequence === listSequence.current) { replacementPending.current = false; setLoading(false); setError(cause instanceof Error ? cause.message : 'Couldn’t load saved words.'); } });
        return () => { ++listSequence.current; ++detailSequence.current; };
    }, [query, refresh, select, requestAction, adding, deleting]);

    const loadMore = useCallback(async (moveToNext = false) => {
        if (!mounted.current || loading || morePending.current || mutationRef.current || nextOffset === null) return;
        const sequence = listSequence.current;
        const boundary = { offset: nextOffset, fromId: selectedRef.current?.id ?? null }, navigationSequence = detailSequence.current;
        morePending.current = true;
        setLoading(true); setError(null); setBoundaryError(null);
        const current = () => mounted.current && sequence === listSequence.current;
        const report = (message: string) => { if (moveToNext) { if (navigationSequence === detailSequence.current) setBoundaryError({ ...boundary, message }); } else setError(message); };
        try {
            const result = await getVocabulary({ ...query(), offset: nextOffset });
            if (!current()) return;
            if (!result.ok) { report(result.error.message); return; }
            const additions = result.data.items.filter(w => !words.some(old => old.id === w.id));
            setWords(old => [...old, ...additions.filter(word => !old.some(item => item.id === word.id))]); setNextOffset(result.data.nextOffset); setTotal(result.data.total);
            if (moveToNext && additions[0] && navigationSequence === detailSequence.current) requestAction(() => { if (current() && navigationSequence === detailSequence.current) void select(additions[0]); });
        } catch (cause) { if (current()) report(cause instanceof Error ? cause.message : 'Couldn’t load more words.'); }
        finally { if (current()) { morePending.current = false; setLoading(false); } }
    }, [loading, nextOffset, query, words, select, requestAction]);
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
        if (!mounted.current || !newTerm.trim() || mutationRef.current) return;
        const term = newTerm, generation = lifetime.current, current = () => mounted.current && generation === lifetime.current;
        mutationRef.current = true; setAdding(true); setAddError(null);
        ++listSequence.current; ++detailSequence.current; morePending.current = false; setLoading(false); setReading(false);
        try {
            const result = await createVocabulary({ term });
            if (!current()) return;
            if (!result.ok) { setAddError(result.error.message); return; }
            setNewTerm(value => value === term ? '' : value); toast.success(result.data.created ? 'Word saved' : 'Already saved');
            // Keep active filters; a new word may be outside this list.
            initialWord.current = result.data.word.id; setRefresh(v => v + 1);
        } catch (cause) { if (current()) setAddError(cause instanceof Error ? cause.message : 'Couldn’t save this word.'); }
        finally { if (current()) { mutationRef.current = false; setAdding(false); } }
    };
    const remove = async () => {
        if (!mounted.current || !deleteTarget || mutationRef.current) return;
        const target = deleteTarget, generation = lifetime.current, current = () => mounted.current && generation === lifetime.current;
        mutationRef.current = true; setDeleting(true); setDeleteError(null);
        ++listSequence.current; ++detailSequence.current; morePending.current = false; setLoading(false); setReading(false);
        try {
            const result = await deleteVocabulary({ vocabId: target.id, expectedVersion: target.version });
            if (!current()) return;
            if (!result.ok) { setDeleteError(result.error.message); return; }
            const targetIndex = words.findIndex(word => word.id === target.id), remaining = words.filter(word => word.id !== target.id);
            focusList.current = remaining[Math.min(Math.max(targetIndex, 0), remaining.length - 1)]?.id ?? '__search__'; focusDetail.current = false;
            setWords(remaining); setTotal(value => Math.max(0, value - 1));
            setDeleteTarget(null); selectedRef.current = null; setSelected(null); setReadTarget(null); setDetailError(null); setShowDetail(false);
            setRefresh(v => v + 1); toast.success('Word deleted');
        } catch (cause) { if (current()) setDeleteError(cause instanceof Error ? cause.message : 'Couldn’t delete this word.'); }
        finally { if (current()) { mutationRef.current = false; setDeleting(false); } }
    };
    const onUpdated = (word: Vocabulary) => {
        if (!mounted.current) return;
        const refreshReplacement = replacementPending.current;
        // Reads started before an acknowledged edit cannot restore older data.
        ++listSequence.current; ++detailSequence.current; morePending.current = false; replacementPending.current = false; setLoading(false); setReading(false);
        selectedRef.current = word; setSelected(word);
        const summary = VocabularySummarySchema.parse({ ...word, hasExplanation: Boolean(word.explanationMarkdown) });
        setWords(old => old.map(item => item.id === word.id ? summary : item));
        if (refreshReplacement) setRefresh(value => value + 1);
        // Keep the current review queue until refresh, avoiding jumps mid-review.
    };
    const filterActive = Boolean(filters.difficulty || filters.usageFrequency || filters.learningStatus || filters.missingExplanation);
    const filtered = Boolean(querySearch.trim() || preset !== 'all' || filterActive);
    const clearFilters = () => requestAction(() => { setSearch(''); setQuerySearch(''); setPreset('all'); setFilters({ difficulty: '', usageFrequency: '', learningStatus: '', missingExplanation: false, sort: 'priority' }); searchRef.current?.focus(); });
    return <div className="vocabulary-page">
        <AppBarLayout app="reader" breadcrumbs={<span>Vocabulary</span>} actions={<ReaderPageSearch onNavigate={path => requestAction(() => navigate(path))} />} />
        <div className={`vocabulary-workspace ${showDetail ? 'vocabulary-show-detail' : ''}`}>
            <aside className="vocabulary-list" aria-label="Saved words">
                <div className="vocabulary-list-heading"><h1><BookOpen size={18} /> Vocabulary</h1><Tooltip content="Back to Reader"><Link to={readerPageRoute} aria-label="Back to Reader"><ArrowLeft size={16} /></Link></Tooltip></div>
                <fieldset className="vocabulary-list-controls" disabled={adding || deleting} aria-label="Word filters and quick add">
                    <input ref={searchRef} aria-label="Search saved words" type="search" placeholder="Search words…" value={search} maxLength={255} onChange={e => { const value = e.target.value; requestAction(() => setSearch(value)); }} />
                    <div className="vocabulary-filter-toolbar">
                        <Select<DatePreset> ariaLabel="Saved date" value={preset} items={{ all: 'All time', today: 'Today', yesterday: 'Yesterday', week: 'This week', month: 'This month', custom: 'Custom range' }} className="vocabulary-select" popupClassName="vocabulary-select-popup" onValueChange={value => { if (value !== null) requestAction(() => setPreset(value)); }} />
                        <Button variant="outlined" size="sm" iconOnly aria-label="Filter words" aria-expanded={filtersOpen} tooltip="Filter words" className={filterActive ? 'vocabulary-active-filter' : ''} onClick={() => setFiltersOpen(v => !v)}><ListFilter size={16} /></Button>
                        <Button variant="ghost" size="sm" iconOnly aria-label="Refresh words" tooltip="Refresh words" disabled={loading || adding || deleting} onClick={() => requestAction(() => setRefresh(v => v + 1))}><RefreshCw size={15} /></Button>
                    </div>
                    {preset === 'custom' && <div className="vocabulary-date-range">
                        <label>From<input type="date" value={from} onChange={e => { const value = e.target.value; requestAction(() => setFrom(value)); }} /></label>
                        <label>Through<input type="date" value={through} onChange={e => { const value = e.target.value; requestAction(() => setThrough(value)); }} /></label>
                    </div>}
                    {filtersOpen && <div className="vocabulary-filters">
                        {(['learningStatus', 'difficulty', 'usageFrequency'] as const).map(field => <div className="vocabulary-filter-field" key={field}><span>{field === 'learningStatus' ? 'Status' : field === 'difficulty' ? 'Difficulty' : 'Usage'}</span><Select ariaLabel={field === 'learningStatus' ? 'Filter learning status' : field === 'difficulty' ? 'Filter difficulty' : 'Filter usage'} value={filters[field]} items={Object.fromEntries([['', 'Any'], ...(field === 'learningStatus' ? ['learning', 'learned'] : field === 'difficulty' ? ['unrated', 'easy', 'medium', 'difficult'] : ['unrated', 'frequent', 'occasional', 'rare']).map(value => [value, label(value)])])} className="vocabulary-select" popupClassName="vocabulary-select-popup" onValueChange={value => { if (value !== null) requestAction(() => setFilters(old => ({ ...old, [field]: value }))); }} /></div>)}
                        <div className="vocabulary-filter-field"><span>Order</span><Select<Filters['sort']> ariaLabel="Word order" value={filters.sort} items={{ priority: 'Review priority', newest: 'Newest first' }} className="vocabulary-select" popupClassName="vocabulary-select-popup" onValueChange={value => { if (value !== null) requestAction(() => setFilters(old => ({ ...old, sort: value }))); }} /></div>
                        <label className="vocabulary-checkbox"><input type="checkbox" checked={filters.missingExplanation} onChange={e => { const checked = e.target.checked; requestAction(() => setFilters(old => ({ ...old, missingExplanation: checked }))); }} /> Needs explanation</label>
                    </div>}
                    <form className="vocabulary-add" onSubmit={e => { e.preventDefault(); requestAction(() => void add()); }}>
                        <input aria-label="New word or phrase" placeholder="Add a word…" value={newTerm} maxLength={255} onChange={e => setNewTerm(e.target.value)} disabled={adding} />
                        <Button type="submit" size="sm" iconOnly aria-label="Save word" tooltip="Save word" disabled={!newTerm.trim() || adding || deleting} loading={adding}><Plus size={16} /></Button>
                    </form>
                    {addError && <p role="alert" className="vocabulary-add-error">{addError}</p>}
                </fieldset>
                <div className="vocabulary-list-count" aria-live="polite">{words.length} of {total} words</div>
                <div className="vocabulary-word-list" aria-busy={loading}>
                    {error && <div className="vocabulary-list-error"><p role="alert">{error}</p><Button variant="outlined" size="sm" onClick={() => requestAction(() => setRefresh(v => v + 1))}>Retry</Button></div>}
                    {!loading && !error && !words.length && <div className="vocabulary-empty">{filtered ? <><p>No words match these filters.</p><Button variant="outlined" size="sm" onClick={clearFilters}>Clear filters</Button></> : <p>No saved words yet. Save one while reading, or add one above.</p>}</div>}
                    {words.map(word => <button ref={node => { if (node) rowRefs.current.set(word.id, node); else rowRefs.current.delete(word.id); }} type="button" key={word.id} aria-current={(readTarget?.id ?? selected?.id) === word.id ? 'true' : undefined} className="vocabulary-word-row" disabled={adding || deleting} onClick={() => requestAction(() => void select(word))}>
                        <span>{word.term}</span><small>{word.learningStatus === 'learned' ? 'Learned' : !word.hasExplanation ? 'Needs explanation' : word.difficulty === 'difficult' ? 'Difficult' : 'Learning'}</small>
                    </button>)}
                    {loading && <p role="status" className="vocabulary-empty">Loading words…</p>}
                    {nextOffset !== null && <Button variant="ghost" size="sm" disabled={loading} onClick={() => requestAction(() => void loadMore())}>Load more</Button>}
                </div>
            </aside>
            <main className="vocabulary-main">
                {boundaryError && <div className="vocabulary-navigation-error"><p role="alert">Couldn’t load the next word. {boundaryError.message}</p><Button variant="outlined" size="sm" disabled={loading} onClick={() => requestAction(() => { if (boundaryError.offset === nextOffset && boundaryError.fromId === selectedRef.current?.id) void loadMore(true); })}>Retry next word</Button></div>}
                {reading ? <div className="vocabulary-detail-state"><p ref={readingRef} tabIndex={-1} role="status">Loading {readTarget?.term ? `“${readTarget.term}”` : 'word'}…</p><Button className="vocabulary-mobile-back" variant="outlined" size="sm" onClick={back}>Back to words</Button></div> : detailError && readTarget ? <section className="vocabulary-detail-state"><h1 ref={errorHeadingRef} tabIndex={-1}>Couldn’t open {readTarget.term ? `“${readTarget.term}”` : 'this word'}</h1><p role="alert">{detailError}</p><div><Button variant="outlined" size="sm" onClick={() => void select(readTarget)}>Retry word</Button><Button variant="ghost" size="sm" onClick={back}>Back to words</Button></div></section> : selected ? <WordDetail key={`${selected.id}:${editorKey}`} word={selected} userId={auth.currentUser.id} guard={guard} headingRef={headingRef}
                    onUpdated={onUpdated} onDelete={() => { setDeleteError(null); setDeleteTarget(selected); }} onReload={() => void select(selected)} onBack={back}
                    onMove={move} position={index + 1} count={total} canNext={index >= 0 && (index < words.length - 1 || nextOffset !== null)} /> : <div className="vocabulary-start"><BookOpen size={28} /><h2>Your words, ready to learn</h2><p>Select a word to explore its meaning and practise using it.</p><Button className="vocabulary-mobile-back" variant="outlined" size="sm" onClick={back}>Back to words</Button></div>}
            </main>
        </div>
        <ConfirmationDialog open={Boolean(deleteTarget)} title={`Delete “${deleteTarget?.term ?? ''}”?`} description="This removes the word, its explanation and your practice sentence." confirmLabel="Delete word" pending={deleting} error={deleteError}
            onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>;
}
