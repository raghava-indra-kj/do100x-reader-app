import { Router } from "express";
import { prisma } from "./prisma";
import { requireSession } from "./session";

const router = Router();
router.use(requireSession);

// GET /backend-api/user-models
router.get("/", async (req, res) => {
  const userId = res.locals.userId as string;


  const models = await prisma.user_model.findMany({ where: { userId } });
  res.json(models);
});

// POST /backend-api/user-models
router.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const { name, modelId, baseUrl, apiKey } = req.body as {
    name: string;
    modelId: string;
    baseUrl?: string;
    apiKey?: string;
  };

  if (!name || !modelId) {
    res
      .status(400)
      .json({ message: "name and modelId are required" });
    return;
  }

  const entry = await prisma.user_model.create({
    data: {
      userId,
      name,
      modelId,
      baseUrl: baseUrl?.trim() || null,
      apiKey: apiKey?.trim() || null,
    },
  });

  res.status(201).json(entry.id);
});

// PUT /backend-api/user-models/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, modelId, baseUrl, apiKey } = req.body as {
    name: string;
    modelId: string;
    baseUrl?: string | null;
    apiKey?: string | null;
  };

  if (!name || !modelId) {
    res.status(400).json({ message: "name and modelId are required" });
    return;
  }

  const existing = await prisma.user_model.findFirst({ where: { id, userId: res.locals.userId } });
  if (!existing) {
    res.status(404).json({ message: "Model entry not found" });
    return;
  }

  await prisma.user_model.update({
    where: { id },
    data: {
      name,
      modelId,
      baseUrl: baseUrl !== undefined ? (baseUrl?.trim() || null) : existing.baseUrl,
      apiKey: apiKey !== undefined ? (apiKey?.trim() || null) : existing.apiKey,
    },
  });
  res.status(204).send();
});

// DELETE /backend-api/user-models/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.user_model.findFirst({ where: { id, userId: res.locals.userId } });
  if (!existing) {
    res.status(404).json({ message: "Model entry not found" });
    return;
  }

  await prisma.user_model.delete({ where: { id } });
  res.status(204).send();
});

export default router;
