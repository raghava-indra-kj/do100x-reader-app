import { Prisma, PrismaClient } from "@prisma/client";
import { applyChangesToDraft, applyQuizChangesSchema, createQuizSchema, questionInputSchema, QuizError, type ApplyQuizChangesInput, type CreateQuizInput, type QuestionInput, type QuizDraft } from "./quiz-contract";

export type QuizDb = PrismaClient | Prisma.TransactionClient;
type QuizTx = Prisma.TransactionClient;

const questionsInclude = {
  questions: { orderBy: { position: "asc" as const }, include: { options: { orderBy: { position: "asc" as const } } } },
};

async function transact<T>(db: QuizDb, run: (tx: QuizTx) => Promise<T>): Promise<T> {
  if ("$transaction" in db) return db.$transaction((tx) => run(tx));
  return run(db);
}

function parseInput<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new QuizError(422, result.error.issues[0]?.message ?? "Invalid quiz input");
  return result.data;
}

function isWriteConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code);
}

async function loadPage(db: QuizDb, pageId: string) {
  const page = await db.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, userId: true, parentId: true, isPublic: true },
  });
  if (!page) throw new QuizError(404, "Page not found");
  return page;
}

async function requirePageOwner(db: QuizDb, pageId: string, userId: string) {
  const page = await loadPage(db, pageId);
  if (page.userId !== userId) throw new QuizError(404, "Page not found");
  return page;
}

async function requirePageReader(db: QuizDb, pageId: string, userId?: string) {
  const page = await loadPage(db, pageId);
  if (userId === page.userId || page.isPublic) return page;
  const visited = new Set([page.id]);
  let parentId = page.parentId;
  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const parent = await db.page.findFirst({
      where: { id: parentId, deletedAt: null },
      select: { id: true, parentId: true, isPublic: true },
    });
    if (!parent) break;
    if (parent.isPublic) return page;
    parentId = parent.parentId;
  }
  throw new QuizError(404, "Page not found");
}

function nestedQuestions(questions: QuestionInput[]) {
  return questions.map((question, position) => ({
    position,
    kind: question.kind,
    selectionMode: question.kind === "OBJECTIVE" ? question.selectionMode : null,
    responseLength: question.kind === "SUBJECTIVE" ? question.responseLength : null,
    promptMarkdown: question.promptMarkdown,
    referenceAnswerMarkdown: question.kind === "SUBJECTIVE" ? question.referenceAnswerMarkdown : null,
    explanationMarkdown: question.explanationMarkdown,
    options: { create: question.options.map((option, optionPosition) => ({ position: optionPosition, bodyMarkdown: option.bodyMarkdown, isCorrect: option.isCorrect })) },
  }));
}

function authorRevision(quizId: string, revision: Awaited<ReturnType<typeof loadRevision>>) {
  return {
    quizId,
    revisionId: revision.id,
    revisionNo: revision.revisionNo,
    title: revision.title,
    instructionsMarkdown: revision.instructionsMarkdown,
    createdAt: revision.createdAt,
    questions: revision.questions.map((question) => ({
      id: question.id,
      position: question.position,
      kind: question.kind,
      selectionMode: question.selectionMode,
      responseLength: question.responseLength,
      promptMarkdown: question.promptMarkdown,
      referenceAnswerMarkdown: question.referenceAnswerMarkdown,
      explanationMarkdown: question.explanationMarkdown,
      options: question.options.map((option) => ({ id: option.id, position: option.position, bodyMarkdown: option.bodyMarkdown, isCorrect: option.isCorrect })),
    })),
  };
}

function learnerRevision(quizId: string, revision: Awaited<ReturnType<typeof loadRevision>>) {
  return {
    quizId,
    revisionId: revision.id,
    revisionNo: revision.revisionNo,
    title: revision.title,
    instructionsMarkdown: revision.instructionsMarkdown,
    questions: revision.questions.map((question) => ({
      id: question.id,
      position: question.position,
      kind: question.kind,
      selectionMode: question.selectionMode,
      responseLength: question.responseLength,
      promptMarkdown: question.promptMarkdown,
      options: question.options.map((option) => ({ id: option.id, position: option.position, bodyMarkdown: option.bodyMarkdown })),
    })),
  };
}

async function loadRevision(db: QuizDb, quizId: string, revisionNo: number) {
  const revision = await db.quiz_revision.findUnique({
    where: { quizId_revisionNo: { quizId, revisionNo } },
    include: questionsInclude,
  });
  if (!revision) throw new QuizError(404, "Quiz revision not found");
  return revision;
}

