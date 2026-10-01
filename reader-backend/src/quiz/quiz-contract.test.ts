import { describe, expect, it } from "vitest";
import { applyChangesToDraft, createQuizSchema, questionInputSchema, quizChangeSchema, QuizError, type QuestionInput, type QuizDraft } from "./quiz-contract";

const objective: QuestionInput = {
  kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "What does `x` mean?",
  explanationMarkdown: "Because **x** is defined that way.",
  options: [{ bodyMarkdown: "First", isCorrect: true }, { bodyMarkdown: "Second", isCorrect: false }],
};
const subjective: QuestionInput = {
  kind: "SUBJECTIVE", responseLength: "LONG", promptMarkdown: "Explain with a ```d2\na -> b\n``` diagram",
  referenceAnswerMarkdown: "A clear model answer.", explanationMarkdown: "A detailed explanation.", options: [],
};

describe("quiz input contract", () => {
  it("accepts both kinds and preserves Markdown source", () => {
    const parsed = createQuizSchema.parse({ title: "  Review  ", questions: [objective, subjective] });
    expect(parsed.title).toBe("Review");
    expect(parsed.instructionsMarkdown).toBeNull();
    expect(parsed.questions[1].promptMarkdown).toBe(subjective.promptMarkdown);
  });

  it("requires 2–10 objective options and the appropriate correct count", () => {
    expect(questionInputSchema.safeParse({ ...objective, options: [objective.options[0]] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...objective, options: Array.from({ length: 11 }, () => objective.options[0]) }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...objective, options: objective.options.map((option) => ({ ...option, isCorrect: false })) }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...objective, options: objective.options.map((option) => ({ ...option, isCorrect: true })) }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...objective, selectionMode: "MULTIPLE", options: objective.options.map((option) => ({ ...option, isCorrect: true })) }).success).toBe(true);
  });

  it("keeps subjective answer and explanation separate and forbids options", () => {
    expect(questionInputSchema.safeParse(subjective).success).toBe(true);
    expect(questionInputSchema.safeParse({ ...subjective, referenceAnswerMarkdown: " " }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...subjective, explanationMarkdown: " " }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...subjective, options: objective.options }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...objective, referenceAnswerMarkdown: "leak" }).success).toBe(false);
  });

  it("does not accept empty quizzes, unknown fields, or malformed operations", () => {
    expect(createQuizSchema.safeParse({ title: "A", questions: [] }).success).toBe(false);
    expect(createQuizSchema.safeParse({ title: "A", questions: [objective], extra: true }).success).toBe(false);
    expect(quizChangeSchema.safeParse({ type: "removeQuestion", questionId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("ID-targeted changes", () => {
  const firstId = "00000000-0000-4000-8000-000000000001";
  const secondId = "00000000-0000-4000-8000-000000000002";
  const snapshot: QuizDraft = {
    title: "Original", instructionsMarkdown: null,
    questions: [{ sourceId: firstId, value: objective }, { sourceId: secondId, value: subjective }],
  };

  it("replaces only the specified question and leaves the source snapshot intact", () => {
    const result = applyChangesToDraft(snapshot, [{ type: "replaceQuestion", questionId: firstId, question: { ...objective, promptMarkdown: "Updated" } }]);
    expect(result.questions[0].value.promptMarkdown).toBe("Updated");
    expect(result.questions[1]).toEqual(snapshot.questions[1]);
    expect(snapshot.questions[0].value.promptMarkdown).toBe(objective.promptMarkdown);
  });

  it("can add, move, change metadata, and remove by ID", () => {
    const result = applyChangesToDraft(snapshot, [
      { type: "setMetadata", title: "Next", instructionsMarkdown: "Read first." },
      { type: "addQuestion", afterQuestionId: firstId, question: objective },
      { type: "moveQuestion", questionId: secondId, beforeQuestionId: firstId },
    ]);
    expect(result.title).toBe("Next");
    expect(result.questions.map((question) => question.sourceId)).toEqual([secondId, firstId, expect.any(String)]);
    expect(applyChangesToDraft(snapshot, [{ type: "removeQuestion", questionId: firstId }]).questions).toHaveLength(1);
  });

  it("keeps multiple additions after the same question in request order", () => {
    const result = applyChangesToDraft(snapshot, [
      { type: "addQuestion", afterQuestionId: firstId, question: { ...objective, promptMarkdown: "Added first" } },
      { type: "addQuestion", afterQuestionId: firstId, question: { ...objective, promptMarkdown: "Added second" } },
    ]);
    expect(result.questions.map((question) => question.value.promptMarkdown)).toEqual([
      objective.promptMarkdown, "Added first", "Added second", subjective.promptMarkdown,
    ]);
  });

  it("can replace and move one question, then insert before another in one revision", () => {
    const result = applyChangesToDraft(snapshot, [
      { type: "replaceQuestion", questionId: secondId, question: { ...subjective, promptMarkdown: "Updated second" } },
      { type: "moveQuestion", questionId: secondId, beforeQuestionId: firstId },
      { type: "addQuestion", beforeQuestionId: firstId, question: objective },
    ]);
    expect(result.questions.map((question) => question.value.promptMarkdown)).toEqual(["Updated second", objective.promptMarkdown, objective.promptMarkdown]);
  });

  it("rejects unknown, duplicate, or self-referential operations and an empty final quiz", () => {
    const badId = "00000000-0000-4000-8000-000000000099";
    expect(() => applyChangesToDraft(snapshot, [{ type: "removeQuestion", questionId: badId }])).toThrow(QuizError);
    expect(() => applyChangesToDraft(snapshot, [{ type: "moveQuestion", questionId: firstId, beforeQuestionId: firstId }])).toThrow(QuizError);
    expect(() => applyChangesToDraft(snapshot, [{ type: "removeQuestion", questionId: firstId }, { type: "removeQuestion", questionId: firstId }])).toThrow(QuizError);
    expect(() => applyChangesToDraft(snapshot, [{ type: "removeQuestion", questionId: firstId }, { type: "removeQuestion", questionId: secondId }])).toThrow(QuizError);
    expect(() => applyChangesToDraft(snapshot, [{ type: "setMetadata" }])).toThrow(QuizError);
  });
});
