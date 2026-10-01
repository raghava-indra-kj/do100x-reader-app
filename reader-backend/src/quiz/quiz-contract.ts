import { randomUUID } from "node:crypto";
import { z } from "zod";

const nonemptyMarkdown = z.string().refine((value) => value.trim().length > 0, "Markdown must not be empty");
const uuid = z.string().uuid();

const optionInput = z.object({
  bodyMarkdown: nonemptyMarkdown,
  isCorrect: z.boolean(),
}).strict();

const objectiveQuestion = z.object({
  kind: z.literal("OBJECTIVE"),
  selectionMode: z.enum(["SINGLE", "MULTIPLE"]),
  responseLength: z.null().optional(),
  promptMarkdown: nonemptyMarkdown,
  referenceAnswerMarkdown: z.null().optional(),
  explanationMarkdown: nonemptyMarkdown,
  options: z.array(optionInput).min(2).max(10),
}).strict().superRefine((question, ctx) => {
  const correctCount = question.options.filter((option) => option.isCorrect).length;
  if (question.selectionMode === "SINGLE" && correctCount !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Single-select questions need exactly one correct option" });
  }
  if (question.selectionMode === "MULTIPLE" && correctCount < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Multi-select questions need at least one correct option" });
  }
});

const subjectiveQuestion = z.object({
  kind: z.literal("SUBJECTIVE"),
  selectionMode: z.null().optional(),
  responseLength: z.enum(["SHORT", "LONG"]),
  promptMarkdown: nonemptyMarkdown,
  referenceAnswerMarkdown: nonemptyMarkdown,
  explanationMarkdown: nonemptyMarkdown,
  options: z.array(optionInput).length(0),
}).strict();

export const questionInputSchema = z.union([objectiveQuestion, subjectiveQuestion]);
export type QuestionInput = z.infer<typeof questionInputSchema>;

export const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(255),
  instructionsMarkdown: z.string().nullable().default(null),
  questions: z.array(questionInputSchema).min(1),
}).strict();
export type CreateQuizInput = z.input<typeof createQuizSchema>;
export type ValidQuizInput = z.output<typeof createQuizSchema>;

export const quizChangeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setMetadata"), title: z.string().trim().min(1).max(255).optional(), instructionsMarkdown: z.string().nullable().optional() }).strict(),
  z.object({ type: z.literal("addQuestion"), question: questionInputSchema, afterQuestionId: uuid.nullable().optional(), beforeQuestionId: uuid.optional() }).strict(),
  z.object({ type: z.literal("replaceQuestion"), questionId: uuid, question: questionInputSchema }).strict(),
  z.object({ type: z.literal("removeQuestion"), questionId: uuid }).strict(),
  z.object({ type: z.literal("moveQuestion"), questionId: uuid, beforeQuestionId: uuid.nullable().optional() }).strict(),
]);
export type QuizChange = z.infer<typeof quizChangeSchema>;

export const applyQuizChangesSchema = z.object({
  expectedRevisionNo: z.number().int().positive(),
  operations: z.array(quizChangeSchema).min(1),
}).strict();
export type ApplyQuizChangesInput = z.input<typeof applyQuizChangesSchema>;

export class QuizError extends Error {
  constructor(public readonly status: 404 | 409 | 422, message: string) {
    super(message);
    this.name = "QuizError";
  }
}

export interface DraftQuestion {
  sourceId: string;
  value: QuestionInput;
}

export interface QuizDraft {
  title: string;
  instructionsMarkdown: string | null;
  questions: DraftQuestion[];
}

/** Operations refer to IDs from one expected revision, never heading text or array positions. */
export function applyChangesToDraft(snapshot: QuizDraft, operations: QuizChange[]): QuizDraft {
  const draft: QuizDraft = {
    title: snapshot.title,
    instructionsMarkdown: snapshot.instructionsMarkdown,
    questions: snapshot.questions.map((question) => ({ ...question })),
  };
  const originalIds = new Set(snapshot.questions.map((question) => question.sourceId));
  const touched = new Map<string, Set<string>>();
  const lastAddedAfter = new Map<string, string>();

  const locate = (id: string): number => {
    if (!originalIds.has(id)) throw new QuizError(422, `Question ${id} is not in the expected revision`);
    const index = draft.questions.findIndex((question) => question.sourceId === id);
    if (index < 0) throw new QuizError(422, `Question ${id} was already removed`);
    return index;
  };

  for (const operation of operations) {
    if (operation.type === "setMetadata") {
      if (operation.title === undefined && operation.instructionsMarkdown === undefined) throw new QuizError(422, "Specify a field to change");
      if (operation.title !== undefined) draft.title = operation.title;
      if (operation.instructionsMarkdown !== undefined) draft.instructionsMarkdown = operation.instructionsMarkdown;
      continue;
    }
    if (operation.type === "addQuestion") {
      if (operation.afterQuestionId != null && operation.beforeQuestionId !== undefined) throw new QuizError(422, "Choose before or after, not both");
      let index = draft.questions.length;
      if (operation.beforeQuestionId !== undefined) {
        index = locate(operation.beforeQuestionId);
      } else if (operation.afterQuestionId != null) {
        index = locate(operation.afterQuestionId) + 1;
        const previousAddition = lastAddedAfter.get(operation.afterQuestionId);
        if (previousAddition) {
          const previousIndex = draft.questions.findIndex((question) => question.sourceId === previousAddition);
          if (previousIndex >= index) index = previousIndex + 1;
        }
      }
      const sourceId = randomUUID();
      draft.questions.splice(index, 0, { sourceId, value: operation.question });
      if (operation.afterQuestionId != null) lastAddedAfter.set(operation.afterQuestionId, sourceId);
      continue;
    }
    const previous = touched.get(operation.questionId) ?? new Set<string>();
    if (previous.has(operation.type) || previous.has("removeQuestion") || (operation.type === "removeQuestion" && previous.size > 0)) {
      throw new QuizError(422, `Question ${operation.questionId} has incompatible changes`);
    }
    previous.add(operation.type);
    touched.set(operation.questionId, previous);
    const index = locate(operation.questionId);
    if (operation.type === "replaceQuestion") {
      draft.questions[index] = { sourceId: operation.questionId, value: operation.question };
    } else if (operation.type === "removeQuestion") {
      draft.questions.splice(index, 1);
    } else {
      if (operation.beforeQuestionId === operation.questionId) throw new QuizError(422, "A question cannot move before itself");
      const [moved] = draft.questions.splice(index, 1);
      const before = operation.beforeQuestionId == null ? draft.questions.length : locate(operation.beforeQuestionId);
      draft.questions.splice(before, 0, moved);
    }
  }

  const validated = createQuizSchema.safeParse({
    title: draft.title,
    instructionsMarkdown: draft.instructionsMarkdown,
    questions: draft.questions.map((question) => question.value),
  });
  if (!validated.success) throw new QuizError(422, validated.error.issues[0]?.message ?? "Invalid quiz revision");
  return draft;
}
