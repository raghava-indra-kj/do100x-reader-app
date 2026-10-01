export type ObjectiveInput = {
    kind: 'OBJECTIVE'; selectionMode: 'SINGLE' | 'MULTIPLE'; promptMarkdown: string;
    explanationMarkdown: string; options: { bodyMarkdown: string; isCorrect: boolean }[];
};
export type SubjectiveInput = {
    kind: 'SUBJECTIVE'; responseLength: 'SHORT' | 'LONG'; promptMarkdown: string;
    referenceAnswerMarkdown: string; explanationMarkdown: string; options: [];
};
export type QuestionInput = ObjectiveInput | SubjectiveInput;
export type AuthorQuestion = (ObjectiveInput | SubjectiveInput) & { id: string; position: number; options: ({ id: string; position: number; bodyMarkdown: string; isCorrect: boolean })[] };
export type QuizRevision = { quizId: string; revisionId: string; revisionNo: number; title: string; instructionsMarkdown: string | null; questions: AuthorQuestion[] };
export type LearnerRevision = { quizId: string; revisionId: string; revisionNo: number; title: string; instructionsMarkdown: string | null; questions: {
    id: string; position: number; kind: 'OBJECTIVE' | 'SUBJECTIVE'; selectionMode: 'SINGLE' | 'MULTIPLE' | null;
    responseLength: 'SHORT' | 'LONG' | null; promptMarkdown: string;
    options: { id: string; position: number; bodyMarkdown: string }[];
}[] };
export type QuizListItem = { id: string; pageId: string; sortOrder: number; archivedAt: string | null; revisionId: string; revisionNo: number; title: string };
export type QuizList = { items: QuizListItem[]; nextCursor: string | null };
export type QuizChange =
    | { type: 'setMetadata'; title?: string; instructionsMarkdown?: string | null }
    | { type: 'addQuestion'; question: QuestionInput; beforeQuestionId?: string }
    | { type: 'replaceQuestion'; questionId: string; question: QuestionInput }
    | { type: 'removeQuestion'; questionId: string }
    | { type: 'moveQuestion'; questionId: string; beforeQuestionId?: string | null };

export type AttemptQuestion = {
    id: string; position: number; kind: 'OBJECTIVE' | 'SUBJECTIVE'; selectionMode: 'SINGLE' | 'MULTIPLE' | null;
    responseLength: 'SHORT' | 'LONG' | null; promptMarkdown: string;
    options: { id: string; position: number; bodyMarkdown: string; isCorrect?: boolean }[];
    answer: { responseMarkdown: string | null; selectedOptionIds: string[] };
    referenceAnswerMarkdown?: string | null; explanationMarkdown?: string; verdict?: string; scorePercent?: number | null;
    latestFeedback?: { verdict: string; scorePercent: number | null; feedbackMarkdown: string; createdAt: string } | null;
};
export type QuizAttempt = {
    id: string; quizId: string; revisionId: string; revisionNo: number; title: string; instructionsMarkdown: string | null;
    status: 'IN_PROGRESS' | 'SUBMITTED'; startedAt: string; submittedAt: string | null; questions: AttemptQuestion[];
};
export type AttemptList = { items: { id: string; status: string; revisionNo: number; title: string; startedAt: string; submittedAt: string | null }[]; nextCursor: string | null };
export type EvaluationRecord = { id: string; questionId: string; source: 'OBJECTIVE' | 'AI'; verdict: string; scorePercent: number | null; feedbackMarkdown: string; modelId: string | null; promptVersion: string | null; createdAt: string };

export class QuizApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) { super(message); this.status = status; this.name = 'QuizApiError'; }
}
async function json<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/backend-api/quizzes${path}`, {
        method, credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new QuizApiError(response.status, data?.message || 'Could not complete the quiz request');
    return data as T;
}

export const quizApi = {
    list: (pageId: string, cursor?: string, archivedOnly = false) => json<QuizList>(`/?pageId=${encodeURIComponent(pageId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}&take=30${archivedOnly ? '&archivedOnly=true' : ''}`),
    create: (pageId: string, quiz: { title: string; instructionsMarkdown: string | null; questions: QuestionInput[] }) => json<QuizRevision>('/', 'POST', { pageId, quiz }),
    author: (quizId: string, revisionNo?: number) => json<QuizRevision>(`/${encodeURIComponent(quizId)}?view=author${revisionNo ? `&revisionNo=${revisionNo}` : ''}`),
    learner: (quizId: string) => json<LearnerRevision>(`/${encodeURIComponent(quizId)}`),
    change: (quizId: string, expectedRevisionNo: number, operations: QuizChange[]) => json<QuizRevision>(`/${encodeURIComponent(quizId)}`, 'PATCH', { expectedRevisionNo, operations }),
    archive: (quizId: string, expectedRevisionNo: number) => json(`/${encodeURIComponent(quizId)}/archive`, 'POST', { expectedRevisionNo }),
    swap: (quizId: string, otherQuizId: string) => json(`/${encodeURIComponent(quizId)}/swap`, 'POST', { otherQuizId }),
    start: (quizId: string, startRequestKey: string) => json<QuizAttempt>(`/${encodeURIComponent(quizId)}/attempts`, 'POST', { startRequestKey }),
    saveAnswer: (attemptId: string, answer: { questionId: string; selectedOptionIds?: string[]; responseMarkdown?: string }) => json(`/attempts/${encodeURIComponent(attemptId)}/answers`, 'PUT', answer),
    submit: (attemptId: string) => json<QuizAttempt>(`/attempts/${encodeURIComponent(attemptId)}/submit`, 'POST', {}),
    getAttempt: (attemptId: string) => json<QuizAttempt>(`/attempts/${encodeURIComponent(attemptId)}`),
    attempts: (quizId: string, cursor?: string) => json<AttemptList>(`/${encodeURIComponent(quizId)}/attempts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    evaluationHistory: (attemptId: string) => json<EvaluationRecord[]>(`/attempts/${encodeURIComponent(attemptId)}/evaluations`),
};
