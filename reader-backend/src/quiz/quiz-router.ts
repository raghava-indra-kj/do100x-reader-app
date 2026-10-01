import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { readSession, requireSession } from "../session";
import { QuizError } from "./quiz-contract";
import { applyQuizChanges, archiveQuiz, createQuiz, getQuizRevision, listQuizzesForPage, swapQuizOrder, type QuizDb } from "./quiz-service";
import { getAttempt, listAttempts, saveAttemptAnswer, startAttempt, submitAttempt } from "./attempt-service";
import { getEvaluationHistory } from "./evaluation-service";

const uuid = z.string().uuid();
const optionalPage = z.object({ pageId: uuid, cursor: uuid.optional(), take: z.coerce.number().int().min(1).max(100).optional(), archivedOnly: z.enum(["true", "false"]).optional() });
type Route = (req: Request, res: Response) => Promise<void>;
const route = (handler: Route): Route => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof QuizError) { res.status(error.status).json({ message: error.message }); return; }
    if (error instanceof z.ZodError) { res.status(422).json({ message: error.issues[0]?.message ?? "Invalid request" }); return; }
    throw error;
  }
};
function id(value: string | string[]): string { return uuid.parse(value); }
function user(res: Response): string { return res.locals.userId as string; }

export function createQuizRouter(db: QuizDb) {
const router = Router();
router.get("/", route(async (req, res) => {
  const input = optionalPage.parse(req.query);
  res.json(await listQuizzesForPage(db, { pageId: input.pageId, cursor: input.cursor, take: input.take, archivedOnly: input.archivedOnly === "true", userId: readSession(req) }));
}));
router.post("/", requireSession, route(async (req, res) => {
  const input = z.object({ pageId: uuid, quiz: z.unknown() }).strict().parse(req.body);
  res.status(201).json(await createQuiz(db, user(res), input.pageId, input.quiz as Parameters<typeof createQuiz>[3]));
}));

// Put attempt routes before /:quizId so their path is unambiguous.
router.get("/attempts/:attemptId", requireSession, route(async (req, res) => {
  res.json(await getAttempt(db, user(res), id(req.params.attemptId)));
}));
router.get("/attempts/:attemptId/evaluations", requireSession, route(async (req, res) => {
  res.json(await getEvaluationHistory(db, user(res), id(req.params.attemptId)));
}));
router.put("/attempts/:attemptId/answers", requireSession, route(async (req, res) => {
  res.json(await saveAttemptAnswer(db, user(res), id(req.params.attemptId), req.body));
}));
router.post("/attempts/:attemptId/submit", requireSession, route(async (req, res) => {
  res.json(await submitAttempt(db, user(res), id(req.params.attemptId)));
}));
router.get("/:quizId/attempts", requireSession, route(async (req, res) => {
  const input = z.object({ cursor: uuid.optional(), take: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
  res.json(await listAttempts(db, user(res), id(req.params.quizId), input));
}));
router.post("/:quizId/attempts", requireSession, route(async (req, res) => {
  const input = z.object({ startRequestKey: uuid }).strict().parse(req.body);
  res.status(201).json(await startAttempt(db, user(res), id(req.params.quizId), input.startRequestKey));
}));
router.get("/:quizId", route(async (req, res) => {
  const view = req.query.view === "author" ? "author" : "learner";
  const revisionNo = req.query.revisionNo === undefined ? undefined : z.coerce.number().int().positive().parse(req.query.revisionNo);
  res.json(await getQuizRevision(db, { quizId: id(req.params.quizId), userId: readSession(req), view, revisionNo }));
}));
router.patch("/:quizId", requireSession, route(async (req, res) => {
  res.json(await applyQuizChanges(db, user(res), id(req.params.quizId), req.body));
}));
router.post("/:quizId/archive", requireSession, route(async (req, res) => {
  const input = z.object({ expectedRevisionNo: z.number().int().positive() }).strict().parse(req.body);
  res.json(await archiveQuiz(db, user(res), id(req.params.quizId), input.expectedRevisionNo));
}));
router.post("/:quizId/swap", requireSession, route(async (req, res) => {
  const input = z.object({ otherQuizId: uuid }).strict().parse(req.body);
  res.json(await swapQuizOrder(db, user(res), id(req.params.quizId), input.otherQuizId));
}));

return router;
}
