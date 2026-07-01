import { Router } from "express";
import OpenAI from "openai";
import { prisma } from "./prisma";

const router = Router();

async function resolveSystemPrompt(
  userId: string,
  pageId: string | undefined,
  actionType: 'meaning' | 'explanation' | 'doubt' | undefined,
  defaultSystemPrompt: string
): Promise<string> {
  // 1. Resolve from page hierarchy
  if (pageId && actionType) {
    let currentPageId: string | null = pageId;
    while (currentPageId) {
      const pageRow: {
        parentId: string | null;
        meaningSystemPrompt: string | null;
        explanationSystemPrompt: string | null;
        doubtSystemPrompt: string | null;
      } | null = await prisma.page.findUnique({
        where: { id: currentPageId },
        select: { parentId: true, meaningSystemPrompt: true, explanationSystemPrompt: true, doubtSystemPrompt: true },
      });

      if (!pageRow) break;

      const customPrompt = 
        actionType === 'meaning' ? pageRow.meaningSystemPrompt :
        actionType === 'explanation' ? pageRow.explanationSystemPrompt :
        pageRow.doubtSystemPrompt;

      if (customPrompt && customPrompt.trim()) {
        return customPrompt.trim();
      }

      currentPageId = pageRow.parentId;
    }
  }

  // 2. Resolve from global model_config
  if (actionType) {
    const config = await prisma.model_config.findUnique({
      where: { userId },
    });

    if (config) {
      const globalPrompt = 
        actionType === 'meaning' ? config.meaningSystemPrompt :
        actionType === 'explanation' ? config.explanationSystemPrompt :
        config.doubtSystemPrompt;

      if (globalPrompt && globalPrompt.trim()) {
        return globalPrompt.trim();
      }
    }
  }

  // 3. Fallback to default
  return defaultSystemPrompt;
}

// POST /backend-api/chat
router.post("/", async (req, res) => {
  const { userId, modelId, systemPrompt, userPrompt, pageId, actionType } = req.body as {
    userId: string;
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    pageId?: string;
    actionType?: 'meaning' | 'explanation' | 'doubt';
  };

  // 1. Validate inputs
  if (!userId || !modelId || !systemPrompt || !userPrompt) {
    res.status(400).json({
      error: {
        message: "Missing required fields",
        description:
          "userId, modelId, systemPrompt, and userPrompt are all required.",
      },
    });
    return;
  }

  // 2. Resolve System Prompt
  const resolvedSystemPrompt = await resolveSystemPrompt(userId, pageId, actionType, systemPrompt);

  // 3. Fetch user's saved model config
  const config = await prisma.model_config.findUnique({ where: { userId } });
  if (!config) {
    res.status(404).json({
      error: {
        message: "Model configuration not found",
        description:
          "No AI provider configuration exists for this user. Please save your base URL and API key first.",
      },
    });
    return;
  }

  // 4. Create an OpenAI-compatible client with the user's provider config
  const openai = new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  try {
    // 5. Send a non-streaming chat completion with only system + user messages
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: resolvedSystemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // 6. Return the model's response content
    res.json({
      response: completion.choices[0]?.message?.content ?? null,
    });
  } catch (err: unknown) {
    // 7. Distinguish OpenAI SDK API errors from unexpected errors
    if (err instanceof OpenAI.APIError) {
      res.status(502).json({
        error: {
          message: "Chat completion failed",
          description: `The AI provider returned an error: ${err.message}`,
          debug: `HTTP status: ${err.status}, Error type: ${err.type ?? "unknown"}`,
        },
      });
    } else {
      const debug = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: {
          message: "Unexpected error",
          description:
            "An unexpected error occurred while processing the chat request.",
          debug,
        },
      });
    }
  }
});

export default router;
