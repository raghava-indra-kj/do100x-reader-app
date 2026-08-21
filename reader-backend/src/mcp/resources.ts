import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../prisma";
import { ensurePersonalReaderSpace } from "../reader-space";

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
      const space = await ensurePersonalReaderSpace(userId);
      const pages = await prisma.reader_document.findMany({
        where: {
          readerSpaceId: space.readerSpaceId,
          deletedAt: null,
        },
        select: {
          id: true,
          parentId: true,
          title: true,
          category: true,
          currentRevisionNumber: true,
          updatedAt: true,
        },
        orderBy: { orderKey: "asc" },
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
      const space = await ensurePersonalReaderSpace(userId);
      const page = await prisma.reader_document.findFirst({
        where: { id: String(pageId), readerSpaceId: space.readerSpaceId, deletedAt: null },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
      });

      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const header = `---
id: ${page.id}
title: ${page.title}
category: ${page.category ?? "none"}
parentId: ${page.parentId ?? "root"}
revisionNumber: ${page.currentRevisionNumber}
updatedAt: ${page.updatedAt.toISOString()}
---

# ${page.title}

`;
      const fullText = header + (page.revisions[0]?.markdown ?? "");

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
      const space = await ensurePersonalReaderSpace(userId);
      const page = await prisma.reader_document.findFirst({
        where: { id: String(pageId), readerSpaceId: space.readerSpaceId, deletedAt: null },
        select: { id: true },
      });
      if (!page) throw new Error(`Document not found: ${pageId}`);
      const comments = await prisma.reader_document_annotation.findMany({
        where: { documentId: page.id },
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

  // 5. Official Reader Markdown Format Guide (format.llm.md)
  server.resource(
    "format-guide",
    "reader://format-guide",
    {
      description: "Official Markdown Format Guide (format.llm.md) specification for generating Reader pages",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const { FORMAT_LLM_MD_CONTENT } = await import("./constants/format-guide");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: FORMAT_LLM_MD_CONTENT,
          },
        ],
      };
    }
  );
}
