import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import {
  parseMarkdownSections,
  updateSectionByIndex,
  replaceLines,
  insertSectionAfterIndex,
} from "../utils/sectionizer";
import { FORMAT_LLM_MD_CONTENT } from "../constants/format-guide";

export function registerPageTools(server: McpServer, userId: string) {
  // 0. Get Format Guide
  server.tool(
    "reader_get_format_guide",
    "Get the official Reader Markdown formatting guidelines (format.llm.md) covering frontmatter rules, headings, callouts, details blocks, Mermaid & D2 diagrams, and math equations",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: FORMAT_LLM_MD_CONTENT,
          },
        ],
      };
    }
  );
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

  // 2. Get single page (with raw markdown and line count)
  server.tool(
    "reader_get_page",
    "Fetch full content, line-numbered markdown, and metadata of a reader page by ID",
    {
      pageId: z.string().describe("The UUID of the page to retrieve"),
      includeLineNumbers: z.boolean().optional().default(false).describe("If true, returns line-numbered markdown lines for precision edits"),
    },
    async ({ pageId, includeLineNumbers }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const rawContent = page.content ?? "";
      let formattedContent = rawContent;

      if (includeLineNumbers) {
        const lines = rawContent.split(/\r?\n/);
        formattedContent = lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
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
                content: formattedContent,
                totalLines: rawContent.split(/\r?\n/).length,
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

  // 3. Get Page Sections (Deterministic Index-based structure)
  server.tool(
    "reader_get_page_sections",
    "Get a structured list of all sections in a page with numeric indices, headings, line ranges, and previews",
    {
      pageId: z.string().describe("The UUID of the page to inspect"),
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

      const sections = parseMarkdownSections(page.content ?? "");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              sections.map((s) => ({
                index: s.index,
                level: s.level,
                heading: s.heading,
                startLine: s.startLine,
                endLine: s.endLine,
                characterCount: s.content.length,
                preview: s.content.slice(0, 150) + (s.content.length > 150 ? "..." : ""),
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 4. Update Section by Numeric Index (100% immune to duplicate titles or double quotes)
  server.tool(
    "reader_update_section",
    "Update a specific section's body content using its numeric sectionIndex (from reader_get_page_sections). 100% immune to duplicate titles, quotes, or formatting quirks.",
    {
      pageId: z.string().describe("The UUID of the page to update"),
      sectionIndex: z.number().int().min(0).describe("0-based numeric index of the section to update (from reader_get_page_sections)"),
      newContent: z.string().describe("The new markdown body text for this section"),
      preserveHeading: z.boolean().optional().default(true).describe("Whether to keep the existing # heading line and replace only the body below it (default: true)"),
    },
    async ({ pageId, sectionIndex, newContent, preserveHeading }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      try {
        const { updatedMarkdown, section } = updateSectionByIndex(
          page.content ?? "",
          sectionIndex,
          newContent,
          preserveHeading ?? true
        );

        await prisma.page.update({
          where: { id: pageId },
          data: {
            content: updatedMarkdown,
            updatedAt: new Date(),
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  pageId,
                  sectionIndex,
                  updatedHeading: section.heading,
                  headingLevel: section.level,
                  updatedAt: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to update section: ${err.message}` }],
        };
      }
    }
  );

  // 5. Replace Line Range (Surgical Line-by-Line editing)
  server.tool(
    "reader_replace_lines",
    "Replace a specific line range [startLine, endLine] with new content. Includes optional safety check against expectedContent.",
    {
      pageId: z.string().describe("The UUID of the page to edit"),
      startLine: z.number().int().min(1).describe("Starting line number (1-indexed, inclusive)"),
      endLine: z.number().int().min(1).describe("Ending line number (1-indexed, inclusive)"),
      replacementContent: z.string().describe("The new text to replace the specified line range"),
      expectedContent: z.string().optional().describe("Optional safety check: expected text currently occupying lines [startLine..endLine]"),
    },
    async ({ pageId, startLine, endLine, replacementContent, expectedContent }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      try {
        const updatedMarkdown = replaceLines(
          page.content ?? "",
          startLine,
          endLine,
          replacementContent,
          expectedContent
        );

        await prisma.page.update({
          where: { id: pageId },
          data: {
            content: updatedMarkdown,
            updatedAt: new Date(),
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  pageId,
                  startLine,
                  endLine,
                  totalLines: updatedMarkdown.split(/\r?\n/).length,
                  updatedAt: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to replace lines: ${err.message}` }],
        };
      }
    }
  );

  // 6. Insert Section (Append or insert after specific section index)
  server.tool(
    "reader_insert_section",
    "Insert a new section and heading at a specific position (e.g. after section index 2 or at the end)",
    {
      pageId: z.string().describe("The UUID of the page"),
      heading: z.string().describe("The markdown heading line (e.g. '## 2.5 Security Considerations')"),
      content: z.string().describe("The body content for the new section"),
      afterSectionIndex: z.number().int().optional().describe("0-based section index to insert after (omit to append at the bottom)"),
    },
    async ({ pageId, heading, content, afterSectionIndex }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      if (!page) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found: ${pageId}` }],
        };
      }

      const updatedMarkdown = insertSectionAfterIndex(
        page.content ?? "",
        afterSectionIndex,
        heading,
        content
      );

      await prisma.page.update({
        where: { id: pageId },
        data: {
          content: updatedMarkdown,
          updatedAt: new Date(),
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                pageId,
                heading,
                insertedAfterIndex: afterSectionIndex ?? "end",
                updatedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 7. Create page
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

  // 8. Update page metadata / entire content
  server.tool(
    "reader_update_page",
    "Update an existing page's title, full markdown content, category, or AI prompts",
    {
      pageId: z.string().describe("The UUID of the page to update"),
      title: z.string().optional().describe("Updated title"),
      content: z.string().optional().describe("Updated Markdown body content (overwrites full page)"),
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

  // 9. Delete page
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

  // 10. Get page tree
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