function revisionDraft(revision: Awaited<ReturnType<typeof loadRevision>>): QuizDraft {
  return {
    title: revision.title,
    instructionsMarkdown: revision.instructionsMarkdown,
    questions: revision.questions.map((question) => {
      const value = questionInputSchema.safeParse({
        kind: question.kind,
        selectionMode: question.selectionMode,
        responseLength: question.responseLength,
        promptMarkdown: question.promptMarkdown,
        referenceAnswerMarkdown: question.referenceAnswerMarkdown,
        explanationMarkdown: question.explanationMarkdown,
        options: question.options.map((option) => ({ bodyMarkdown: option.bodyMarkdown, isCorrect: option.isCorrect })),
      });
      if (!value.success) throw new Error(`Stored question ${question.id} violates quiz invariants`);
      return { sourceId: question.id, value: value.data };
    }),
  };
}

/** Creates a quiz and its first complete revision in one transaction. */
export async function createQuiz(db: QuizDb, userId: string, pageId: string, input: CreateQuizInput) {
  const value = parseInput(createQuizSchema, input);
  return transact(db, async (tx) => {
    await requirePageOwner(tx, pageId, userId);
    const order = await tx.quiz.aggregate({ where: { pageId }, _max: { sortOrder: true } });
    const created = await tx.quiz.create({
      data: {
        pageId,
        sortOrder: (order._max.sortOrder ?? -1) + 1,
        revisions: { create: { revisionNo: 1, title: value.title, instructionsMarkdown: value.instructionsMarkdown, questions: { create: nestedQuestions(value.questions) } } },
      },
    });
    return { ...authorRevision(created.id, await loadRevision(tx, created.id, 1)), pageId, sortOrder: created.sortOrder, archivedAt: created.archivedAt };
  });
}

export interface ListQuizzesInput {
  pageId: string;
  userId?: string;
  cursor?: string;
  take?: number;
  archivedOnly?: boolean;
}

/** Returns only active quizzes, with a stable cursor and no answer keys. */
export async function listQuizzesForPage(db: QuizDb, input: ListQuizzesInput) {
  const page = await requirePageReader(db, input.pageId, input.userId);
  if (input.archivedOnly && !input.userId) throw new QuizError(404, "Page not found");
  const archiveFilter = input.archivedOnly ? { not: null } : null;
  const where: Prisma.quizWhereInput = {
    pageId: input.pageId,
    archivedAt: archiveFilter,
    ...(input.archivedOnly && input.userId !== page.userId ? { revisions: { some: { attempts: { some: { userId: input.userId } } } } } : {}),
  };
  const take = input.take ?? 50;
  if (!Number.isInteger(take) || take < 1 || take > 100) throw new QuizError(422, "take must be between 1 and 100");
  if (input.cursor) {
    const cursor = await db.quiz.findFirst({ where: { ...where, id: input.cursor }, select: { id: true } });
    if (!cursor) throw new QuizError(422, "Invalid quiz cursor");
  }
  const rows = await db.quiz.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const selected = rows.slice(0, take);
  const revisions = selected.length ? await db.quiz_revision.findMany({
    where: { OR: selected.map((quiz) => ({ quizId: quiz.id, revisionNo: quiz.currentRevisionNo })) },
    select: { quizId: true, title: true, revisionNo: true, id: true },
  }) : [];
  const byQuizId = new Map(revisions.map((revision) => [revision.quizId, revision]));
  return {
    items: selected.map((quiz) => {
      const revision = byQuizId.get(quiz.id);
      if (!revision) throw new Error(`Quiz ${quiz.id} has no current revision`);
      return { id: quiz.id, pageId: quiz.pageId, sortOrder: quiz.sortOrder, archivedAt: quiz.archivedAt, revisionId: revision.id, revisionNo: revision.revisionNo, title: revision.title };
    }),
    nextCursor: rows.length > take ? selected[selected.length - 1].id : null,
  };
}

export async function getQuizRevision(db: QuizDb, input: { quizId: string; userId?: string; view: "author" | "learner"; revisionNo?: number }) {
  const quiz = await db.quiz.findUnique({ where: { id: input.quizId } });
  if (!quiz) throw new QuizError(404, "Quiz not found");
  if (input.view === "author") await requirePageOwner(db, quiz.pageId, input.userId ?? "");
  else {
    await requirePageReader(db, quiz.pageId, input.userId);
    if (quiz.archivedAt || (input.revisionNo !== undefined && input.revisionNo !== quiz.currentRevisionNo)) throw new QuizError(404, "Quiz not found");
  }
  const revisionNo = input.revisionNo ?? quiz.currentRevisionNo;
  if (!Number.isInteger(revisionNo) || revisionNo < 1 || revisionNo > quiz.currentRevisionNo) throw new QuizError(404, "Quiz revision not found");
  const revision = await loadRevision(db, quiz.id, revisionNo);
  return input.view === "author" ? authorRevision(quiz.id, revision) : learnerRevision(quiz.id, revision);
}

