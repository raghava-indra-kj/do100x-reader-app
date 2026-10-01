import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { QuizError } from "./quiz-contract";
import { getQuizRevision, type QuizDb } from "./quiz-service";

const uuid = z.string().uuid();
export const saveAnswerSchema = z.object({
  questionId: uuid,
  selectedOptionIds: z.array(uuid).max(10).optional(),
  responseMarkdown: z.string().optional(),
}).strict();
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;

type QuizTx = Prisma.TransactionClient;
async function transact<T>(db: QuizDb, run: (tx: QuizTx) => Promise<T>): Promise<T> {
  return "$transaction" in db ? db.$transaction((tx) => run(tx)) : run(db);
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const value = schema.safeParse(input);
  if (!value.success) throw new QuizError(422, value.error.issues[0]?.message ?? "Invalid answer");
  return value.data;
}
function conflict(message: string): QuizError { return new QuizError(409, message); }

async function ownedAttempt(db: QuizDb, attemptId: string, userId: string) {
  const attempt = await db.quiz_attempt.findFirst({
    where: { id: attemptId, userId },
    include: { revision: { include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } }, quiz: true } } },
  });
  if (!attempt) throw new QuizError(404, "Attempt not found");
  return attempt;
}

/** Idempotent start. A retry key can never silently start a different quiz. */
export async function startAttempt(db: QuizDb, userId: string, quizId: string, startRequestKey: string) {
  parse(uuid, startRequestKey);
  const existing = await db.quiz_attempt.findUnique({ where: { userId_startRequestKey: { userId, startRequestKey } }, include: { revision: true } });
  if (existing) {
    if (existing.revision.quizId !== quizId) throw conflict("Start request key belongs to another quiz");
    return getAttempt(db, userId, existing.id);
  }
  try {
    return await transact(db, async (tx) => {
      // A conditional write locks the paper against an edit/archive while the
      // attempt chooses its revision. It does not change the revision number.
      const available = await tx.quiz.updateMany({ where: { id: quizId, archivedAt: null }, data: { currentRevisionNo: { increment: 0 } } });
      if (available.count !== 1) throw new QuizError(404, "Quiz not found");
      const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
      if (!quiz || quiz.archivedAt) throw new QuizError(404, "Quiz not found");
      await getQuizRevision(tx, { quizId, userId, view: "learner" });
      const revision = await tx.quiz_revision.findUniqueOrThrow({ where: { quizId_revisionNo: { quizId, revisionNo: quiz.currentRevisionNo } } });
      const attempt = await tx.quiz_attempt.create({ data: { revisionId: revision.id, userId, startRequestKey } });
      return getAttempt(tx, userId, attempt.id);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const retried = await db.quiz_attempt.findUnique({ where: { userId_startRequestKey: { userId, startRequestKey } }, include: { revision: true } });
      if (retried?.revision.quizId === quizId) return getAttempt(db, userId, retried.id);
      throw conflict("Start request key belongs to another quiz");
    }
    throw error;
  }
}

/** Replaces one draft answer. Option IDs must belong to this pinned question. */
export async function saveAttemptAnswer(db: QuizDb, userId: string, attemptId: string, input: SaveAnswerInput) {
  const value = parse(saveAnswerSchema, input);
  return transact(db, async (tx) => {
    const attempt = await ownedAttempt(tx, attemptId, userId);
    if (attempt.status !== "IN_PROGRESS") throw conflict("Submitted answers cannot be changed");
    const question = attempt.revision.questions.find((item) => item.id === value.questionId);
    if (!question) throw new QuizError(422, "Question is not in this attempt's revision");
    if (question.kind === "OBJECTIVE") {
      if (value.responseMarkdown !== undefined || value.selectedOptionIds === undefined) throw new QuizError(422, "Use selectedOptionIds for an objective question");
      const ids = value.selectedOptionIds;
      if (new Set(ids).size !== ids.length || (question.selectionMode === "SINGLE" && ids.length > 1)) throw new QuizError(422, "Invalid option selection");
      const valid = new Set(question.options.map((option) => option.id));
      if (ids.some((id) => !valid.has(id))) throw new QuizError(422, "Option does not belong to this question");
    } else if (value.responseMarkdown === undefined || value.selectedOptionIds !== undefined) {
      throw new QuizError(422, "Use responseMarkdown for a subjective question");
    }
    // A conditional write serializes saves against submit and other saves.
    const locked = await tx.quiz_attempt.updateMany({ where: { id: attempt.id, status: "IN_PROGRESS" }, data: { status: "IN_PROGRESS" } });
    if (locked.count !== 1) throw conflict("Attempt was already submitted");
    const answer = await tx.quiz_attempt_answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: question.id } },
      create: { attemptId, questionId: question.id, responseMarkdown: value.responseMarkdown ?? null },
      update: { responseMarkdown: value.responseMarkdown ?? null },
    });
    await tx.quiz_answer_selection.deleteMany({ where: { answerId: answer.id } });
    if (value.selectedOptionIds?.length) await tx.quiz_answer_selection.createMany({ data: value.selectedOptionIds.map((optionId) => ({ answerId: answer.id, optionId })) });
    return { attemptId, questionId: question.id, responseMarkdown: answer.responseMarkdown, selectedOptionIds: value.selectedOptionIds ?? [] };
  });
}

