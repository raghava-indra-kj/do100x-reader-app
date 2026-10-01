import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import { QuizError, applyQuizChangesSchema, createQuizSchema } from "../../quiz/quiz-contract";
import { applyQuizChanges, archiveQuiz, createQuiz, getQuizRevision, listQuizzesForPage, swapQuizOrder, type QuizDb } from "../../quiz/quiz-service";
import { getAttempt, listAttempts, saveAnswerSchema, saveAttemptAnswer, startAttempt, submitAttempt } from "../../quiz/attempt-service";
import { evaluationBatchSchema, getEvaluationContext, getEvaluationHistory, recordEvaluations } from "../../quiz/evaluation-service";

const uuid = z.string().uuid();
async function tool(run: () => Promise<unknown>) {
  try { return { content: [{ type: "text" as const, text: JSON.stringify(await run(), null, 2) }] }; }
  catch (error) {
    if (error instanceof QuizError) return { isError: true, content: [{ type: "text" as const, text: `${error.status}: ${error.message}` }] };
    throw error;
  }
}

/** Quiz tools reuse the same domain operations as HTTP. The MCP boundary is unchanged. */
export function registerQuizTools(server: McpServer, userId: string, db: QuizDb = prisma) {
  server.tool("reader_list_quizzes", "List active quizzes on a page, 1–100 at a time. Continue with nextCursor.",
    { pageId: uuid, cursor: uuid.optional(), take: z.number().int().min(1).max(100).optional(), archivedOnly: z.boolean().optional() },
    ({ pageId, cursor, take, archivedOnly }) => tool(() => listQuizzesForPage(db, { pageId, userId, cursor, take, archivedOnly })));

  server.tool("reader_get_quiz", "Get an owned quiz revision with question and option IDs, answer keys, and explanations. Use view=learner to omit answer keys.",
    { quizId: uuid, revisionNo: z.number().int().positive().optional(), view: z.enum(["author", "learner"]).optional() },
    ({ quizId, revisionNo, view }) => tool(() => getQuizRevision(db, { quizId, userId, revisionNo, view: view ?? "author" })));

  server.tool("reader_create_quiz", "Create a separate quiz on an owned page. Include at least one objective or subjective Markdown question.",
    { pageId: uuid, quiz: createQuizSchema },
    ({ pageId, quiz }) => tool(() => createQuiz(db, userId, pageId, quiz)));

  server.tool("reader_apply_quiz_changes", "Publish one immutable revision with ID-targeted add/replace/remove/move operations. Fetch the current revision and use expectedRevisionNo; stale edits return 409.",
    { quizId: uuid, changes: applyQuizChangesSchema },
    ({ quizId, changes }) => tool(() => applyQuizChanges(db, userId, quizId, changes)));

  server.tool("reader_archive_quiz", "Archive an owned quiz without deleting its revisions or earlier attempts.",
    { quizId: uuid, expectedRevisionNo: z.number().int().positive() },
    ({ quizId, expectedRevisionNo }) => tool(() => archiveQuiz(db, userId, quizId, expectedRevisionNo)));

  server.tool("reader_swap_quiz_order", "Swap the display order of two active quizzes on the same owned page.",
    { quizId: uuid, otherQuizId: uuid },
    ({ quizId, otherQuizId }) => tool(() => swapQuizOrder(db, userId, quizId, otherQuizId)));

  server.tool("reader_start_quiz_attempt", "Start a quiz attempt pinned to the current revision. Reuse the same UUID startRequestKey on retry.",
    { quizId: uuid, startRequestKey: uuid },
    ({ quizId, startRequestKey }) => tool(() => startAttempt(db, userId, quizId, startRequestKey)));

  server.tool("reader_save_quiz_answer", "Save one answer while the attempt is in progress. Objective answers use option IDs; subjective answers use Markdown.",
    { attemptId: uuid, answer: saveAnswerSchema },
    ({ attemptId, answer }) => tool(() => saveAttemptAnswer(db, userId, attemptId, answer)));

  server.tool("reader_submit_quiz_attempt", "Submit once, freeze answers, and grade objective questions by exact selected-option set.",
    { attemptId: uuid },
    ({ attemptId }) => tool(() => submitAttempt(db, userId, attemptId)));

  server.tool("reader_get_quiz_attempt", "Read your attempt. Answer keys, explanations, and results appear only after submission.",
    { attemptId: uuid },
    ({ attemptId }) => tool(() => getAttempt(db, userId, attemptId)));

  server.tool("reader_list_quiz_attempts", "List your attempts for a quiz, 1–100 at a time.",
    { quizId: uuid, cursor: uuid.optional(), take: z.number().int().min(1).max(100).optional() },
    ({ quizId, cursor, take }) => tool(() => listAttempts(db, userId, quizId, { cursor, take })));

  server.tool("reader_get_quiz_evaluation_context", "Read a submitted attempt's pinned questions, submitted answers, objective answer key, subjective reference answers and explanations before evaluating it.",
    { attemptId: uuid },
    ({ attemptId }) => tool(() => getEvaluationContext(db, userId, attemptId)));

  server.tool("reader_record_quiz_evaluations", "Atomically append AI feedback for one or more question IDs. Reuse requestKey only for an exact retry. Objective verdicts and scores must match deterministic grading.",
    { attemptId: uuid, batch: evaluationBatchSchema },
    ({ attemptId, batch }) => tool(() => recordEvaluations(db, userId, attemptId, batch)));

  server.tool("reader_get_quiz_evaluation_history", "Read all stored per-question objective and AI evaluation records for a submitted attempt.",
    { attemptId: uuid },
    ({ attemptId }) => tool(() => getEvaluationHistory(db, userId, attemptId)));
}