/** Copies the current full paper into a new immutable revision, guarded by CAS. */
export async function applyQuizChanges(db: QuizDb, userId: string, quizId: string, input: ApplyQuizChangesInput) {
  const value = parseInput(applyQuizChangesSchema, input);
  try {
    return await transact(db, async (tx) => {
      const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
      if (!quiz) throw new QuizError(404, "Quiz not found");
      await requirePageOwner(tx, quiz.pageId, userId);
      if (quiz.archivedAt) throw new QuizError(404, "Quiz not found");
      if (quiz.currentRevisionNo !== value.expectedRevisionNo) throw new QuizError(409, "Quiz changed. Fetch the current revision before editing");

      const current = await loadRevision(tx, quiz.id, quiz.currentRevisionNo);
      const draft = applyChangesToDraft(revisionDraft(current), value.operations);
      const nextNo = quiz.currentRevisionNo + 1;
      const updated = await tx.quiz.updateMany({
        where: { id: quiz.id, currentRevisionNo: quiz.currentRevisionNo, archivedAt: null },
        data: { currentRevisionNo: nextNo },
      });
      if (updated.count !== 1) throw new QuizError(409, "Quiz changed. Fetch the current revision before editing");
      await tx.quiz_revision.create({
        data: {
          quizId: quiz.id,
          revisionNo: nextNo,
          title: draft.title,
          instructionsMarkdown: draft.instructionsMarkdown,
          questions: { create: nestedQuestions(draft.questions.map((question) => question.value)) },
        },
      });
      return authorRevision(quiz.id, await loadRevision(tx, quiz.id, nextNo));
    });
  } catch (error) {
    if (isWriteConflict(error)) throw new QuizError(409, "Quiz changed. Fetch the current revision before editing");
    throw error;
  }
}

/** Hides a quiz from new attempts; revisions and existing attempts remain intact. */
export async function archiveQuiz(db: QuizDb, userId: string, quizId: string, expectedRevisionNo: number) {
  if (!Number.isInteger(expectedRevisionNo) || expectedRevisionNo < 1) throw new QuizError(422, "Invalid revision number");
  try {
    return await transact(db, async (tx) => {
      const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
      if (!quiz) throw new QuizError(404, "Quiz not found");
      await requirePageOwner(tx, quiz.pageId, userId);
      if (quiz.archivedAt) throw new QuizError(404, "Quiz not found");
      const archivedAt = new Date();
      const result = await tx.quiz.updateMany({
        where: { id: quizId, currentRevisionNo: expectedRevisionNo, archivedAt: null },
        data: { archivedAt },
      });
      if (result.count !== 1) throw new QuizError(409, "Quiz changed. Fetch the current revision before archiving");
      return { id: quizId, archivedAt, currentRevisionNo: expectedRevisionNo };
    });
  } catch (error) {
    if (isWriteConflict(error)) throw new QuizError(409, "Quiz changed. Fetch the current revision before archiving");
    throw error;
  }
}

/** Swaps two active quizzes on one owned page without changing either paper. */
export async function swapQuizOrder(db: QuizDb, userId: string, firstId: string, secondId: string) {
  if (firstId === secondId) throw new QuizError(422, "Choose two different quizzes");
  return transact(db, async (tx) => {
    const rows = await tx.quiz.findMany({ where: { id: { in: [firstId, secondId] }, archivedAt: null } });
    if (rows.length !== 2 || rows[0].pageId !== rows[1].pageId) throw new QuizError(404, "Quizzes not found on the same page");
    await requirePageOwner(tx, rows[0].pageId, userId);
    const first = rows.find((row) => row.id === firstId)!;
    const second = rows.find((row) => row.id === secondId)!;
    if (first.sortOrder === second.sortOrder) throw new QuizError(409, "Quiz order changed. Reload before reordering");
    const firstUpdated = await tx.quiz.updateMany({ where: { id: first.id, sortOrder: first.sortOrder, archivedAt: null }, data: { sortOrder: second.sortOrder } });
    const secondUpdated = await tx.quiz.updateMany({ where: { id: second.id, sortOrder: second.sortOrder, archivedAt: null }, data: { sortOrder: first.sortOrder } });
    if (firstUpdated.count !== 1 || secondUpdated.count !== 1) throw new QuizError(409, "Quiz order changed. Reload before reordering");
    return { firstId, secondId };
  });
}