/** Submit once, freezing answers and deterministic exact-set objective grading. */
export async function submitAttempt(db: QuizDb, userId: string, attemptId: string) {
  const result = await transact(db, async (tx) => {
    const attempt = await ownedAttempt(tx, attemptId, userId);
    if (attempt.status === "SUBMITTED") return getAttempt(tx, userId, attemptId);
    const submittedAt = new Date();
    const changed = await tx.quiz_attempt.updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: { status: "SUBMITTED", submittedAt } });
    if (changed.count !== 1) return null;
    for (const question of attempt.revision.questions) {
      const answer = await tx.quiz_attempt_answer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id }, update: {},
        include: { selections: true },
      });
      if (question.kind !== "OBJECTIVE") continue;
      const selected = new Set(answer.selections.map((selection) => selection.optionId));
      const correct = new Set(question.options.filter((option) => option.isCorrect).map((option) => option.id));
      const verdict = selected.size === 0 ? "UNANSWERED" : selected.size === correct.size && [...selected].every((id) => correct.has(id)) ? "CORRECT" : "INCORRECT";
      await tx.quiz_answer_evaluation.create({
        data: { answerId: answer.id, requestKey: randomUUID(), source: "OBJECTIVE", verdict, scorePercent: verdict === "UNANSWERED" ? null : verdict === "CORRECT" ? 100 : 0, feedbackMarkdown: "" },
      });
    }
    return getAttempt(tx, userId, attemptId);
  });
  // If another request submitted first, read its committed result in a fresh
  // transaction rather than returning this transaction's older snapshot.
  return result ?? getAttempt(db, userId, attemptId);
}

/** Only the respondent can read an attempt. Keys appear after submission. */
export async function getAttempt(db: QuizDb, userId: string, attemptId: string) {
  const attempt = await ownedAttempt(db, attemptId, userId);
  const submitted = attempt.status === "SUBMITTED";
  const answers = await db.quiz_attempt_answer.findMany({
    where: { attemptId },
    include: { selections: true, evaluations: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] } },
  });
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  return {
    id: attempt.id, quizId: attempt.revision.quizId, revisionId: attempt.revisionId, revisionNo: attempt.revision.revisionNo,
    title: attempt.revision.title, instructionsMarkdown: attempt.revision.instructionsMarkdown,
    status: attempt.status, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt,
    questions: attempt.revision.questions.map((question) => {
      const answer = byQuestion.get(question.id);
      const objectiveResult = submitted ? answer?.evaluations.find((item) => item.source === "OBJECTIVE") : undefined;
      const latestAi = submitted ? answer?.evaluations.find((item) => item.source === "AI") : undefined;
      return {
        id: question.id, position: question.position, kind: question.kind, selectionMode: question.selectionMode,
        responseLength: question.responseLength, promptMarkdown: question.promptMarkdown,
        options: question.options.map((option) => ({ id: option.id, position: option.position, bodyMarkdown: option.bodyMarkdown, ...(submitted ? { isCorrect: option.isCorrect } : {}) })),
        answer: { responseMarkdown: answer?.responseMarkdown ?? null, selectedOptionIds: answer?.selections.map((item) => item.optionId) ?? [] },
        ...(submitted ? {
          referenceAnswerMarkdown: question.referenceAnswerMarkdown, explanationMarkdown: question.explanationMarkdown,
          verdict: objectiveResult?.verdict ?? latestAi?.verdict ?? (answer?.responseMarkdown?.trim() ? "NEEDS_REVIEW" : "UNANSWERED"),
          scorePercent: objectiveResult?.scorePercent ?? latestAi?.scorePercent ?? null,
          latestFeedback: latestAi ? { verdict: latestAi.verdict, scorePercent: latestAi.scorePercent, feedbackMarkdown: latestAi.feedbackMarkdown, createdAt: latestAi.createdAt } : null,
        } : {}),
      };
    }),
  };
}

export async function listAttempts(db: QuizDb, userId: string, quizId: string, input: { cursor?: string; take?: number } = {}) {
  const take = input.take ?? 30;
  if (!Number.isInteger(take) || take < 1 || take > 100) throw new QuizError(422, "take must be between 1 and 100");
  if (input.cursor) {
    const cursor = await db.quiz_attempt.findFirst({ where: { id: input.cursor, userId, revision: { quizId } }, select: { id: true } });
    if (!cursor) throw new QuizError(422, "Invalid attempt cursor");
  }
  const rows = await db.quiz_attempt.findMany({
    where: { userId, revision: { quizId } },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }], take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: { revision: { select: { revisionNo: true, title: true } } },
  });
  return {
    items: rows.slice(0, take).map((row) => ({ id: row.id, status: row.status, startedAt: row.startedAt, submittedAt: row.submittedAt, revisionNo: row.revision.revisionNo, title: row.revision.title })),
    nextCursor: rows.length > take ? rows[take - 1].id : null,
  };
}
