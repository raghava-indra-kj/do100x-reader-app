import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /vocabulary?pageId=  | /vocabulary?date=YYYY-MM-DD
// - pageId: list vocabulary for a single page
// - date: list vocabulary across all pages for one calendar day (daily recap)
router.get("/", async (req, res) => {
  const { pageId, date } = req.query as {
    pageId?: string;
    date?: string;
  };

  if (!pageId && !date) {
    res
      .status(400)
      .json({ message: "pageId or date query parameter is required" });
    return;
  }

  const where: Record<string, unknown> = {};
  if (pageId) where.pageId = pageId;

  if (date) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ message: "Invalid date (expected YYYY-MM-DD)" });
      return;
    }
    const next = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
    where.createdAt = { gte: parsed, lt: next };
  }

  const rows = await prisma.vocabulary.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json(
    rows.map((v) => ({
      id: v.id,
      pageId: v.pageId,
      term: v.term,
      createdAt: v.createdAt,
    }))
  );
});

// POST /vocabulary
router.post("/", async (req, res) => {
  const { pageId, term } = req.body as { pageId: string; term: string };

  if (!pageId || !term || !term.trim()) {
    res
      .status(400)
      .json({ message: "pageId and a non-empty term are required" });
    return;
  }

  const newVocab = await prisma.vocabulary.create({
    data: {
      pageId,
      term: term.trim(),
      createdAt: new Date(),
    },
  });

  res.status(201).json(newVocab.id);
});

// DELETE /vocabulary/:vocabId
router.delete("/:vocabId", async (req, res) => {
  const { vocabId } = req.params;

  const existing = await prisma.vocabulary.findFirst({
    where: { id: vocabId },
  });

  if (!existing) {
    res.status(404).json({ message: "Vocabulary entry not found" });
    return;
  }

  await prisma.vocabulary.delete({
    where: { id: vocabId },
  });

  res.status(204).send();
});

export default router;