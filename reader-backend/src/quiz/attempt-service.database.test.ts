import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import type { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { applyQuizChanges, archiveQuiz, createQuiz } from "./quiz-service";
import { getAttempt, listAttempts, saveAttemptAnswer, startAttempt, submitAttempt } from "./attempt-service";

const requireClient = createRequire(import.meta.url);
const Client = requireClient(process.env.QUIZ_TEST_CLIENT_MODULE || "@prisma/client").PrismaClient as typeof PrismaClient;

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("pins attempts, validates selections, grades exact sets, and preserves retries", async () => {
  const db = new Client();
  const rollback = new Error("attempt fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.appuser.create({ data: { id: randomUUID(), username: `q${randomUUID().slice(0, 12)}`, password: "0000" } });
      const page = await tx.page.create({ data: { id: randomUUID(), userId: owner.id, title: "Attempt fixture", content: "Page unchanged", childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
      const quiz = await createQuiz(tx, owner.id, page.id, {
        title: "Mixed paper", questions: [
          { kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "Single?", explanationMarkdown: "One is right", options: [{ bodyMarkdown: "A", isCorrect: true }, { bodyMarkdown: "B", isCorrect: false }] },
          { kind: "OBJECTIVE", selectionMode: "MULTIPLE", promptMarkdown: "Both?", explanationMarkdown: "Both right", options: [{ bodyMarkdown: "C", isCorrect: true }, { bodyMarkdown: "D", isCorrect: true }, { bodyMarkdown: "E", isCorrect: false }, { bodyMarkdown: "F", isCorrect: false }] },
          { kind: "SUBJECTIVE", responseLength: "LONG", promptMarkdown: "Explain.", referenceAnswerMarkdown: "Reference", explanationMarkdown: "Detailed", options: [] },
        ],
      });
      const requestKey = randomUUID();
      const started = await startAttempt(tx, owner.id, quiz.quizId, requestKey);
      expect(started.revisionNo).toBe(1);
      expect(JSON.stringify(started)).not.toMatch(/isCorrect|referenceAnswerMarkdown|explanationMarkdown/);
      expect((await startAttempt(tx, owner.id, quiz.quizId, requestKey)).id).toBe(started.id);
      const [single, multi, subjective] = quiz.questions;
      await expect(saveAttemptAnswer(tx, owner.id, started.id, { questionId: single.id, selectedOptionIds: [multi.options[0].id] })).rejects.toMatchObject({ status: 422 });
      await expect(saveAttemptAnswer(tx, owner.id, started.id, { questionId: single.id, selectedOptionIds: [single.options[0].id, single.options[1].id] })).rejects.toMatchObject({ status: 422 });
      await saveAttemptAnswer(tx, owner.id, started.id, { questionId: single.id, selectedOptionIds: [single.options[0].id] });
      await saveAttemptAnswer(tx, owner.id, started.id, { questionId: multi.id, selectedOptionIds: [multi.options[0].id, multi.options[2].id] });
      await saveAttemptAnswer(tx, owner.id, started.id, { questionId: multi.id, selectedOptionIds: [multi.options[0].id, multi.options[1].id] });
      await saveAttemptAnswer(tx, owner.id, started.id, { questionId: subjective.id, responseMarkdown: "My **answer**." });
      await applyQuizChanges(tx, owner.id, quiz.quizId, { expectedRevisionNo: 1, operations: [{ type: "removeQuestion", questionId: subjective.id }] });
      const submitted = await submitAttempt(tx, owner.id, started.id);
      expect(submitted.status).toBe("SUBMITTED");
      expect(submitted.revisionNo).toBe(1);
      expect(submitted.questions).toHaveLength(3);
      expect(submitted.questions[0].verdict).toBe("CORRECT");
      expect(submitted.questions[1].verdict).toBe("CORRECT");
      expect(submitted.questions[2].verdict).toBe("NEEDS_REVIEW");
      expect(submitted.questions[2].referenceAnswerMarkdown).toBe("Reference");
      expect((await submitAttempt(tx, owner.id, started.id)).id).toBe(started.id);
      expect(await tx.quiz_answer_evaluation.count({ where: { answer: { attemptId: started.id }, source: "OBJECTIVE" } })).toBe(2);
      await expect(saveAttemptAnswer(tx, owner.id, started.id, { questionId: single.id, selectedOptionIds: [] })).rejects.toMatchObject({ status: 409 });
      const second = await startAttempt(tx, owner.id, quiz.quizId, randomUUID());
      expect(second.revisionNo).toBe(2);
      expect(second.questions).toHaveLength(2);
      const blank = await submitAttempt(tx, owner.id, second.id);
      expect(blank.questions.every((question) => question.verdict === "UNANSWERED")).toBe(true);
      expect((await listAttempts(tx, owner.id, quiz.quizId)).items).toHaveLength(2);
      await archiveQuiz(tx, owner.id, quiz.quizId, 2);
      await expect(startAttempt(tx, owner.id, quiz.quizId, randomUUID())).rejects.toMatchObject({ status: 404 });
      expect((await getAttempt(tx, owner.id, started.id)).status).toBe("SUBMITTED");
      const ten = await createQuiz(tx, owner.id, page.id, { title: "Ten options", questions: [{
        kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "Choose option ten.", explanationMarkdown: "The final choice is correct.",
        options: Array.from({ length: 10 }, (_, index) => ({ bodyMarkdown: `Option ${index + 1}`, isCorrect: index === 9 })),
      }] });
      const tenAttempt = await startAttempt(tx, owner.id, ten.quizId, randomUUID());
      await saveAttemptAnswer(tx, owner.id, tenAttempt.id, { questionId: ten.questions[0].id, selectedOptionIds: [ten.questions[0].options[9].id] });
      expect((await submitAttempt(tx, owner.id, tenAttempt.id)).questions[0].verdict).toBe("CORRECT");
      expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).content).toBe("Page unchanged");
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally { await db.$disconnect(); }
});
