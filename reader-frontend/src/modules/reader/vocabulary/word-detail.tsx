import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import type { VocabularyUpdate } from '@domain/vocabulary/models/db-vocabulary';
import { saveVocabularyExplanation, updateVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { Button } from '@modules/core/ui/primitives/button';
import { ConfirmationDialog } from '@modules/core/ui/components/confirmation-dialog';
import { VocabularyMarkdown } from './markdown';

export type NavigationGuard = (action: () => void) => void;
const draftSchema = z.object({
    version: z.number().int().positive(), explanation: z.string().max(20000), practice: z.string().max(5000),
    baseExplanation: z.string().nullable(), basePractice: z.string(),
});
function readDraft(key: string) {
    try { const value = sessionStorage.getItem(key); return value ? draftSchema.parse(JSON.parse(value)) : null; }
    catch { return null; }
}
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function WordDetail({ word, userId, guard, onUpdated, onDelete, onReload, onBack, onMove, position, count, canNext }: {
    word: Vocabulary; userId: string; guard: RefObject<NavigationGuard>;
    onUpdated: (word: Vocabulary) => void; onDelete: () => void; onReload: () => void;
    onBack: () => void; onMove: (delta: number) => void; position: number; count: number; canNext: boolean;
}) {
    const key = `reader:vocabulary-draft:${userId}:${word.id}`;
    const [restored] = useState(() => readDraft(key));
    const [base, setBase] = useState<Vocabulary>(() => restored ? { ...word, version: restored.version, explanationMarkdown: restored.baseExplanation, practiceText: restored.basePractice } : word);
    const [explanation, setExplanation] = useState(restored?.explanation ?? word.explanationMarkdown ?? '');
    const [practice, setPractice] = useState(restored?.practice ?? word.practiceText);
    const [editing, setEditing] = useState(Boolean(restored && restored.explanation !== (restored.baseExplanation ?? '')));
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [error, setError] = useState<string | null>(restored ? 'Your unsaved draft has been restored. Reload the word if it has changed elsewhere.' : null);
    const [storageError, setStorageError] = useState(false);
    const [discard, setDiscard] = useState<(() => void) | null>(null);
    const [discardAll, setDiscardAll] = useState(true);
    const navigate = useNavigate();
    const explanationDirty = explanation !== (base.explanationMarkdown ?? '');
    const practiceDirty = practice !== base.practiceText;
    const dirty = explanationDirty || practiceDirty;
    const removeDraft = () => { try { sessionStorage.removeItem(key); } catch { /* beforeunload still protects the editor */ } };

    useEffect(() => {
        try {
            if (dirty) sessionStorage.setItem(key, JSON.stringify({ version: base.version, explanation, practice, baseExplanation: base.explanationMarkdown, basePractice: base.practiceText }));
            else sessionStorage.removeItem(key);
            setStorageError(false);
        } catch { setStorageError(true); }
    }, [key, dirty, explanation, practice, base]);

    useEffect(() => {
        const protect: NavigationGuard = action => {
            if (busyRef.current) return;
            if (dirty) { setDiscardAll(true); setDiscard(() => action); }
            else action();
        };
        guard.current = protect;
        const unload = (event: BeforeUnloadEvent) => { if (dirty || busyRef.current) { event.preventDefault(); event.returnValue = ''; } };
        const links = (event: MouseEvent) => {
            if (!dirty && !busyRef.current) return;
            const anchor = event.target instanceof Element ? event.target.closest('a') : null;
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
            const url = new URL(anchor.href);
            if (url.pathname === location.pathname && url.search === location.search) return;
            event.preventDefault(); event.stopPropagation();
            protect(() => { if (url.origin === location.origin) navigate(`${url.pathname}${url.search}${url.hash}`); else location.assign(url.href); });
        };
        window.addEventListener('beforeunload', unload);
        document.addEventListener('click', links, true);
        return () => { guard.current = action => action(); window.removeEventListener('beforeunload', unload); document.removeEventListener('click', links, true); };
    }, [guard, dirty, navigate]);

    const update = async (changes: Omit<VocabularyUpdate, 'expectedVersion'>) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setError(null);
        const result = await updateVocabulary(base.id, { ...changes, expectedVersion: base.version });
        busyRef.current = false; setBusy(false);
        if (!result.ok) { setError(result.error.message); return; }
        setBase(result.data); onUpdated(result.data);
    };
    const saveExplanation = async () => {
        if (busyRef.current || !explanation.trim()) return;
        busyRef.current = true; setBusy(true); setError(null);
        const result = await saveVocabularyExplanation(base.id, base.version, explanation);
        busyRef.current = false; setBusy(false);
        if (!result.ok) { setError(result.error.message); return; }
        setBase(result.data); setExplanation(result.data.explanationMarkdown ?? ''); setEditing(false); onUpdated(result.data);
    };

    return <article className="vocabulary-detail" aria-label={`Learn ${base.term}`}>
        <header className="vocabulary-word-header">
            <Button className="vocabulary-mobile-back" variant="ghost" size="sm" iconOnly aria-label="Back to words" onClick={() => guard.current(onBack)}><ArrowLeft size={16} /></Button>
            <h1>{base.term}</h1>
            <div className="vocabulary-word-tools">
                <span className="vocabulary-muted" aria-live="polite">{position > 0 ? `${position} / ${count}` : 'Saved word'}</span>
                <Button variant="outlined" size="sm" iconOnly aria-label="Previous word" disabled={position <= 1 || busy} onClick={() => guard.current(() => onMove(-1))}><ChevronLeft size={16} /></Button>
                <Button variant="outlined" size="sm" iconOnly aria-label="Next word" disabled={!canNext || busy} onClick={() => guard.current(() => onMove(1))}><ChevronRight size={16} /></Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Reload word" title="Reload word" disabled={busy} onClick={() => guard.current(onReload)}><RefreshCw size={15} /></Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Delete word" title="Delete word" disabled={busy} onClick={() => guard.current(onDelete)}><Trash2 size={15} /></Button>
            </div>
        </header>
        <div className="vocabulary-labels">
            <label>Difficulty<select aria-label="Difficulty" value={base.difficulty} disabled={busy || dirty} onChange={e => void update({ difficulty: e.target.value as Vocabulary['difficulty'] })}>{['unrated', 'easy', 'medium', 'difficult'].map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
            <label>Usage<select aria-label="Usage frequency" value={base.usageFrequency} disabled={busy || dirty} onChange={e => void update({ usageFrequency: e.target.value as Vocabulary['usageFrequency'] })}>{['unrated', 'frequent', 'occasional', 'rare'].map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
            <Button variant="outlined" size="sm" disabled={busy || dirty} onClick={() => void update({ learningStatus: base.learningStatus === 'learning' ? 'learned' : 'learning', reviewed: true })}>{base.learningStatus === 'learning' ? 'Mark learned' : 'Review again'}</Button>
            <span className="vocabulary-muted">Saved {base.createdAt.toLocaleDateString()}</span>
        </div>
        {error && <p role="alert" className="vocabulary-error">{error}</p>}
        {storageError && dirty && <p role="alert" className="vocabulary-error">This browser can’t keep a draft. Save your changes before leaving.</p>}
        <section className="vocabulary-explanation">
            <div className="vocabulary-section-title"><h2>Meaning and use</h2>
                {!editing && base.explanationMarkdown && <Button variant="ghost" size="sm" iconOnly aria-label="Edit explanation" title="Edit explanation" disabled={busy} onClick={() => setEditing(true)}><Pencil size={15} /></Button>}
            </div>
            {editing ? <>
                <label className="sr-only" htmlFor="vocabulary-explanation">Explanation Markdown</label>
                <textarea id="vocabulary-explanation" className="vocabulary-markdown-input" value={explanation} maxLength={20000} onChange={e => setExplanation(e.target.value)} disabled={busy} placeholder="Write a meaning, examples and useful phrases…" />
                <div className="vocabulary-editor-actions">
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => {
                        const cancel = () => { setExplanation(base.explanationMarkdown ?? ''); setEditing(false); };
                        if (explanationDirty) { setDiscardAll(false); setDiscard(() => cancel); } else cancel();
                    }}>Cancel</Button>
                    <Button size="sm" disabled={busy || !explanationDirty || !explanation.trim()} loading={busy} onClick={() => void saveExplanation()}>Save explanation</Button>
                </div>
                {explanation && <div className="vocabulary-preview"><span className="vocabulary-muted">Preview</span><VocabularyMarkdown source={explanation} /></div>}
            </> : base.explanationMarkdown ? <VocabularyMarkdown source={base.explanationMarkdown} /> : <div className="vocabulary-empty-explanation">
                <p>No explanation yet.</p><p className="vocabulary-muted">Add one here, or ask your connected AI to explain your saved words.</p>
                <Button variant="outlined" size="sm" onClick={() => setEditing(true)}>Add explanation</Button>
            </div>}
        </section>
        <section className="vocabulary-practice">
            <label htmlFor="vocabulary-practice">Your sentence <span className="vocabulary-muted">Optional</span></label>
            <textarea id="vocabulary-practice" value={practice} maxLength={5000} disabled={busy} onChange={e => setPractice(e.target.value)} placeholder={`Try using “${base.term}” in a sentence.`} rows={3} />
            {practiceDirty && <div className="vocabulary-editor-actions"><Button size="sm" disabled={busy} onClick={() => void update({ practiceText: practice, reviewed: true })}>Save sentence</Button></div>}
        </section>
        <ConfirmationDialog open={Boolean(discard)} title="Discard unsaved changes?" description="Your saved explanation and sentence will stay unchanged." confirmLabel="Discard changes" pending={busy}
            onCancel={() => setDiscard(null)} onConfirm={() => {
                const action = discard; setDiscard(null); setExplanation(base.explanationMarkdown ?? '');
                if (discardAll) { removeDraft(); setPractice(base.practiceText); }
                action?.();
            }} />
    </article>;
}
