import type { AuthorQuestion, QuestionInput, QuizChange, QuizRevision } from './quiz-api';

export type DraftQuestion = { clientId: string; sourceId?: string; value: QuestionInput };
export type QuizDraft = { title: string; instructionsMarkdown: string; questions: DraftQuestion[] };

export function blankQuestion(kind: 'OBJECTIVE' | 'SUBJECTIVE' = 'OBJECTIVE'): QuestionInput {
    return kind === 'OBJECTIVE'
        ? { kind, selectionMode: 'SINGLE', promptMarkdown: '', explanationMarkdown: '', options: [{ bodyMarkdown: '', isCorrect: true }, { bodyMarkdown: '', isCorrect: false }] }
        : { kind, responseLength: 'SHORT', promptMarkdown: '', referenceAnswerMarkdown: '', explanationMarkdown: '', options: [] };
}

export function questionInput(question: AuthorQuestion): QuestionInput {
    if (question.kind === 'OBJECTIVE') return {
        kind: 'OBJECTIVE', selectionMode: question.selectionMode!, promptMarkdown: question.promptMarkdown,
        explanationMarkdown: question.explanationMarkdown,
        options: question.options.map((option) => ({ bodyMarkdown: option.bodyMarkdown, isCorrect: option.isCorrect })),
    };
    return {
        kind: 'SUBJECTIVE', responseLength: question.responseLength!, promptMarkdown: question.promptMarkdown,
        referenceAnswerMarkdown: question.referenceAnswerMarkdown!, explanationMarkdown: question.explanationMarkdown, options: [],
    };
}

export function draftFromRevision(revision: QuizRevision): QuizDraft {
    return {
        title: revision.title, instructionsMarkdown: revision.instructionsMarkdown ?? '',
        questions: revision.questions.map((question) => ({ clientId: question.id, sourceId: question.id, value: questionInput(question) })),
    };
}

/** Converts a visual draft into ID-targeted, revision-scoped operations. */
export function buildQuizChanges(base: QuizRevision, draft: QuizDraft): QuizChange[] {
    const operations: QuizChange[] = [];
    if (base.title !== draft.title || (base.instructionsMarkdown ?? '') !== draft.instructionsMarkdown) {
        operations.push({ type: 'setMetadata', title: draft.title, instructionsMarkdown: draft.instructionsMarkdown || null });
    }
    const desiredOriginals = draft.questions.flatMap((question) => question.sourceId ? [question.sourceId] : []);
    const desired = new Set(desiredOriginals);
    const currentOrder = base.questions.map((question) => question.id).filter((id) => desired.has(id));
    for (const question of base.questions) {
        if (!desired.has(question.id)) operations.push({ type: 'removeQuestion', questionId: question.id });
    }
    for (const question of draft.questions) {
        if (!question.sourceId) continue;
        const original = base.questions.find((item) => item.id === question.sourceId);
        if (!original) throw new Error('This draft includes a question from a different quiz version.');
        if (JSON.stringify(questionInput(original)) !== JSON.stringify(question.value)) {
            operations.push({ type: 'replaceQuestion', questionId: question.sourceId, question: question.value });
        }
    }
    // Move each original at most once. New questions are inserted afterwards.
    for (let position = 0; position < desiredOriginals.length; position++) {
        const wanted = desiredOriginals[position];
        if (currentOrder[position] === wanted) continue;
        const beforeQuestionId = currentOrder[position];
        operations.push({ type: 'moveQuestion', questionId: wanted, beforeQuestionId });
        currentOrder.splice(currentOrder.indexOf(wanted), 1);
        currentOrder.splice(position, 0, wanted);
    }
    draft.questions.forEach((question, position) => {
        if (question.sourceId) return;
        const nextOriginal = draft.questions.slice(position + 1).find((item) => item.sourceId)?.sourceId;
        operations.push({ type: 'addQuestion', question: question.value, ...(nextOriginal ? { beforeQuestionId: nextOriginal } : {}) });
    });
    return operations;
}

export function validateQuizDraft(draft: QuizDraft): string | null {
    if (!draft.title.trim()) return 'Enter a quiz title.';
    if (draft.questions.length < 1) return 'Add at least one question.';
    for (const [index, question] of draft.questions.entries()) {
        const value = question.value;
        if (!value.promptMarkdown.trim() || !value.explanationMarkdown.trim()) return `Add the question and explanation for question ${index + 1}.`;
        if (value.kind === 'OBJECTIVE') {
            if (value.options.length < 2 || value.options.length > 10) return `Add 2–10 options to question ${index + 1}.`;
            if (value.options.some((option) => !option.bodyMarkdown.trim())) return `Fill in every option for question ${index + 1}.`;
            const correct = value.options.filter((option) => option.isCorrect).length;
            if (value.selectionMode === 'SINGLE' && correct !== 1 || value.selectionMode === 'MULTIPLE' && correct < 1) return `Select the correct option or options for question ${index + 1}.`;
        } else if (!value.referenceAnswerMarkdown.trim()) return `Add a reference answer for question ${index + 1}.`;
    }
    return null;
}
