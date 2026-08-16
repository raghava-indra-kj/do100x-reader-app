import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";

export function registerPageTools(server: McpServer, userId: string) {
  // 1. List pages
  server.tool(
    "reader_list_pages",
    "List reader pages with optional parent filter, category filter, and search query",
    {
      parentPageId: z.string().optional().describe("Filter by parent page ID (set to 'null' or omit for root pages)"),
      category: z.string().optional().describe("Filter by category name"),
      search: z.string().optional().describe("Search term for page titles"),
    },
    async ({ parentPageId, category, search }) => {
      const isRoot = parentPageId === "null" || parentPageId === undefined;

      const where: Record<string, unknown> = {
        userId,
        deletedAt: null,
      };

      if (parentPageId !== undefined) {
        where.parentId = parentPageId === "null" ? null : parentPageId;
      }

      if (category) {
        where.category = category;
      }

      if (search) {
        where.title = { contains: search };
      }

      const pages = await prisma.page.findMany({
        where,
        select: {
          id: true,
          parentId: true,
          title: true,
          category: true,
          sortOrder: true,
          childrenCount: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { sortOrder: "asc" },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              pages.map((p) => ({
                id: p.id,
                title: p.title,
                parentPageId: p.parentId,
                category: p.category,
                sortOrder: p.sortOrder,
                childrenCount: p.childrenCount,
                isPublic: p.isPublic,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. Get single page
  server.tool(
    "reader_get_page",
    "Fetch full content, markdown text, and metadata of a reader page by ID",
    {
      pageId: z.string().describe("The UUID of the page to retrieve"),
    },
    async ({ pageId }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: page.id,
                parentPageId: page.parentId,
                title: page.title,
                content: page.content ?? "",
                category: page.category,
                sortOrder: page.sortOrder,
                childrenCount: page.childrenCount,
                isPublic: page.isPublic,
                meaningSystemPrompt: page.meaningSystemPrompt,
                explanationSystemPrompt: page.explanationSystemPrompt,
                doubtSystemPrompt: page.doubtSystemPrompt,
                createdAt: page.createdAt.toISOString(),
                updatedAt: page.updatedAt.toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 3. Create page
  server.tool(
    "reader_create_page",
    "Create a new top-level page or nested subpage in Reader",
    {
      title: z.string().describe("The title of the page"),
      content: z.string().optional().default("").describe("The Markdown body content"),
      parentPageId: z.string().nullable().optional().describe("Parent page UUID if creating a subpage (null for root)"),
      category: z.string().nullable().optional().describe("Optional category tag (e.g. 'Documentation', 'Note')"),
      meaningSystemPrompt: z.string().optional().describe("Custom AI prompt for generating meanings"),
      explanationSystemPrompt: z.string().optional().describe("Custom AI prompt for explanations"),
      doubtSystemPrompt: z.string().optional().describe("Custom AI prompt for answering doubts"),
    },
    async ({
      title,
      content,
      parentPageId,
      category,
      meaningSystemPrompt,
      explanationSystemPrompt,
      doubtSystemPrompt,
    }) => {
      const now = new Date();
      const parentId = parentPageId ?? null;

      const maxSortOrderRow = await prisma.page.aggregate({
        where: { parentId, userId, deletedAt: null },
        _max: { sortOrder: true },
      });
      const nextSortOrder = (maxSortOrderRow._max.sortOrder ?? 0) + 1;

      const newPage = await prisma.page.create({
        data: {
          userId,
          parentId,
          title,
          content: content ?? "",
          category: category ?? null,
          sortOrder: nextSortOrder,
          childrenCount: 0,
          isPublic: false,
          createdAt: now,
          updatedAt: now,
          meaningSystemPrompt: meaningSystemPrompt ?? null,
          explanationSystemPrompt: explanationSystemPrompt ?? null,
          doubtSystemPrompt: doubtSystemPrompt ?? null,
        },
      });

      if (parentId) {
        await prisma.page.update({
          where: { id: parentId },
          data: { childrenCount: { increment: 1 }, updatedAt: now },
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, pageId: newPage.id, title: newPage.title }, null, 2),
          },
        ],
      };
    }
  );

  // 4. Update page
  server.tool(
    "reader_update_page",
    "Update an existing page's title, markdown content, category, or AI prompts",
    {
      pageId: z.string().describe("The UUID of the page to update"),
      title: z.string().optional().describe("Updated title"),
      content: z.string().optional().describe("Updated Markdown body content"),
      category: z.string().nullable().optional().describe("Updated category"),
      meaningSystemPrompt: z.string().nullable().optional().describe("Updated custom AI prompt for meanings"),
      explanationSystemPrompt: z.string().nullable().optional().describe("Updated custom AI prompt for explanations"),
      doubtSystemPrompt: z.string().nullable().optional().describe("Updated custom AI prompt for doubts"),
    },
    async ({
      pageId,
      title,
      content,
      category,
      meaningSystemPrompt,
      explanationSystemPrompt,
      doubtSystemPrompt,
    }) => {
      const existing = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (category !== undefined) updateData.category = category;
      if (meaningSystemPrompt !== undefined) updateData.meaningSystemPrompt = meaningSystemPrompt;
      if (explanationSystemPrompt !== undefined) updateData.explanationSystemPrompt = explanationSystemPrompt;
      if (doubtSystemPrompt !== undefined) updateData.doubtSystemPrompt = doubtSystemPrompt;

      const updated = await prisma.page.update({
        where: { id: pageId },
        data: updateData,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, pageId: updated.id, title: updated.title }, null, 2),
          },
        ],
      };
    }
  );

  // 5. Delete page
  server.tool(
    "reader_delete_page",
    "Soft-delete a reader page and its descendants",
    {
      pageId: z.string().describe("The UUID of the page to delete"),
    },
    async ({ pageId }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const now = new Date();

      async function softDeleteRecursive(id: string) {
        const children = await prisma.page.findMany({
          where: { parentId: id, userId, deletedAt: null },
          select: { id: true },
        });
        for (const child of children) {
          await softDeleteRecursive(child.id);
        }
        await prisma.page.update({
          where: { id },
          data: { deletedAt: now },
        });
      }

      await softDeleteRecursive(pageId);

      if (page.parentId) {
        await prisma.page.update({
          where: { id: page.parentId },
          data: { childrenCount: { decrement: 1 }, updatedAt: now },
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deletedPageId: pageId }),
          },
        ],
      };
    }
  );

  // 6. Get page tree
  server.tool(
    "reader_get_page_tree",
    "Retrieve the full hierarchical tree of pages and subpages",
    {
      rootPageId: z.string().optional().describe("Root page ID to start tree from (omit for full workspace tree)"),
    },
    async ({ rootPageId }) => {
      const allPages = await prisma.page.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          parentId: true,
          title: true,
          category: true,
          sortOrder: true,
          childrenCount: true,
        },
        orderBy: { sortOrder: "asc" },
      });

      interface TreeNode {
        id: string;
        title: string;
        category: string | null;
        children: TreeNode[];
      }

      const childrenMap = new Map<string | null, typeof allPages>();
      for (const p of allPages) {
        const parent = p.parentId;
        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent)!.push(p);
      }

      function buildTree(parentId: string | null): TreeNode[] {
        const list = childrenMap.get(parentId) ?? [];
        return list.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          children: buildTree(p.id),
        }));
      }

      const tree = rootPageId ? buildTree(rootPageId) : buildTree(null);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tree, null, 2),
          },
        ],
      };
    }
  );
}
