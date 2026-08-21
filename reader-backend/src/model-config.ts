import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /backend-api/model-config
router.get("/", async (req, res) => {
  const userId = req.auth!.user.id;

  const config = await prisma.model_config.findUnique({ where: { userId } });

  if (!config) {
    res.status(404).json({ message: "Model configuration not found" });
    return;
  }

  res.json(config);
});

// POST /backend-api/model-config  (upsert — creates or updates)
router.post("/", async (req, res) => {
  const {
    baseUrl,
    apiKey,
    explanationModelId,
    meaningModelId,
    doubtModelId,
    meaningSystemPrompt,
    explanationSystemPrompt,
    doubtSystemPrompt,
  } = req.body as {
    baseUrl: string;
    apiKey: string;
    explanationModelId?: string;
    meaningModelId?: string;
    doubtModelId?: string;
    meaningSystemPrompt?: string;
    explanationSystemPrompt?: string;
    doubtSystemPrompt?: string;
  };

  if (!baseUrl || !apiKey) {
    res
      .status(400)
      .json({ message: "baseUrl and apiKey are required" });
    return;
  }

  const userId = req.auth!.user.id;

  const config = await prisma.model_config.upsert({
    where: { userId },
    update: {
      baseUrl,
      apiKey,
      explanationModelId,
      meaningModelId,
      doubtModelId,
      meaningSystemPrompt,
      explanationSystemPrompt,
      doubtSystemPrompt,
    },
    create: {
      userId,
      baseUrl,
      apiKey,
      explanationModelId,
      meaningModelId,
      doubtModelId,
      meaningSystemPrompt,
      explanationSystemPrompt,
      doubtSystemPrompt,
    },
  });

  res.status(201).json(config);
});

export default router;
