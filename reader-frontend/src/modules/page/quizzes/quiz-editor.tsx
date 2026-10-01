import { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { QuizMarkdown } from './quiz-markdown';
import { quizApi, type QuestionInput, type QuizRevision } from './quiz-api';
import { blankQuestion, buildQuizChanges, draftFromRevision, validateQuizDraft, type DraftQuestion, type QuizDraft } from './quiz-draft';

const control = 'w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] px-3 py-2 text-sm text-[var(--color-text-strong)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]';
const label = 'mb-1 block text-xs font-semibold text-[var(--color-text-muted)]';
const emptyDraft = (): QuizDraft => ({ title: '', instructionsMarkdown: '', questions: [{ clientId: crypto.randomUUID(), value: blankQuestion() }] });

export function QuizEditor({ pageId, quizId, onClose, onSaved }: { pageId: string; quizId?: string; onClose: () => void; onSaved: () => void }) {
    const titleId = useId();
    const [base, setBase] = useState<QuizRevision | null>(null);
    const [draft, setDraft] = useState<QuizDraft>(emptyDraft);
    const [loading, setLoading] = useState(Boolean(quizId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<QuizRevision | null>(null);
    const dirty = base ? buildQuizChanges(base, draft).length > 0 : draft.title !== '' || draft.questions.some((question) => question.value.promptMarkdown !== '');

    useEffect(() => {
        if (!quizId) return;
        let alive = true;
        quizApi.author(quizId).then((revision) => {
            if (!alive) return;
            setBase(revision); setDraft(draftFromRevision(revision)); setLoading(false);
        }).catch((caught) => { if (alive) { setError(caught.message); setLoading(false); } });
        return () => { alive = false; };
    }, [quizId]);
    useEffect(() => {
        const protect = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', protect);
        return () => window.removeEventListener('beforeunload', protect);
    }, [dirty]);

    const changeQuestion = (clientId: string, update: (value: QuestionInput) => QuestionInput) => setDraft((current) => ({
        ...current, questions: current.questions.map((question) => question.clientId === clientId ? { ...question, value: update(question.value) } : question),
    }));
    const move = (index: number, direction: -1 | 1) => setDraft((current) => {
        const questions = [...current.questions];
        const target = index + direction;
        if (target < 0 || target >= questions.length) return current;
        [questions[index], questions[target]] = [questions[target], questions[index]];
        return { ...current, questions };
    });
    const close = () => { if (!saving && (!dirty || window.confirm('Discard the unsaved quiz draft?'))) onClose(); };
    const save = async () => {
        const invalid = validateQuizDraft(draft);
        if (invalid) { setError(invalid); return; }
        if (saving) return;
        setSaving(true); setError(null);
        try {
            if (base) {
                const operations = buildQuizChanges(base, draft);
                if (!operations.length) { onClose(); return; }
                await quizApi.change(base.quizId, base.revisionNo, operations);
            } else {
                await quizApi.create(pageId, { title: draft.title, instructionsMarkdown: draft.instructionsMarkdown || null, questions: draft.questions.map((question) => question.value) });
            }
            onSaved(); onClose();
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Could not save quiz';
            setError((caught as { status?: number }).status === 409 ? `This quiz changed elsewhere. Your draft is preserved. Copy anything important, close, and reopen the latest revision before reapplying it. ${message}` : message);
        } finally { setSaving(false); }
    };

    return <Dialog open labelledBy={titleId} onOpenChange={(open) => { if (!open) close(); }} className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div><h2 id={titleId} className="text-lg font-semibold">{quizId ? 'Edit quiz' : 'Create quiz'}</h2><p className="text-xs text-[var(--color-text-muted)]">Each save publishes one complete revision. Existing attempts keep their original paper.</p></div>
            <Button variant="outlined" iconOnly aria-label="Close quiz editor" onClick={close}><X size={17} /></Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-canvas)] px-4 py-6 sm:px-8">
            {loading ? <p>Loading quiz…</p> : <div className="mx-auto max-w-4xl space-y-7">
                <section className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-4 sm:p-6 space-y-4">
                    <div><label className={label} htmlFor="quiz-title">Title</label><input id="quiz-title" className={control} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /></div>
                    <div><label className={label} htmlFor="quiz-instructions">Instructions · Markdown</label><textarea id="quiz-instructions" className={`${control} min-h-24 resize-y`} value={draft.instructionsMarkdown} onChange={(event) => setDraft({ ...draft, instructionsMarkdown: event.target.value })} /></div>
                    {draft.instructionsMarkdown.trim() && <details><summary className="cursor-pointer text-xs text-[var(--color-text-muted)]">Preview instructions</summary><div className="mt-3"><QuizMarkdown source={draft.instructionsMarkdown} /></div></details>}
                </section>
                {draft.questions.map((question, index) => <QuestionCard key={question.clientId} question={question} number={index + 1} canRemove={draft.questions.length > 1} canMoveUp={index > 0} canMoveDown={index < draft.questions.length - 1}
                    onChange={(update) => changeQuestion(question.clientId, update)} onRemove={() => setDraft((current) => ({ ...current, questions: current.questions.filter((item) => item.clientId !== question.clientId) }))} onMove={move.bind(null, index)} />)}
                <Button variant="outlined" onClick={() => setDraft((current) => ({ ...current, questions: [...current.questions, { clientId: crypto.randomUUID(), value: blankQuestion() }] }))}><Plus size={15} /> Add question</Button>
                {base && base.revisionNo > 1 && <section className="border-t border-[var(--color-border-default)] pt-5">
                    <h3 className="mb-2 text-sm font-semibold">Earlier revisions</h3>
                    <div className="flex flex-wrap gap-2">{Array.from({ length: base.revisionNo - 1 }, (_, i) => i + 1).map((number) => <Button key={number} size="sm" variant="outlined" onClick={() => quizApi.author(base.quizId, number).then(setHistory).catch((caught) => setError(caught.message))}>Revision {number}</Button>)}</div>
                    {history && <div className="mt-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-4"><p className="mb-3 text-sm font-semibold">Revision {history.revisionNo} · {history.title} (read-only)</p>{history.questions.map((item) => <div key={item.id} className="border-t border-[var(--color-border-subtle)] py-3"><QuizMarkdown source={item.promptMarkdown} /></div>)}</div>}
                </section>}
            </div>}
        </div>
        {error && <p role="alert" className="border-t border-[var(--color-border-default)] px-5 py-2 text-sm text-[var(--color-error)]">{error}</p>}
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-5 py-3 sm:justify-between">
            <span className="hidden text-xs text-[var(--color-text-muted)] sm:block">Markdown source is saved unchanged.</span>
            <div className="flex shrink-0 gap-2 whitespace-nowrap"><Button variant="outlined" onClick={close}>Cancel</Button><Button onClick={save} loading={saving} disabled={loading || Boolean(quizId && !base)}>Save quiz</Button></div>
        </footer>
    </Dialog>;
}

function QuestionCard({ question, number, canRemove, canMoveUp, canMoveDown, onChange, onRemove, onMove }: {
    question: DraftQuestion; number: number; canRemove: boolean; canMoveUp: boolean; canMoveDown: boolean;
    onChange: (update: (value: QuestionInput) => QuestionInput) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void;
}) {
    const value = question.value;
    const change = (patch: Partial<QuestionInput>) => onChange((current) => ({ ...current, ...patch } as QuestionInput));
    return <section className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Question {number}</h3><div className="flex gap-1"><Button variant="outlined" size="sm" iconOnly aria-label={`Move question ${number} up`} disabled={!canMoveUp} onClick={() => onMove(-1)}><ArrowUp size={14} /></Button><Button variant="outlined" size="sm" iconOnly aria-label={`Move question ${number} down`} disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown size={14} /></Button><Button variant="outlined" size="sm" iconOnly aria-label={`Remove question ${number}`} disabled={!canRemove} onClick={onRemove}><Trash2 size={14} /></Button></div></div>
        <div className="flex flex-wrap gap-3"><label className={label}>Type<select className={control} value={value.kind} onChange={(event) => onChange((current) => ({ ...blankQuestion(event.target.value as 'OBJECTIVE' | 'SUBJECTIVE'), promptMarkdown: current.promptMarkdown, explanationMarkdown: current.explanationMarkdown }))}><option value="OBJECTIVE">Objective</option><option value="SUBJECTIVE">Subjective</option></select></label>
            {value.kind === 'OBJECTIVE' ? <label className={label}>Selection<select className={control} value={value.selectionMode} onChange={(event) => onChange((current) => current.kind === 'OBJECTIVE' ? { ...current, selectionMode: event.target.value as 'SINGLE' | 'MULTIPLE', options: event.target.value === 'SINGLE' ? current.options.map((item, index) => ({ ...item, isCorrect: index === Math.max(0, current.options.findIndex((option) => option.isCorrect)) })) : current.options } : current)}><option value="SINGLE">Single select</option><option value="MULTIPLE">Multi-select</option></select></label>
                : <label className={label}>Answer length<select className={control} value={value.responseLength} onChange={(event) => change({ responseLength: event.target.value as 'SHORT' | 'LONG' } as Partial<QuestionInput>)}><option value="SHORT">Short answer</option><option value="LONG">Long answer</option></select></label>}
        </div>
        <div><label className={label}>Question · Markdown</label><textarea className={`${control} min-h-28 resize-y`} value={value.promptMarkdown} onChange={(event) => change({ promptMarkdown: event.target.value })} /></div>
        {value.kind === 'OBJECTIVE' ? <div className="space-y-2"><p className={label}>Options · Markdown · {value.options.length}/10</p>{value.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2"><input type={value.selectionMode === 'SINGLE' ? 'radio' : 'checkbox'} name={`correct-${question.clientId}`} aria-label={`Option ${optionIndex + 1} is correct`} checked={option.isCorrect} onChange={() => onChange((current) => current.kind === 'OBJECTIVE' ? { ...current, options: current.options.map((item, index) => ({ ...item, isCorrect: current.selectionMode === 'SINGLE' ? index === optionIndex : index === optionIndex ? !item.isCorrect : item.isCorrect })) } : current)} /><textarea aria-label={`Option ${optionIndex + 1} Markdown`} className={`${control} min-h-12 resize-y`} value={option.bodyMarkdown} onChange={(event) => onChange((current) => current.kind === 'OBJECTIVE' ? { ...current, options: current.options.map((item, index) => index === optionIndex ? { ...item, bodyMarkdown: event.target.value } : item) } : current)} /><Button variant="outlined" size="sm" iconOnly aria-label={`Remove option ${optionIndex + 1}`} disabled={value.options.length <= 2} onClick={() => onChange((current) => current.kind === 'OBJECTIVE' ? { ...current, options: current.options.filter((_, index) => index !== optionIndex) } : current)}><X size={13} /></Button></div>)}<Button variant="outlined" size="sm" disabled={value.options.length >= 10} onClick={() => onChange((current) => current.kind === 'OBJECTIVE' ? { ...current, options: [...current.options, { bodyMarkdown: '', isCorrect: false }] } : current)}><Plus size={13} /> Add option</Button></div>
            : <div><label className={label}>Clear reference answer · Markdown</label><textarea className={`${control} min-h-24 resize-y`} value={value.referenceAnswerMarkdown} onChange={(event) => change({ referenceAnswerMarkdown: event.target.value } as Partial<QuestionInput>)} /></div>}
        <div><label className={label}>Detailed explanation · Markdown</label><textarea className={`${control} min-h-24 resize-y`} value={value.explanationMarkdown} onChange={(event) => change({ explanationMarkdown: event.target.value })} /></div>
        <details><summary className="cursor-pointer text-xs text-[var(--color-text-muted)]">Preview Markdown</summary><div className="mt-3 space-y-3"><QuizMarkdown source={value.promptMarkdown} />{value.kind === 'OBJECTIVE' ? value.options.map((item, index) => <div key={index} className="rounded border border-[var(--color-border-default)] p-2"><QuizMarkdown source={item.bodyMarkdown} /></div>) : <QuizMarkdown source={value.referenceAnswerMarkdown} />}<QuizMarkdown source={value.explanationMarkdown} /></div></details>
    </section>;
}
