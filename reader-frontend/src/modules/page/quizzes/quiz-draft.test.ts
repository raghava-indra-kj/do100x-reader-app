import { describe, expect, it } from 'vitest';
import { buildQuizChanges, draftFromRevision, validateQuizDraft } from './quiz-draft';
import type { QuizRevision } from './quiz-api';

const question = (id: string, position: number) => ({
    id, position, kind: 'OBJECTIVE' as const, selectionMode: 'SINGLE' as const, responseLength: null,
    promptMarkdown: `Question ${id}`, referenceAnswerMarkdown: null, explanationMarkdown: 'Why',
    options: [{ id: `${id}-a`, position: 0, bodyMarkdown: 'A', isCorrect: true }, { id: `${id}-b`, position: 1, bodyMarkdown: 'B', isCorrect: false }],
});
const base: QuizRevision = {
    quizId: 'quiz', revisionId: 'revision', revisionNo: 2, title: 'Paper', instructionsMarkdown: null,
    questions: [question('a', 0), question('b', 1), question('c', 2)],
};

describe('quiz draft changes', () => {
    it('keeps an unchanged paper unchanged', () => expect(buildQuizChanges(base, draftFromRevision(base))).toEqual([]));
    it('targets edits by revision question ID and orders new questions before an anchor', () => {
        const draft = draftFromRevision(base);
        const [a, b, c] = draft.questions;
        draft.questions = [c, { clientId: 'new', value: { kind: 'SUBJECTIVE', responseLength: 'SHORT', promptMarkdown: 'New', referenceAnswerMarkdown: 'Answer', explanationMarkdown: 'Details', options: [] } }, a];
        draft.questions[0].value = { ...c.value, promptMarkdown: 'Changed' };
        const changes = buildQuizChanges(base, draft);
        expect(changes).toContainEqual({ type: 'removeQuestion', questionId: b.sourceId });
        expect(changes).toContainEqual({ type: 'replaceQuestion', questionId: c.sourceId, question: draft.questions[0].value });
        expect(changes).toContainEqual({ type: 'moveQuestion', questionId: c.sourceId, beforeQuestionId: a.sourceId });
        expect(changes).toContainEqual({ type: 'addQuestion', question: draft.questions[1].value, beforeQuestionId: a.sourceId });
        expect(validateQuizDraft(draft)).toBeNull();
    });
    it('rejects empty questions and invalid correct choices before sending', () => {
        const draft = draftFromRevision(base);
        draft.questions[0].value = { ...draft.questions[0].value, promptMarkdown: '' };
        expect(validateQuizDraft(draft)).toMatch(/prompt/);
    });
});
