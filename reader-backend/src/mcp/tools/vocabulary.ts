import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";

export function registerVocabularyTools(server: McpServer, userId: string) {
  // 1. Get vocabulary
  server.tool(
    "reader_get_vocabulary",
    "List vocabulary terms saved during reading for a specific page or date",
    {
      pageId: z.string().optional().describe("Filter vocabulary words by page UUID"),
      date: z.string().optional().describe("Filter vocabulary words by calendar date (YYYY-MM-DD)"),
    },
    async ({ pageId, date }) => {
      const where: Record<string, unknown> = {
        userId,
      };

      if (pageId) where.pageId = pageId;

      if (date) {
        const parsed = new Date(`${date}T00:00:00.000Z`);
        if (!Number.isNaN(parsed.getTime())) {
          const next = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
          where.createdAt = { gte: parsed, lt: next };
        }
      }

      const items = await prisma.vocabulary.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              items.map((v) => ({
                id: v.id,
                pageId: v.pageId,
                term: v.term,
                createdAt: v.createdAt.toISOString(),
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. Add vocabulary
  server.tool(
    "reader_add_vocabulary",
    "Add a vocabulary word/term looked up on a reader page",
    {
      pageId: z.string().describe("Page UUID where the term was discovered"),
      term: z.string().describe("The vocabulary term / phrase"),
    },
    async ({ pageId, term }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
        select: { id: true },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found or inaccessible: ${pageId}` }],
        };
      }

      const newItem = await prisma.vocabulary.create({
        data: {
          userId,
          pageId,
          term: term.trim(),
          createdAt: new Date(),
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, vocabId: newItem.id, term: newItem.term }, null, 2),
          },
        ],
      };
    }
  );

  // 3. Delete vocabulary
  server.tool(
    "reader_delete_vocabulary",
    "Remove a vocabulary term from your saved list",
    {
      vocabId: z.string().describe("The UUID of the vocabulary entry to remove"),
    },
    async ({ vocabId }) => {
      const existing = await prisma.vocabulary.findFirst({
        where: { id: vocabId, userId },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: `Vocabulary term not found: ${vocabId}` }],
        };
      }

      await prisma.vocabulary.delete({
        where: { id: vocabId },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deletedVocabId: vocabId }),
          },
        ],
      };
    }
  );
}
