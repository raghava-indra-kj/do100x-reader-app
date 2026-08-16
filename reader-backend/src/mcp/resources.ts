import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../prisma";

export function registerResources(server: McpServer, userId: string) {
  // 1. All Pages Index
  server.resource(
    "all-pages",
    "reader://pages",
    {
      description: "Index of all active reader pages for the authenticated user",
      mimeType: "application/json",
    },
    async (uri) => {
      const pages = await prisma.page.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          parentId: true,
          title: true,
          category: true,
          childrenCount: true,
          updatedAt: true,
        },
        orderBy: { sortOrder: "asc" },
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(pages, null, 2),
          },
        ],
      };
    }
  );

  // 2. Specific Page Raw Markdown
  server.resource(
    "page-by-id",
    new ResourceTemplate("reader://pages/{pageId}", { list: undefined }),
    {
      description: "Full markdown content and metadata for a specific reader page",
      mimeType: "text/markdown",
    },
    async (uri, { pageId }) => {
      const page = await prisma.page.findFirst({
        where: { id: String(pageId), userId, deletedAt: null },
      });

      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const header = `---
id: ${page.id}
title: ${page.title}
category: ${page.category ?? "none"}
parentId: ${page.parentId ?? "root"}
childrenCount: ${page.childrenCount}
isPublic: ${page.isPublic}
updatedAt: ${page.updatedAt.toISOString()}
---

# ${page.title}

`;
      const fullText = header + (page.content ?? "");

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: fullText,
          },
        ],
      };
    }
  );

  // 3. Comments on a Page
  server.resource(
    "page-comments",
    new ResourceTemplate("reader://pages/{pageId}/comments", { list: undefined }),
    {
      description: "All personal notes, explanations, and annotations attached to a page",
      mimeType: "application/json",
    },
    async (uri, { pageId }) => {
      const comments = await prisma.comment.findMany({
        where: { pageId: String(pageId), userId },
        orderBy: { createdAt: "desc" },
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(comments, null, 2),
          },
        ],
      };
    }
  );

  // 4. Vocabulary list
  server.resource(
    "all-vocabulary",
    "reader://vocabulary",
    {
      description: "Complete list of saved vocabulary terms looked up during reading",
      mimeType: "application/json",
    },
    async (uri) => {
      const items = await prisma.vocabulary.findMany({
        where: {
          userId,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }
  );
}
