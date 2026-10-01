import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import type { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { createQuiz } from "./quiz-service";
import { saveAttemptAnswer, startAttempt, submitAttempt, getAttempt } from "./attempt-service";
import { getEvaluationContext, getEvaluationHistory, recordEvaluations } from "./evaluation-service";

const requireClient = createRequire(import.meta.url);
const Client = requireClient(process.env.QUIZ_TEST_CLIENT_MODULE || "@prisma/client").PrismaClient as typeof PrismaClient;

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("stores atomic, idempotent, append-only feedback without changing objective grades", async () => {
  const db = new Client();
  const rollback = new Error("evaluation fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.appuser.create({ data: { id: randomUUID(), username: `q${randomUUID().slice(0, 12)}`, password: "0000" } });
      const page = await tx.page.create({ data: { id: randomUUID(), userId: owner.id, title: "Evaluation fixture", content: "Original page", childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
      const quiz = await createQuiz(tx, owner.id, page.id, { title: "Paper", questions: [
        { kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "Choose", explanationMarkdown: "Because", options: [{ bodyMarkdown: "Yes", isCorrect: true }, { bodyMarkdown: "No", isCorrect: false }] },
        { kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Explain", referenceAnswerMarkdown: "Reference", explanationMarkdown: "Details", options: [] },
      ] });
      const attempt = await startAttempt(tx, owner.id, quiz.quizId, randomUUID());
      const [objective, subjective] = quiz.questions;
      await saveAttemptAnswer(tx, owner.id, attempt.id, { questionId: objective.id, selectedOptionIds: [objective.options[0].id] });
      await saveAttemptAnswer(tx, owner.id, attempt.id, { questionId: subjective.id, responseMarkdown: "My answer" });
      await expect(getEvaluationContext(tx, owner.id, attempt.id)).rejects.toMatchObject({ status: 409 });
      await submitAttempt(tx, owner.id, attempt.id);
      expect((await getEvaluationContext(tx, owner.id, attempt.id)).questions[1].referenceAnswerMarkdown).toBe("Reference");
      const requestKey = randomUUID();
      const batch = { requestKey, modelId: "test-model", promptVersion: "v1", evaluations: [
        { questionId: objective.id, verdict: "CORRECT" as const, scorePercent: 100, feedbackMarkdown: "Correct **reasoning**." },
        { questionId: subjective.id, verdict: "PARTIAL" as const, scorePercent: 60, feedbackMarkdown: "Mention the missing step." },
      ] };
      await expect(recordEvaluations(tx, owner.id, attempt.id, { ...batch, evaluations: [batch.evaluations[0], { ...batch.evaluations[1], questionId: randomUUID() }] })).rejects.toMatchObject({ status: 422 });
      expect(await tx.quiz_answer_evaluation.count({ where: { source: "AI", answer: { attemptId: attempt.id } } })).toBe(0);
      await expect(recordEvaluations(tx, owner.id, attempt.id, { ...batch, evaluations: [{ ...batch.evaluations[0], verdict: "INCORRECT" }] })).rejects.toMatchObject({ status: 422 });
      const first = await recordEvaluations(tx, owner.id, attempt.id, batch);
      expect(first.replayed).toBe(false);
      expect((await recordEvaluations(tx, owner.id, attempt.id, batch)).replayed).toBe(true);
      await expect(recordEvaluations(tx, owner.id, attempt.id, { ...batch, evaluations: [{ ...batch.evaluations[0], scorePercent: 0 }, batch.evaluations[1]] })).rejects.toMatchObject({ status: 422 });
      await expect(recordEvaluations(tx, owner.id, attempt.id, { ...batch, evaluations: [{ ...batch.evaluations[1], feedbackMarkdown: "Different" }] })).rejects.toMatchObject({ status: 409 });
      await recordEvaluations(tx, owner.id, attempt.id, { requestKey: randomUUID(), evaluations: [{ questionId: subjective.id, verdict: "NEEDS_REVIEW", feedbackMarkdown: "A person should check this." }] });
      const history = await getEvaluationHistory(tx, owner.id, attempt.id);
      expect(history.filter((item) => item.source === "AI")).toHaveLength(3);
      expect((await getAttempt(tx, owner.id, attempt.id)).questions[0].verdict).toBe("CORRECT");
      expect((await getAttempt(tx, owner.id, attempt.id)).questions[1].verdict).toBe("NEEDS_REVIEW");
      expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).content).toBe("Original page");
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await db.$disconnect(); }
});
