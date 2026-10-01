import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { QuizMarkdown } from './quiz-markdown';
import { quizApi, type LearnerRevision } from './quiz-api';

/** Read-only learner view. The API never sends answer keys to this component. */
export function QuizPreview({ quizId, canAttempt, onClose, onStart }: { quizId: string; canAttempt: boolean; onClose: () => void; onStart: () => void }) {
    const titleId = useId();
    const [quiz, setQuiz] = useState<LearnerRevision | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        quizApi.learner(quizId).then((result) => { if (active) setQuiz(result); })
            .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load quiz'); });
        return () => { active = false; };
    }, [quizId]);

    return <Dialog open labelledBy={titleId} onOpenChange={(open) => { if (!open) onClose(); }} className="flex flex-col inset-0 h-full max-w-none rounded-none -translate-x-0 -translate-y-0 p-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
            <div><h2 id={titleId} className="text-lg font-semibold">{quiz?.title ?? 'Opening quiz…'}</h2><p className="text-xs text-[var(--color-text-muted)]">{quiz ? `Revision ${quiz.revisionNo} · Preview` : 'Loading questions'}</p></div>
            <Button variant="outlined" iconOnly aria-label="Close preview" onClick={onClose}><X size={17} /></Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-canvas)] px-4 py-6 sm:px-8">
            {error && <p role="alert" className="mx-auto max-w-3xl text-sm text-[var(--color-error)]">{error}</p>}
            {quiz && <div className="mx-auto max-w-3xl space-y-7">
                {quiz.instructionsMarkdown && <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-5"><QuizMarkdown source={quiz.instructionsMarkdown} /></div>}
                {quiz.questions.map((question, index) => <section key={question.id} className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Question {index + 1}</h3><span className="text-xs text-[var(--color-text-muted)]">{question.kind === 'OBJECTIVE' ? question.selectionMode === 'SINGLE' ? 'Choose one' : 'Choose all that apply' : question.responseLength === 'SHORT' ? 'Short answer' : 'Long answer'}</span></div>
                    <QuizMarkdown source={question.promptMarkdown} />
                    {question.kind === 'OBJECTIVE' ? <div className="space-y-2">{question.options.map((option) => <div key={option.id} className="rounded-lg border border-[var(--color-border-default)] p-3"><QuizMarkdown source={option.bodyMarkdown} /></div>)}</div> : <p className="rounded-lg border border-dashed border-[var(--color-border-default)] p-3 text-sm text-[var(--color-text-muted)]">Write your answer in Markdown when you start an attempt.</p>}
                </section>)}
            </div>}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-5 py-3">
            <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">{canAttempt ? 'Answers are saved in an attempt.' : 'Sign in to save an attempt.'}</span>
            <div className="ml-auto flex items-center gap-2 whitespace-nowrap"><Button variant="outlined" onClick={onClose}>Close</Button>{canAttempt && <Button onClick={onStart} disabled={!quiz}>Start attempt</Button>}</div>
        </footer>
    </Dialog>;
}
