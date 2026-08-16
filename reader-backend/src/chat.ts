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
        type: "CONFIG_ERROR",
        message: "Missing required fields",
        description: "userId, modelId, systemPrompt, and userPrompt are all required.",
        rawError: { body: req.body },
      },
    });
    return;
  }

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
        message: "Base URL not configured",
        description: "No AI Base URL exists for this model or in your account Settings. Please configure a Base URL.",
        rawError: { userId, modelId },
      },
    });
    return;
  }

  if (!effectiveApiKey) {
    res.status(400).json({
      error: {
        type: "INVALID_API_KEY",
        message: "API Key is missing",
        description: "No AI API Key is configured for this model or in your account Settings. Please configure a valid API Key.",
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
      let message = "AI Provider Error";
      let description = err.message || "An error occurred while contacting the AI provider.";

      const msgLower = (err.message || "").toLowerCase();
      const codeLower = String(err.code || "").toLowerCase();

      if (status === 401 || codeLower.includes("invalid_api_key") || msgLower.includes("api key") || msgLower.includes("unauthorized") || msgLower.includes("authentication")) {
        errorType = "INVALID_API_KEY";
        message = "Invalid or expired API Key";
        description = "The AI provider rejected your API key. Please check and re-enter your API key in Settings.";
      } else if (status === 404 || codeLower.includes("model_not_found") || msgLower.includes("model") && msgLower.includes("not found")) {
        errorType = "MODEL_NOT_FOUND";
        message = "Model Not Found";
        description = `The requested model "${effectiveModelId}" was not found or is not supported by your AI provider endpoint.`;
      } else if (status === 429 || codeLower.includes("rate_limit") || codeLower.includes("quota") || msgLower.includes("quota") || msgLower.includes("rate limit")) {
        errorType = "RATE_LIMIT";
        message = "Rate Limit or Quota Exceeded";
        description = "You have exceeded your provider request rate limit or credit quota.";
      } else if (status >= 500) {
        errorType = "PROVIDER_ERROR";
        message = "AI Provider Internal Error";
        description = `The AI provider returned an internal server error (HTTP ${status}): ${err.message}`;
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
          message: isNetwork ? "Cannot connect to AI Base URL" : "Unexpected AI Error",
          description: isNetwork
            ? `Unable to reach Base URL "${effectiveBaseUrl}". Please verify the URL is running and accessible.`
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
