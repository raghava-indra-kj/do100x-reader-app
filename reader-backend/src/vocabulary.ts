import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { readSession, requireSession } from "./session";
import { addVocabulary, deleteVocabulary, listVocabulary, readVocabulary, updateVocabulary, vocabularyQuerySchema, VocabularyError, writeExplanations } from "./vocabulary-service";

const router = Router();
router.use(requireSession);
const handle = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ message: error.issues.map(i => i.message).join(" ") });
    else if (error instanceof VocabularyError) res.status(error.status).json({ message: error.message });
    else next(error);
  }
};
router.get("/", handle(async (req, res) => {
  const q: Record<string, unknown> = { ...req.query };
  for (const key of ["offset", "limit"]) if (q[key] !== undefined) q[key] = z.coerce.number().parse(q[key]);
  if (q.missingExplanation !== undefined) q.missingExplanation = z.enum(["true", "false"]).parse(q.missingExplanation) === "true";
  res.json(await listVocabulary(readSession(req)!, vocabularyQuerySchema.parse(q)));
}));
router.post("/", handle(async (req, res) => { res.json(await addVocabulary(readSession(req)!, req.body)); }));
router.post("/read", handle(async (req, res) => { res.json(await readVocabulary(readSession(req)!, req.body)); }));
router.put("/explanations", handle(async (req, res) => { res.json(await writeExplanations(readSession(req)!, req.body)); }));
router.patch("/:id", handle(async (req, res) => { res.json(await updateVocabulary(readSession(req)!, req.params.id, req.body)); }));
router.delete("/:id", handle(async (req, res) => {
  const { expectedVersion } = z.object({ expectedVersion: z.number().int().positive() }).strict().parse(req.body);
  await deleteVocabulary(readSession(req)!, req.params.id, expectedVersion);
  res.status(204).send();
}));
export default router;
