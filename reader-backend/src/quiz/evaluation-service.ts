import { Prisma } from "@prisma/client";
import { z } from "zod";
import { QuizError } from "./quiz-contract";
import { getAttempt } from "./attempt-service";
import type { QuizDb } from "./quiz-service";

const uuid = z.string().uuid();
export const evaluationBatchSchema = z.object({
  requestKey: uuid,
  modelId: z.string().trim().min(1).max(255).nullable().optional(),
  promptVersion: z.string().trim().min(1).max(50).nullable().optional(),
  evaluations: z.array(z.object({
    questionId: uuid,
    verdict: z.enum(["CORRECT", "PARTIAL", "INCORRECT", "UNANSWERED", "NEEDS_REVIEW"]),
    scorePercent: z.number().int().min(0).max(100).nullable().optional(),
    feedbackMarkdown: z.string().refine((value) => value.trim().length > 0, "Enter feedback."),
  }).strict()).min(1),
}).strict();
export type EvaluationBatchInput = z.input<typeof evaluationBatchSchema>;

async function transact<T>(db: QuizDb, run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return "$transaction" in db ? db.$transaction((tx) => run(tx)) : run(db);
}

/** The agent sees only a submitted, respondent-owned, pinned paper. */
export async function getEvaluationContext(db: QuizDb, userId: string, attemptId: string) {
  const attempt = await getAttempt(db, userId, attemptId);
  if (attempt.status !== "SUBMITTED") throw new QuizError(409, "Submit the attempt before adding feedback.");
  return attempt;
}

/** Append a valid batch, or replay the exact same request without new rows. */
export async function recordEvaluations(db: QuizDb, userId: string, attemptId: string, input: EvaluationBatchInput) {
  const parsed = evaluationBatchSchema.safeParse(input);
  if (!parsed.success) throw new QuizError(422, parsed.error.issues[0]?.message ?? "Check the feedback entries and try again.");
  const value = parsed.data;
  if (new Set(value.evaluations.map((item) => item.questionId)).size !== value.evaluations.length) throw new QuizError(422, "Each question can appear only once in this feedback batch.");
  try {
    return await transact(db, async (tx) => {
      const locked = await tx.quiz_attempt.updateMany({ where: { id: attemptId, userId, status: "SUBMITTED" }, data: { status: "SUBMITTED" } });
      if (locked.count !== 1) {
        const found = await tx.quiz_attempt.findFirst({ where: { id: attemptId, userId }, select: { status: true } });
        if (!found) throw new QuizError(404, "Attempt not found");
        throw new QuizError(409, "Submit the attempt before adding feedback.");
      }
      const attempt = await tx.quiz_attempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { revision: { include: { questions: { include: { options: true } } } }, answers: { include: { evaluations: true } } },
      });
      const questionById = new Map(attempt.revision.questions.map((question) => [question.id, question]));
      const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
      const rows: Prisma.quiz_answer_evaluationCreateManyInput[] = [];
      for (const item of value.evaluations) {
        const question = questionById.get(item.questionId);
        const answer = answerByQuestion.get(item.questionId);
        if (!question || !answer) throw new QuizError(422, "This question isn’t part of this submission.");
        let scorePercent = item.scorePercent ?? null;
        if (question.kind === "OBJECTIVE") {
          const fixed = answer.evaluations.find((entry) => entry.source === "OBJECTIVE");
          if (!fixed) throw new Error(`The result for answer ${answer.id} is unavailable.`);
          if (item.verdict !== fixed.verdict || (item.scorePercent !== undefined && item.scorePercent !== fixed.scorePercent)) {
            throw new QuizError(422, "AI feedback can’t change an objective question’s result.");
          }
          scorePercent = fixed.scorePercent;
        } else {
          const blank = !answer.responseMarkdown?.trim();
          if (blank && item.verdict !== "UNANSWERED" || !blank && item.verdict === "UNANSWERED") throw new QuizError(422, "The feedback result must reflect whether an answer was submitted.");
          if (item.verdict === "NEEDS_REVIEW" && scorePercent !== null) throw new QuizError(422, "An uncertain result can’t have a numeric score.");
        }
        rows.push({ answerId: answer.id, requestKey: value.requestKey, source: "AI" as const, verdict: item.verdict, scorePercent, feedbackMarkdown: item.feedbackMarkdown, modelId: value.modelId ?? null, promptVersion: value.promptVersion ?? null });
      }
      const existing = await tx.quiz_answer_evaluation.findMany({ where: { answerId: { in: attempt.answers.map((answer) => answer.id) }, requestKey: value.requestKey }, include: { answer: { select: { questionId: true } } } });
      if (existing.length) {
        const replay = existing.length === value.evaluations.length && value.evaluations.every((item) => {
          const row = existing.find((entry) => entry.answer.questionId === item.questionId);
          const prepared = rows.find((entry) => entry.answerId === answerByQuestion.get(item.questionId)?.id);
          return row && row.source === "AI" && row.verdict === item.verdict && row.feedbackMarkdown === item.feedbackMarkdown && row.modelId === (value.modelId ?? null) && row.promptVersion === (value.promptVersion ?? null)
            && row.scorePercent === prepared?.scorePercent;
        });
        if (!replay) throw new QuizError(409, "This feedback request conflicts with an earlier submission.");
        return { attemptId, requestKey: value.requestKey, replayed: true, evaluations: existing.map((row) => ({ questionId: row.answer.questionId, verdict: row.verdict, scorePercent: row.scorePercent, feedbackMarkdown: row.feedbackMarkdown, id: row.id })) };
      }
      await tx.quiz_answer_evaluation.createMany({ data: rows });
      const saved = await tx.quiz_answer_evaluation.findMany({ where: { requestKey: value.requestKey, answerId: { in: rows.map((row) => row.answerId) } }, include: { answer: { select: { questionId: true } } } });
      return { attemptId, requestKey: value.requestKey, replayed: false, evaluations: saved.map((row) => ({ questionId: row.answer.questionId, verdict: row.verdict, scorePercent: row.scorePercent, feedbackMarkdown: row.feedbackMarkdown, id: row.id })) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new QuizError(409, "Feedback has changed. Load the latest feedback before trying again.");
    throw error;
  }
}

export async function getEvaluationHistory(db: QuizDb, userId: string, attemptId: string) {
  await getEvaluationContext(db, userId, attemptId);
  const rows = await db.quiz_answer_evaluation.findMany({
    where: { answer: { attemptId } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { answer: { select: { questionId: true } } },
  });
  return rows.map((row) => ({ id: row.id, questionId: row.answer.questionId, source: row.source, verdict: row.verdict, scorePercent: row.scorePercent, feedbackMarkdown: row.feedbackMarkdown, modelId: row.modelId, promptVersion: row.promptVersion, createdAt: row.createdAt }));
}
