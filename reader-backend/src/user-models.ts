import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /backend-api/user-models?userId=
router.get("/", async (req, res) => {
  const { userId } = req.query as { userId?: string };

  if (!userId) {
    res.status(400).json({ message: "userId query parameter is required" });
    return;
  }

  const models = await prisma.user_model.findMany({ where: { userId } });
  res.json(models);
});

// POST /backend-api/user-models
router.post("/", async (req, res) => {
  const { userId, name, modelId } = req.body as {
    userId: string;
    name: string;
    modelId: string;
  };

  if (!userId || !name || !modelId) {
    res
      .status(400)
      .json({ message: "userId, name, and modelId are required" });
    return;
  }

  const entry = await prisma.user_model.create({
    data: { userId, name, modelId },
  });

  res.status(201).json(entry.id);
});

// PUT /backend-api/user-models/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, modelId } = req.body as { name: string; modelId: string };

  if (!name || !modelId) {
    res.status(400).json({ message: "name and modelId are required" });
    return;
  }

  const existing = await prisma.user_model.findFirst({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Model entry not found" });
    return;
  }

  await prisma.user_model.update({ where: { id }, data: { name, modelId } });
  res.status(204).send();
});

// DELETE /backend-api/user-models/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.user_model.findFirst({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Model entry not found" });
    return;
  }

  await prisma.user_model.delete({ where: { id } });
  res.status(204).send();
});

export default router;
