import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { Vocabulary } from '@domain/vocabulary/models/vocabulary';
import type { VocabularyUpdate } from '@domain/vocabulary/models/db-vocabulary';
import { saveVocabularyExplanation, updateVocabulary } from '@domain/vocabulary/services/vocabulary-service';
import { Button } from '@modules/core/ui/primitives/button';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';
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

type WordDetailProps = {
    word: Vocabulary; userId: string; guard: RefObject<NavigationGuard>; headingRef?: RefObject<HTMLHeadingElement | null>;
    onUpdated: (word: Vocabulary) => void; onDelete: () => void; onReload: () => void;
    onBack: () => void; onMove: (delta: number) => void; position: number; count: number; canNext: boolean;
};
export function WordDetail(props: WordDetailProps) {
    return <WordDetailSession key={`${props.userId}:${props.word.id}`} {...props} />;
}
function WordDetailSession({ word, userId, guard, headingRef, onUpdated, onDelete, onReload, onBack, onMove, position, count, canNext }: WordDetailProps) {
    const key = `reader:vocabulary-draft:${userId}:${word.id}`;
    const [restored] = useState(() => readDraft(key));
    const [base, setBase] = useState<Vocabulary>(() => restored ? { ...word, version: restored.version, explanationMarkdown: restored.baseExplanation, practiceText: restored.basePractice } : word);
    const [explanation, setExplanation] = useState(restored?.explanation ?? word.explanationMarkdown ?? '');
    const [practice, setPractice] = useState(restored?.practice ?? word.practiceText);
    const [editing, setEditing] = useState(Boolean(restored && restored.explanation !== (restored.baseExplanation ?? '')));
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [showRestored, setShowRestored] = useState(Boolean(restored));
    const [storageError, setStorageError] = useState(false);
    const [discard, setDiscard] = useState<(() => void) | null>(null);
    const [discardAll, setDiscardAll] = useState(true);
    const navigate = useNavigate();
    const id = useId(), alive = useRef(true), generation = useRef(0);
    const explanationRef = useRef<HTMLTextAreaElement>(null), practiceRef = useRef<HTMLTextAreaElement>(null), editRef = useRef<HTMLButtonElement>(null), errorRef = useRef<HTMLParagraphElement>(null);
    const lastField = useRef<HTMLElement | null>(null), discardReturn = useRef<'field' | 'edit' | 'navigation'>('field');
    const focusAfterSave = useRef<'edit' | 'practice' | null>(null);
    useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; }; }, []);
    useLayoutEffect(() => {
        if (busy) return;
        if (focusAfterSave.current) {
            (focusAfterSave.current === 'edit' ? editRef.current : practiceRef.current)?.focus(); focusAfterSave.current = null;
        } else if (editing) explanationRef.current?.focus();
    }, [editing, busy]);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
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
            if (dirty) { discardReturn.current = 'field'; setDiscardAll(true); setDiscard(() => action); }
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

    function begin() {
        if (!alive.current || busyRef.current) return null;
        busyRef.current = true; setBusy(true); setError(null);
        return ++generation.current;
    }
    const current = (token: number) => alive.current && generation.current === token;
    function finish(token: number) { if (current(token)) { busyRef.current = false; setBusy(false); } }
    const update = async (changes: Omit<VocabularyUpdate, 'expectedVersion'>) => {
        const token = begin(); if (token === null) return;
        const snapshot = { ...changes, expectedVersion: base.version }, wordId = base.id;
        const keepExplanation = explanationDirty, keepPractice = practiceDirty;
        try {
            const result = await updateVocabulary(wordId, snapshot); if (!current(token)) return;
            if (!result.ok) { setError(result.error.message); return; }
            setBase(result.data);
            if (!keepExplanation) setExplanation(result.data.explanationMarkdown ?? '');
            if (changes.practiceText !== undefined || !keepPractice) setPractice(result.data.practiceText);
            setShowRestored(false);
            if (changes.practiceText !== undefined) focusAfterSave.current = 'practice';
            onUpdated(result.data);
        } catch (cause) { if (current(token)) setError(cause instanceof Error ? cause.message : 'Couldn’t save this word. Try again.'); }
        finally { finish(token); }
    };
    const saveExplanation = async () => {
        if (!explanation.trim()) return;
        const token = begin(); if (token === null) return;
        const snapshot = explanation, wordId = base.id, version = base.version, keepPractice = practiceDirty;
        try {
            const result = await saveVocabularyExplanation(wordId, version, snapshot); if (!current(token)) return;
            if (!result.ok) { setError(result.error.message); return; }
            setBase(result.data); setExplanation(result.data.explanationMarkdown ?? '');
            if (!keepPractice) setPractice(result.data.practiceText);
            setEditing(false); setShowRestored(false); focusAfterSave.current = 'edit'; onUpdated(result.data);
        } catch (cause) { if (current(token)) setError(cause instanceof Error ? cause.message : 'Couldn’t save the explanation. Try again.'); }
        finally { finish(token); }
    };

    return <article className="vocabulary-detail" aria-label={`Learn ${base.term}`} onFocusCapture={event => { if ((event.target as HTMLElement).matches('textarea')) lastField.current = event.target as HTMLElement; }}>
        <header className="vocabulary-word-header">
            <Button className="vocabulary-mobile-back" variant="ghost" size="sm" iconOnly disabled={busy} aria-label="Back to words" tooltip="Back to words" onClick={() => guard.current(onBack)}><ArrowLeft size={16} /></Button>
            <h1 ref={headingRef} tabIndex={-1}>{base.term}</h1>
            <div className="vocabulary-word-tools">
                <span className="vocabulary-muted" aria-live="polite">{position > 0 ? `${position} / ${count}` : 'Saved word'}</span>
                <Button variant="outlined" size="sm" iconOnly aria-label="Previous word" tooltip="Previous word" disabled={position <= 1 || busy} onClick={() => guard.current(() => onMove(-1))}><ChevronLeft size={16} /></Button>
                <Button variant="outlined" size="sm" iconOnly aria-label="Next word" tooltip="Next word" disabled={!canNext || busy} onClick={() => guard.current(() => onMove(1))}><ChevronRight size={16} /></Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Reload word" tooltip="Reload word" disabled={busy} onClick={() => guard.current(onReload)}><RefreshCw size={15} /></Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Delete word" tooltip="Delete word" disabled={busy} onClick={() => guard.current(onDelete)}><Trash2 size={15} /></Button>
            </div>
        </header>
        <div className="vocabulary-labels">
            <label>Difficulty<Select ariaLabel="Difficulty" tooltip="Word difficulty" className="vocabulary-select" popupClassName="vocabulary-select-popup" value={base.difficulty} disabled={busy || dirty} items={Object.fromEntries(['unrated', 'easy', 'medium', 'difficult'].map(value => [value, label(value)]))} onValueChange={value => { if (value && !busyRef.current && !dirty) void update({ difficulty: value as Vocabulary['difficulty'] }); }} /></label>
            <label>Usage<Select ariaLabel="Usage frequency" tooltip="Usage frequency" className="vocabulary-select" popupClassName="vocabulary-select-popup" value={base.usageFrequency} disabled={busy || dirty} items={Object.fromEntries(['unrated', 'frequent', 'occasional', 'rare'].map(value => [value, label(value)]))} onValueChange={value => { if (value && !busyRef.current && !dirty) void update({ usageFrequency: value as Vocabulary['usageFrequency'] }); }} /></label>
            <Button variant="outlined" size="sm" disabled={busy || dirty} onClick={() => void update({ learningStatus: base.learningStatus === 'learning' ? 'learned' : 'learning', reviewed: true })}>{base.learningStatus === 'learning' ? 'Mark learned' : 'Review again'}</Button>
            <span className="vocabulary-muted">Saved {base.createdAt.toLocaleDateString()}</span>
        </div>
        {showRestored && <p role="status" className="vocabulary-info">Your unsaved draft has been restored. Save it when you’re ready, or reload the word to review the latest saved version.</p>}
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="vocabulary-error">{error}</p>}
        {storageError && dirty && <p role="alert" className="vocabulary-error">This browser can’t keep a draft. Save your changes before leaving.</p>}
        <section className="vocabulary-explanation">
            <div className="vocabulary-section-title"><h2>Meaning and use</h2>
                {!editing && base.explanationMarkdown && <Button variant="ghost" size="sm" ref={editRef} iconOnly aria-label="Edit explanation" tooltip="Edit explanation" disabled={busy} onClick={() => { if (!busyRef.current) setEditing(true); }}><Pencil size={15} /></Button>}
            </div>
            {editing ? <>
                <label className="sr-only" htmlFor={`${id}-explanation`}>Explanation Markdown</label>
                <textarea ref={explanationRef} id={`${id}-explanation`} className="vocabulary-markdown-input" value={explanation} maxLength={20000} onChange={e => { if (!busyRef.current) setExplanation(e.target.value); }} disabled={busy} placeholder="Write a meaning, examples and useful phrases…" />
                <div className="vocabulary-editor-actions">
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => {
                        if (busyRef.current) return;
                        const cancel = () => { setExplanation(base.explanationMarkdown ?? ''); setEditing(false); focusAfterSave.current = 'edit'; };
                        if (explanationDirty) { discardReturn.current = 'field'; setDiscardAll(false); setDiscard(() => cancel); } else cancel();
                    }}>Cancel</Button>
                    <Button size="sm" disabled={busy || !explanationDirty || !explanation.trim()} loading={busy} onClick={() => void saveExplanation()}>Save explanation</Button>
                </div>
                {explanation && <div className="vocabulary-preview"><span className="vocabulary-muted">Preview</span><VocabularyMarkdown source={explanation} /></div>}
            </> : base.explanationMarkdown ? <VocabularyMarkdown source={base.explanationMarkdown} /> : <div className="vocabulary-empty-explanation">
                <p>No explanation yet.</p><p className="vocabulary-muted">Add one here, or ask your connected AI to explain your saved words.</p>
                <Button ref={editRef} variant="outlined" size="sm" disabled={busy} onClick={() => { if (!busyRef.current) setEditing(true); }}>Add explanation</Button>
            </div>}
        </section>
        <section className="vocabulary-practice">
            <label htmlFor={`${id}-practice`}>Your sentence <span className="vocabulary-muted">Optional</span></label>
            <textarea ref={practiceRef} id={`${id}-practice`} value={practice} maxLength={5000} disabled={busy} onChange={e => { if (!busyRef.current) setPractice(e.target.value); }} placeholder={`Try using “${base.term}” in a sentence.`} rows={3} />
            {practiceDirty && <div className="vocabulary-editor-actions"><Button size="sm" disabled={busy} onClick={() => void update({ practiceText: practice, reviewed: true })}>Save sentence</Button></div>}
        </section>
        {discard && <WordDiscardDialog onKeep={() => { discardReturn.current = 'field'; setDiscard(null); }} finalFocus={() => {
            if (!alive.current || discardReturn.current === 'navigation') return false;
            if (discardReturn.current === 'edit') return editRef.current ?? false;
            if (lastField.current?.isConnected && !lastField.current.matches(':disabled')) return lastField.current;
            // Saving one field can remove its textarea while the other draft
            // still needs a navigation decision. Return to that surviving draft.
            if (practiceDirty && practiceRef.current) return practiceRef.current;
            if (explanationDirty && explanationRef.current) return explanationRef.current;
            return editRef.current ?? practiceRef.current ?? false;
        }} onDiscard={() => {
            if (busyRef.current) return;
            const action = discard; discardReturn.current = discardAll ? 'navigation' : 'edit'; setDiscard(null); setExplanation(base.explanationMarkdown ?? '');
            if (discardAll) { removeDraft(); setPractice(base.practiceText); }
            action();
        }} />}
    </article>;
}

