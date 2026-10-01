import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import type { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { applyQuizChanges, archiveQuiz, createQuiz, getQuizRevision, listQuizzesForPage } from "./quiz-service";

// Use the normal generated client in CI. An isolated output can be selected on
// Windows when a running backend has locked the default query-engine DLL.
const requireClient = createRequire(import.meta.url);
const Client = requireClient(process.env.QUIZ_TEST_CLIENT_MODULE || "@prisma/client").PrismaClient as typeof PrismaClient;

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("stores immutable quiz revisions and rolls the complete fixture back", async () => {
  const db = new Client();
  const rollback = new Error("quiz fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.appuser.create({ data: { id: randomUUID(), username: `q${randomUUID().slice(0, 12)}`, password: "0000" } });
      const stranger = await tx.appuser.create({ data: { id: randomUUID(), username: `q${randomUUID().slice(0, 12)}`, password: "0000" } });
      const page = await tx.page.create({ data: { id: randomUUID(), userId: owner.id, title: "Quiz fixture", content: "## Page only", childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
      const first = await createQuiz(tx, owner.id, page.id, {
        title: "First paper",
        instructionsMarkdown: "Read **carefully**.",
        questions: [{
          kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "What is `x`?",
          explanationMarkdown: "Because **x** is defined this way.",
          options: [{ bodyMarkdown: "One", isCorrect: true }, { bodyMarkdown: "Two", isCorrect: false }],
        }],
      });
      await expect(createQuiz(tx, stranger.id, page.id, {
        title: "Unauthorized", questions: [{ kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Q", referenceAnswerMarkdown: "A", explanationMarkdown: "E", options: [] }],
      })).rejects.toMatchObject({ status: 404 });
      expect(first.revisionNo).toBe(1);
      expect(first.questions[0].options).toHaveLength(2);
      const originalId = first.questions[0].id;
      const originalRevisionId = first.revisionId;
      const attempt = await tx.quiz_attempt.create({
        data: { revisionId: originalRevisionId, userId: owner.id, startRequestKey: randomUUID() },
      });
      const answer = await tx.quiz_attempt_answer.create({
        data: { attemptId: attempt.id, questionId: originalId },
      });
      await tx.quiz_answer_selection.create({
        data: { answerId: answer.id, optionId: first.questions[0].options[0].id },
      });
      await tx.quiz_answer_evaluation.create({
        data: { answerId: answer.id, requestKey: randomUUID(), source: "OBJECTIVE", verdict: "CORRECT", scorePercent: 100, feedbackMarkdown: "Correct **answer**." },
      });

      const learner = await getQuizRevision(tx, { quizId: first.quizId, view: "learner" });
      expect(JSON.stringify(learner)).not.toMatch(/isCorrect|referenceAnswerMarkdown|explanationMarkdown/);
      await expect(getQuizRevision(tx, { quizId: first.quizId, userId: stranger.id, view: "author" })).rejects.toMatchObject({ status: 404 });

      const changed = await applyQuizChanges(tx, owner.id, first.quizId, {
        expectedRevisionNo: 1,
        operations: [
          { type: "replaceQuestion", questionId: originalId, question: {
            kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Explain `x`.",
            referenceAnswerMarkdown: "The clear answer.", explanationMarkdown: "A more detailed explanation.", options: [],
          } },
          { type: "addQuestion", afterQuestionId: originalId, question: {
            kind: "OBJECTIVE", selectionMode: "MULTIPLE", promptMarkdown: "Select **both**.",
            explanationMarkdown: "Both are correct.",
            options: [{ bodyMarkdown: "A", isCorrect: true }, { bodyMarkdown: "B", isCorrect: true }],
          } },
        ],
      });
      expect(changed.revisionNo).toBe(2);
      expect(changed.questions).toHaveLength(2);
      expect(changed.questions[0].referenceAnswerMarkdown).toBe("The clear answer.");
      expect(changed.questions[0].id).not.toBe(originalId);
      expect(changed.questions[1].options).toHaveLength(2);
      expect((await tx.quiz_revision.findUniqueOrThrow({ where: { id: originalRevisionId }, include: { questions: { include: { options: true } } } })).questions[0].options[0].isCorrect).toBe(true);
      expect((await getQuizRevision(tx, { quizId: first.quizId, userId: owner.id, view: "author", revisionNo: 1 })).questions[0].promptMarkdown).toBe("What is `x`?");
      await expect(applyQuizChanges(tx, owner.id, first.quizId, { expectedRevisionNo: 1, operations: [{ type: "removeQuestion", questionId: originalId }] })).rejects.toMatchObject({ status: 409 });
      await expect(applyQuizChanges(tx, stranger.id, first.quizId, { expectedRevisionNo: 2, operations: [{ type: "setMetadata", title: "No" }] })).rejects.toMatchObject({ status: 404 });
      await expect(applyQuizChanges(tx, owner.id, first.quizId, { expectedRevisionNo: 2, operations: [
        { type: "removeQuestion", questionId: changed.questions[0].id },
        { type: "removeQuestion", questionId: changed.questions[1].id },
      ] })).rejects.toMatchObject({ status: 422 });
      expect((await tx.quiz.findUniqueOrThrow({ where: { id: first.quizId } })).currentRevisionNo).toBe(2);

      const second = await createQuiz(tx, owner.id, page.id, {
        title: "Second paper", questions: [{ kind: "SUBJECTIVE", responseLength: "LONG", promptMarkdown: "Discuss.", referenceAnswerMarkdown: "Answer.", explanationMarkdown: "Explanation.", options: [] }],
      });
      const pageOne = await listQuizzesForPage(tx, { pageId: page.id, take: 1 });
      expect(pageOne.items.map((item) => item.title)).toEqual(["First paper"]);
      expect(pageOne.nextCursor).toBe(first.quizId);
      const pageTwo = await listQuizzesForPage(tx, { pageId: page.id, take: 1, cursor: pageOne.nextCursor! });
      expect(pageTwo.items.map((item) => item.id)).toEqual([second.quizId]);

      const raceQuiz = await createQuiz(tx, owner.id, page.id, {
        title: "Concurrent paper", questions: [{ kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Q", referenceAnswerMarkdown: "A", explanationMarkdown: "E", options: [] }],
      });
      const concurrent = await Promise.allSettled([
        applyQuizChanges(tx, owner.id, raceQuiz.quizId, { expectedRevisionNo: 1, operations: [{ type: "setMetadata", title: "First writer" }] }),
        applyQuizChanges(tx, owner.id, raceQuiz.quizId, { expectedRevisionNo: 1, operations: [{ type: "setMetadata", title: "Second writer" }] }),
      ]);
      expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect((await tx.quiz.findUniqueOrThrow({ where: { id: raceQuiz.quizId } })).currentRevisionNo).toBe(2);

      await archiveQuiz(tx, owner.id, first.quizId, 2);
      await expect(applyQuizChanges(tx, owner.id, first.quizId, { expectedRevisionNo: 2, operations: [{ type: "setMetadata", title: "Too late" }] })).rejects.toMatchObject({ status: 404 });
      expect((await listQuizzesForPage(tx, { pageId: page.id })).items.map((item) => item.id)).toEqual([second.quizId, raceQuiz.quizId]);
      expect((await listQuizzesForPage(tx, { pageId: page.id, userId: owner.id, archivedOnly: true })).items.map((item) => item.id)).toEqual([first.quizId]);
      expect((await listQuizzesForPage(tx, { pageId: page.id, userId: stranger.id, archivedOnly: true })).items).toHaveLength(0);
      await expect(listQuizzesForPage(tx, { pageId: page.id, archivedOnly: true })).rejects.toMatchObject({ status: 404 });
      await expect(getQuizRevision(tx, { quizId: first.quizId, view: "learner" })).rejects.toMatchObject({ status: 404 });
      expect((await getQuizRevision(tx, { quizId: first.quizId, userId: owner.id, view: "author" })).revisionNo).toBe(2);
      expect((await tx.quiz_attempt.findUniqueOrThrow({ where: { id: attempt.id } })).revisionId).toBe(originalRevisionId);
      expect(await tx.quiz_answer_selection.count({ where: { answerId: answer.id } })).toBe(1);
      expect(await tx.quiz_answer_evaluation.count({ where: { answerId: answer.id } })).toBe(1);
      expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).content).toBe("## Page only");
      for (let index = 0; index < 31; index++) {
        await createQuiz(tx, owner.id, page.id, { title: `Extra ${index}`, questions: [{ kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Q", referenceAnswerMarkdown: "A", explanationMarkdown: "E", options: [] }] });
      }
      const firstThirty = await listQuizzesForPage(tx, { pageId: page.id, take: 30 });
      expect(firstThirty.items).toHaveLength(30);
      expect(firstThirty.nextCursor).not.toBeNull();
      expect((await listQuizzesForPage(tx, { pageId: page.id, take: 30, cursor: firstThirty.nextCursor! })).items).toHaveLength(3);
      throw rollback;
    }, { timeout: 30_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await db.$disconnect();
  }
});
