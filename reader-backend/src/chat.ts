import { Router } from "express";
import OpenAI from "openai";
import { prisma } from "./prisma";
import { requireSession } from "./session";
import { canReadPage } from "./page-access";

const router = Router();
router.use(requireSession);

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
  const userId = res.locals.userId as string;
  const { modelId, systemPrompt, userPrompt, pageId, actionType } = req.body as {
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    pageId?: string;
    actionType?: 'meaning' | 'explanation' | 'doubt';
  };

  // 1. Validate inputs
  if (!modelId || !systemPrompt || !userPrompt) {
    res.status(400).json({
      error: {
        type: "CONFIG_ERROR",
        message: "Complete the required fields.",
        description: "Choose a model and provide the instructions and question.",
        rawError: { body: req.body },
      },
    });
    return;
  }

  if (pageId && !await canReadPage(prisma, pageId, userId)) { res.status(404).json({ message: "Page not found" }); return; }
  // 2. Resolve System Prompt
  const resolvedSystemPrompt = await resolveSystemPrompt(userId, pageId, actionType, systemPrompt);

  // 3. Fetch user's saved model config and specific user_model
  const [config, userModel] = await Promise.all([
    prisma.model_config.findUnique({ where: { userId } }),
    prisma.user_model.findFirst({
      where: {
        userId,
        OR: [{ modelId }, { id: modelId }],
      },
    }),
  ]);

  const effectiveBaseUrl = userModel?.baseUrl?.trim() || config?.baseUrl?.trim();
  const effectiveApiKey = userModel?.apiKey?.trim() || config?.apiKey?.trim();
  const effectiveModelId = userModel?.modelId || modelId;

  if (!effectiveBaseUrl) {
    res.status(404).json({
      error: {
        type: "CONFIG_ERROR",
        message: "Provider URL missing",
        description: "Add a provider URL for this model or in the default AI settings.",
        rawError: { userId, modelId },
      },
    });
    return;
  }

  if (!effectiveApiKey) {
    res.status(400).json({
      error: {
        type: "INVALID_API_KEY",
        message: "API key missing",
        description: "Add an API key for this model or in the default AI settings.",
        rawError: { baseUrl: effectiveBaseUrl, modelId: effectiveModelId },
      },
    });
    return;
  }

  // 4. Create an OpenAI-compatible client with the effective provider config
  const openai = new OpenAI({
    baseURL: effectiveBaseUrl,
    apiKey: effectiveApiKey,
  });

  try {
    // 5. Send chat completion
    const completion = await openai.chat.completions.create({
      model: effectiveModelId,
      messages: [
        { role: "system", content: resolvedSystemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? "";

    // 6. Return response content alongside raw completion JSON
    res.json({
      response: content,
      rawResponse: {
        id: completion.id,
        model: completion.model,
        usage: completion.usage ?? null,
        choices: completion.choices,
        created: completion.created,
      },
    });
  } catch (err: any) {
    // 7. Extract detailed error status and classification
    if (err instanceof OpenAI.APIError || err?.status) {
      const status = err.status || 500;
      let errorType = "PROVIDER_ERROR";
      let message = "AI provider error";
      let description = err.message || "Couldn’t contact the AI provider. Try again.";

      const msgLower = (err.message || "").toLowerCase();
      const codeLower = String(err.code || "").toLowerCase();

      if (status === 401 || codeLower.includes("invalid_api_key") || msgLower.includes("api key") || msgLower.includes("unauthorized") || msgLower.includes("authentication")) {
        errorType = "INVALID_API_KEY";
        message = "API key rejected";
        description = "The provider rejected your API key. Check it in settings.";
      } else if (status === 404 || codeLower.includes("model_not_found") || msgLower.includes("model") && msgLower.includes("not found")) {
        errorType = "MODEL_NOT_FOUND";
        message = "Model unavailable";
        description = `“${effectiveModelId}” isn’t available from this provider. Check the model ID and provider URL.`;
      } else if (status === 429 || codeLower.includes("rate_limit") || codeLower.includes("quota") || msgLower.includes("quota") || msgLower.includes("rate limit")) {
        errorType = "RATE_LIMIT";
        message = "Provider limit reached";
        description = "Your provider’s request or credit limit has been reached. Check your provider account.";
      } else if (status >= 500) {
        errorType = "PROVIDER_ERROR";
        message = "AI provider error";
        description = `The provider returned an error (HTTP ${status}): ${err.message}`;
      }

      res.status(status >= 400 && status < 600 ? status : 502).json({
        error: {
          type: errorType,
          message,
          description,
          status,
          rawError: err.error || {
            name: err.name,
            message: err.message,
            status: err.status,
            code: err.code,
            type: err.type,
          },
        },
      });
    } else {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isNetwork = errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("ENOTFOUND") || errorMsg.includes("fetch failed");

      res.status(500).json({
        error: {
          type: isNetwork ? "NETWORK_ERROR" : "UNEXPECTED_ERROR",
          message: isNetwork ? "Can’t reach the AI provider" : "AI request failed",
          description: isNetwork
            ? `Couldn’t reach “${effectiveBaseUrl}”. Check the provider URL and your connection.`
            : errorMsg,
          rawError: {
            message: errorMsg,
            stack: err instanceof Error ? err.stack : undefined,
          },
        },
      });
    }
  }
});

export default router;
