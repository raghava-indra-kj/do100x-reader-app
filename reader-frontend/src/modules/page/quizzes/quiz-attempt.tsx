import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { ConfirmationDialog } from '@modules/core/ui/components/confirmation-dialog';
import { QuizMarkdown } from './quiz-markdown';
import { quizApi, type EvaluationRecord, type QuizAttempt as Attempt } from './quiz-api';

type ResponseDraft = Record<string, { selectedOptionIds: string[]; responseMarkdown: string }>;
const verdictLabels: Record<string, string> = {
    CORRECT: 'Correct', PARTIAL: 'Partly correct', INCORRECT: 'Incorrect',
    UNANSWERED: 'Unanswered', NEEDS_REVIEW: 'Needs review',
};
function responses(attempt: Attempt): ResponseDraft {
    return Object.fromEntries(attempt.questions.map((question) => [question.id, {
        selectedOptionIds: question.answer.selectedOptionIds,
        responseMarkdown: question.answer.responseMarkdown ?? '',
    }]));
}

export function QuizAttempt({ quizId, attemptId, onClose, onChanged }: { quizId: string; attemptId?: string; onClose: () => void; onChanged: () => void }) {
    const titleId = useId();
    const requestKey = useRef<string>(sessionStorage.getItem(`quiz-start:${quizId}`) || crypto.randomUUID());
    const [attempt, setAttempt] = useState<Attempt | null>(null);
    const [draft, setDraft] = useState<ResponseDraft>({});
    const [saved, setSaved] = useState<ResponseDraft>({});
    const [busy, setBusy] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<EvaluationRecord[] | null>(null);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    useEffect(() => {
        let alive = true;
        if (!attemptId) sessionStorage.setItem(`quiz-start:${quizId}`, requestKey.current);
        const load = attemptId ? quizApi.getAttempt(attemptId) : quizApi.start(quizId, requestKey.current);
        load.then((result) => { if (alive) { setAttempt(result); setDraft(responses(result)); setSaved(responses(result)); onChanged(); } })
            .catch((caught) => { if (alive) setError(caught.message); });
        return () => { alive = false; };
    }, [attemptId, quizId]);
    useEffect(() => {
        const protect = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', protect);
        return () => window.removeEventListener('beforeunload', protect);
    }, [dirty]);

    const close = () => {
        if (busy) return;
        if (dirty) setConfirmDiscard(true);
        else onClose();
    };
    const save = async (): Promise<boolean> => {
        if (!attempt) return false;
        setBusy(true); setError(null);
        try {
            for (const question of attempt.questions) {
                const current = draft[question.id];
                if (JSON.stringify(current) === JSON.stringify(saved[question.id])) continue;
                await quizApi.saveAnswer(attempt.id, question.kind === 'OBJECTIVE'
                    ? { questionId: question.id, selectedOptionIds: current.selectedOptionIds }
                    : { questionId: question.id, responseMarkdown: current.responseMarkdown });
            }
            setSaved(structuredClone(draft));
            onChanged();
            return true;
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t save your answers. Try again.'); return false; }
        finally { setBusy(false); }
    };
    const submit = async () => {
        if (!attempt) return;
        if (!await save()) return;
        setBusy(true); setError(null);
        try {
            const result = await quizApi.submit(attempt.id);
            setAttempt(result); setDraft(responses(result)); setSaved(responses(result));
            setConfirmSubmit(false);
            sessionStorage.removeItem(`quiz-start:${quizId}`);
            onChanged();
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Couldn’t submit your answers. Try again.'); }
        finally { setBusy(false); }
    };
    const setAnswer = (questionId: string, update: (answer: ResponseDraft[string]) => ResponseDraft[string]) => setDraft((current) => ({ ...current, [questionId]: update(current[questionId]) }));

    return <Dialog open labelledBy={titleId} onOpenChange={(open) => { if (!open) close(); }} className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div><h2 id={titleId} className="text-lg font-semibold">{attempt?.title ?? 'Opening quiz…'}</h2><p className="text-xs text-[var(--color-text-muted)]">{attempt ? `Version ${attempt.revisionNo} · ${attempt.status === 'SUBMITTED' ? 'Submitted' : 'In progress'}` : 'Loading questions…'}</p></div>
            <div className="flex items-center gap-2">{attempt?.status === 'SUBMITTED' && <Button size="sm" variant="outlined" onClick={() => { if (history) setHistory(null); else quizApi.evaluationHistory(attempt.id).then(setHistory).catch((caught) => setError(caught.message)); }}>{history ? 'Hide history' : 'Feedback history'}</Button>}<Button variant="outlined" iconOnly aria-label="Close quiz" onClick={close}><X size={17} /></Button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-canvas)] px-4 py-6 sm:px-8">
            {attempt && <div className="mx-auto max-w-3xl space-y-7">
                {attempt.instructionsMarkdown && <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-5"><QuizMarkdown source={attempt.instructionsMarkdown} /></div>}
                {attempt.questions.map((question, index) => <section key={question.id} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Question {index + 1}</h3><span className="text-xs text-[var(--color-text-muted)]">{question.kind === 'OBJECTIVE' ? question.selectionMode === 'SINGLE' ? 'Choose one' : 'Choose all that apply' : question.responseLength === 'SHORT' ? 'Short answer' : 'Long answer'}</span></div>
                    <QuizMarkdown source={question.promptMarkdown} />
                    {question.kind === 'OBJECTIVE' ? <div className="space-y-2">{question.options.map((option) => {
                        const selected = draft[question.id]?.selectedOptionIds.includes(option.id) ?? false;
                        return <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected ? 'border-[var(--color-brand)] bg-[var(--color-surface-soft)]' : 'border-[var(--color-border-default)]'}`}>
                            <input className="mt-1 accent-[var(--color-brand)]" type={question.selectionMode === 'SINGLE' ? 'radio' : 'checkbox'} name={`question-${question.id}`} checked={selected} disabled={attempt.status === 'SUBMITTED'} onChange={() => setAnswer(question.id, (answer) => ({ ...answer, selectedOptionIds: question.selectionMode === 'SINGLE' ? [option.id] : selected ? answer.selectedOptionIds.filter((id) => id !== option.id) : [...answer.selectedOptionIds, option.id] }))} />
                            <span className="min-w-0 flex-1"><QuizMarkdown source={option.bodyMarkdown} />{attempt.status === 'SUBMITTED' && option.isCorrect && <span className="text-xs font-semibold text-[var(--color-brand)]">Correct answer</span>}</span>
                        </label>;
                    })}</div> : attempt.status === 'SUBMITTED' ? <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-3"><p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Your answer</p><QuizMarkdown source={question.answer.responseMarkdown || '_No answer submitted._'} /></div> : <textarea aria-label={`Answer to question ${index + 1}`} className="min-h-36 w-full resize-y rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]" value={draft[question.id]?.responseMarkdown ?? ''} onChange={(event) => setAnswer(question.id, (answer) => ({ ...answer, responseMarkdown: event.target.value }))} placeholder="Write your answer…" />}
                    {attempt.status === 'SUBMITTED' && <div className="space-y-3 border-t border-[var(--color-border-default)] pt-4">
                        <p className="text-sm font-semibold">{question.verdict === 'NEEDS_REVIEW' ? 'Awaiting feedback' : question.verdict === 'UNANSWERED' ? 'Unanswered' : question.verdict === 'CORRECT' ? 'Correct' : question.verdict === 'INCORRECT' ? 'Incorrect' : verdictLabels[question.latestFeedback?.verdict ?? question.verdict ?? '']}</p>
                        {question.kind === 'SUBJECTIVE' && question.referenceAnswerMarkdown && <div><p className="mb-1 text-xs font-semibold">Reference answer</p><QuizMarkdown source={question.referenceAnswerMarkdown} /></div>}
                        <div><p className="mb-1 text-xs font-semibold">Explanation</p><QuizMarkdown source={question.explanationMarkdown} /></div>
                        {question.latestFeedback && <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-soft)] p-3"><p className="mb-1 text-xs font-semibold">AI feedback · {verdictLabels[question.latestFeedback.verdict]}</p><QuizMarkdown source={question.latestFeedback.feedbackMarkdown} /></div>}
                        {history && <div className="space-y-2">{history.filter((entry) => entry.questionId === question.id && entry.source === 'AI').map((entry) => <div key={entry.id} className="rounded border border-[var(--color-border-default)] p-2"><p className="mb-1 text-xs text-[var(--color-text-muted)]">{new Date(entry.createdAt).toLocaleString()} · {verdictLabels[entry.verdict]}{entry.modelId ? ` · ${entry.modelId}` : ''}</p><QuizMarkdown source={entry.feedbackMarkdown} /></div>)}</div>}
                    </div>}
                </section>)}
            </div>}
        </div>
        {error && <p role="alert" className="border-t border-[var(--color-border-default)] px-5 py-2 text-sm text-[var(--color-error)]">{error}</p>}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-5 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">{attempt?.status === 'SUBMITTED' ? 'Submitted answers can’t be edited.' : dirty ? 'Unsaved answers' : 'Answers saved'}</span>
            <div className="flex items-center gap-2">{confirmSubmit && <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">You can’t change answers after submitting.</span>}<Button variant="outlined" onClick={close}>Close</Button>{attempt?.status === 'IN_PROGRESS' && (confirmSubmit ? <><Button variant="outlined" onClick={() => setConfirmSubmit(false)} disabled={busy}>Keep editing</Button><Button onClick={submit} loading={busy}>Submit answers</Button></> : <><Button variant="outlined" onClick={save} loading={busy} disabled={!dirty}>Save answers</Button><Button onClick={() => setConfirmSubmit(true)} disabled={busy}>Submit answers</Button></>)}</div>
        </footer>
        <ConfirmationDialog open={confirmDiscard} title="Discard unsaved answers?" description="Your unsaved answer changes will be lost. Previously saved answers will stay."
            confirmLabel="Discard answers" cancelLabel="Keep editing" pending={busy}
            onCancel={() => setConfirmDiscard(false)} onConfirm={() => { if (!busy) { setConfirmDiscard(false); onClose(); } }} />
    </Dialog>;
}