/** Local focus handoff: the editor opener may disappear when discarding edits. */
function WordDiscardDialog({ onKeep, onDiscard, finalFocus }: { onKeep: () => void; onDiscard: () => void; finalFocus: () => HTMLElement | false }) {
    const title = useId(), description = useId(), keep = useRef<HTMLButtonElement>(null);
    return <BaseDialog.Root open onOpenChange={open => { if (!open) onKeep(); }}>
        <BaseDialog.Portal><BaseDialog.Backdrop forceRender className="fixed inset-0 z-[60] bg-(--navy-800)/42" />
            <BaseDialog.Popup aria-modal="true" aria-labelledby={title} aria-describedby={description} initialFocus={keep} finalFocus={finalFocus}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[calc(100vw-32px)] max-w-sm max-h-[calc(100dvh-32px)] overflow-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-5 text-[var(--color-text-strong)] shadow-lg">
                <h2 id={title} className="text-base font-semibold">Discard unsaved changes?</h2>
                <p id={description} className="my-3 text-sm leading-relaxed text-[var(--color-text-body)]">Your saved explanation and sentence will stay unchanged.</p>
                <div className="flex flex-wrap justify-end gap-2 pt-2"><Button ref={keep} variant="outlined" size="sm" onClick={onKeep}>Keep editing</Button><Button size="sm" onClick={onDiscard}>Discard changes</Button></div>
            </BaseDialog.Popup>
        </BaseDialog.Portal>
    </BaseDialog.Root>;
}
