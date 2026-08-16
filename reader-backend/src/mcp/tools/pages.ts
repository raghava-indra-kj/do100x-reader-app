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

  // 11. Full-Text Knowledge Search
  server.tool(
    "reader_search",
    "Search for text across all page titles and markdown contents with excerpt snippets and line numbers",
    {
      query: z.string().describe("Search term or keyword"),
      category: z.string().optional().describe("Optional category filter"),
      limit: z.number().optional().describe("Max matching pages to return (default: 20)"),
    },
    async ({ query, category, limit = 20 }) => {
      const where: Record<string, unknown> = {
        userId,
        deletedAt: null,
      };
      if (category) where.category = category;

      const pages = await prisma.page.findMany({
        where,
        select: {
          id: true,
          parentId: true,
          title: true,
          category: true,
          content: true,
          updatedAt: true,
        },
      });

      const qLower = query.toLowerCase();
      const results: Array<{
        id: string;
        title: string;
        category: string | null;
        parentId: string | null;
        titleMatch: boolean;
        matchesCount: number;
        snippets: Array<{ line: number; text: string }>;
      }> = [];

      for (const p of pages) {
        const titleMatch = p.title.toLowerCase().includes(qLower);
        const content = p.content || "";
        const lines = content.split(/\r?\n/);
        const snippets: Array<{ line: number; text: string }> = [];

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(qLower)) {
            snippets.push({
              line: i + 1,
              text: lines[i].trim(),
            });
            if (snippets.length >= 5) break;
          }
        }

        if (titleMatch || snippets.length > 0) {
          results.push({
            id: p.id,
            title: p.title,
            category: p.category,
            parentId: p.parentId,
            titleMatch,
            matchesCount: snippets.length + (titleMatch ? 1 : 0),
            snippets,
          });
        }

        if (results.length >= limit) break;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ query, totalResults: results.length, results }, null, 2),
          },
        ],
      };
    }
  );

  // 12. Lightweight Outline / Table of Contents
  server.tool(
    "reader_get_outline",
    "Get a lightweight Table of Contents (headings with line numbers and section indices) for a page and its subpages without pulling full body text",
    {
      pageId: z.string().describe("Target page ID"),
      includeSubpages: z.boolean().optional().describe("Whether to include headings from subpages (default: true)"),
    },
    async ({ pageId, includeSubpages = true }) => {
      const rootPage = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });
      if (!rootPage) {
        return { isError: true, content: [{ type: "text", text: `Page not found: ${pageId}` }] };
      }

      const allPages = includeSubpages
        ? await prisma.page.findMany({
            where: { userId, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          })
        : [rootPage];

      function getHeadings(markdown: string) {
        const sections = parseMarkdownSections(markdown);
        return sections.map((s) => ({
          sectionIndex: s.index,
          level: s.level,
          heading: s.heading,
          startLine: s.startLine,
          endLine: s.endLine,
        }));
      }

      interface PageOutline {
        id: string;
        title: string;
        category: string | null;
        headings: ReturnType<typeof getHeadings>;
        subpages: PageOutline[];
      }

      const childrenMap = new Map<string | null, typeof allPages>();
      for (const p of allPages) {
        const parent = p.parentId;
        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent)!.push(p);
      }

      function buildOutline(p: typeof rootPage): PageOutline {
        const children = includeSubpages ? (childrenMap.get(p.id) ?? []) : [];
        return {
          id: p.id,
          title: p.title,
          category: p.category,
          headings: getHeadings(p.content || ""),
          subpages: children.map(buildOutline),
        };
      }

      const outline = buildOutline(rootPage);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(outline, null, 2),
          },
        ],
      };
    }
  );

  // 13. Fast Append Content
  server.tool(
    "reader_append_content",
    "Append markdown content to the end of a page, or to the end of a specific section by index",
    {
      pageId: z.string().describe("Target page ID"),
      content: z.string().describe("Markdown content to append"),
      sectionIndex: z.number().optional().describe("Optional sectionIndex (from reader_get_page_sections) to append to. If omitted, appends to the end of the entire page."),
      separator: z.string().optional().describe("Separator before appended content (default: blank lines)"),
    },
    async ({ pageId, content, sectionIndex, separator = "\n\n" }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });
      if (!page) {
        return { isError: true, content: [{ type: "text", text: `Page not found: ${pageId}` }] };
      }

      const existingContent = page.content || "";
      let updatedContent = "";

      if (sectionIndex !== undefined) {
        const sections = parseMarkdownSections(existingContent);
        if (sectionIndex < 0 || sectionIndex >= sections.length) {
          return { isError: true, content: [{ type: "text", text: `Invalid sectionIndex: ${sectionIndex}` }] };
        }
        const target = sections[sectionIndex];
        const newSectionContent = target.content ? `${target.content}${separator}${content.trim()}` : content.trim();
        const res = updateSectionByIndex(existingContent, sectionIndex, newSectionContent, true);
        updatedContent = res.updatedMarkdown;
      } else {
        updatedContent = existingContent.trim() ? `${existingContent.trim()}${separator}${content.trim()}` : content.trim();
      }

      const updated = await prisma.page.update({
        where: { id: pageId },
        data: {
          content: updatedContent,
          updatedAt: new Date(),
        },
      });

      const newSections = parseMarkdownSections(updated.content || "");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              pageId: updated.id,
              totalLines: (updated.content || "").split(/\r?\n/).length,
              totalSections: newSections.length,
            }, null, 2),
          },
        ],
      };
    }
  );

  // 14. Batch Create Pages
  server.tool(
    "reader_batch_create_pages",
    "Create multiple pages and subpages at once with automated parent-child ID resolution",
    {
      pages: z.array(
        z.object({
          tempId: z.string().describe("Unique local identifier for this batch (e.g. 'root', 'ch1', 'ch1-sec1')"),
          title: z.string().describe("Page title"),
          content: z.string().optional().describe("Markdown content"),
          category: z.string().optional().describe("Category"),
          parentTempId: z.string().optional().describe("tempId of the parent page created in this same batch"),
          parentPageId: z.string().optional().describe("Existing DB page ID of parent (if attaching to existing page)"),
          sortOrder: z.number().optional().describe("Sort order index"),
        })
      ).describe("List of pages to create in dependency order (parents first)"),
    },
    async ({ pages }) => {
      const now = new Date();
      const idMap = new Map<string, string>();
      const createdPages: any[] = [];

      for (let i = 0; i < pages.length; i++) {
        const item = pages[i];
        let parentId: string | null = null;

        if (item.parentTempId && idMap.has(item.parentTempId)) {
          parentId = idMap.get(item.parentTempId)!;
        } else if (item.parentPageId) {
          parentId = item.parentPageId;
        }

        const created = await prisma.page.create({
          data: {
            userId,
            parentId,
            title: item.title,
            content: item.content ?? null,
            category: item.category ?? null,
            sortOrder: item.sortOrder ?? i,
            childrenCount: 0,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          },
        });

        idMap.set(item.tempId, created.id);
        createdPages.push({ tempId: item.tempId, id: created.id, title: created.title, parentId });

        if (parentId) {
          await prisma.page.update({
            where: { id: parentId },
            data: { childrenCount: { increment: 1 }, updatedAt: now },
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, count: createdPages.length, pages: createdPages }, null, 2),
          },
        ],
      };
    }
  );

  // 15. Move / Reorganize Page
  server.tool(
    "reader_move_page",
    "Move a page to a new parent (or to root) and optionally update its sort order",
    {
      pageId: z.string().describe("Target page ID to move"),
      newParentId: z.string().nullable().optional().describe("New parent page ID, or null / 'null' to move to root"),
      sortOrder: z.number().optional().describe("New sort order integer"),
    },
    async ({ pageId, newParentId, sortOrder }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });
      if (!page) {
        return { isError: true, content: [{ type: "text", text: `Page not found: ${pageId}` }] };
      }

      const targetParentId = newParentId === "null" || newParentId === undefined ? null : newParentId;

      // Prevent cyclic nesting
      if (targetParentId) {
        if (targetParentId === pageId) {
          return { isError: true, content: [{ type: "text", text: "Cannot move a page to be its own parent" }] };
        }
        let checkId: string | null = targetParentId;
        while (checkId) {
          const parent = await prisma.page.findFirst({
            where: { id: checkId, userId, deletedAt: null },
            select: { parentId: true },
          });
          if (!parent) break;
          if (parent.parentId === pageId) {
            return { isError: true, content: [{ type: "text", text: "Cannot move a page inside its own descendant" }] };
          }
          checkId = parent.parentId;
        }
      }

      const now = new Date();
      const oldParentId = page.parentId;

      const updated = await prisma.page.update({
        where: { id: pageId },
        data: {
          parentId: targetParentId,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          updatedAt: now,
        },
      });

      if (oldParentId !== targetParentId) {
        if (oldParentId) {
          await prisma.page.update({
            where: { id: oldParentId },
            data: { childrenCount: { decrement: 1 }, updatedAt: now },
          });
        }
        if (targetParentId) {
          await prisma.page.update({
            where: { id: targetParentId },
            data: { childrenCount: { increment: 1 }, updatedAt: now },
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              pageId: updated.id,
              oldParentId,
              newParentId: updated.parentId,
              sortOrder: updated.sortOrder,
            }, null, 2),
          },
        ],
      };
    }
  );

  // 16. Duplicate Page
  server.tool(
    "reader_duplicate_page",
    "Duplicate an existing page and optionally all of its nested subpages",
    {
      pageId: z.string().describe("Page ID to duplicate"),
      newTitle: z.string().optional().describe("Custom title for the cloned page (default: '{Original Title} (Copy)')"),
      includeSubpages: z.boolean().optional().describe("Whether to duplicate nested subpages recursively (default: false)"),
      targetParentId: z.string().nullable().optional().describe("Target parent page ID (default: same parent as original)"),
    },
    async ({ pageId, newTitle, includeSubpages = false, targetParentId }) => {
      const source = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });
      if (!source) {
        return { isError: true, content: [{ type: "text", text: `Page not found: ${pageId}` }] };
      }

      const now = new Date();
      const parentId = targetParentId !== undefined ? (targetParentId === "null" ? null : targetParentId) : source.parentId;

      async function clonePageRecursive(srcPage: typeof source, pId: string | null, customTitle?: string): Promise<any> {
        const cloned = await prisma.page.create({
          data: {
            userId,
            parentId: pId,
            title: customTitle || `${srcPage.title} (Copy)`,
            content: srcPage.content,
            category: srcPage.category,
            sortOrder: srcPage.sortOrder + 1,
            childrenCount: 0,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          },
        });

        if (pId) {
          await prisma.page.update({
            where: { id: pId },
            data: { childrenCount: { increment: 1 }, updatedAt: now },
          });
        }

        if (includeSubpages) {
          const children = await prisma.page.findMany({
            where: { parentId: srcPage.id, userId, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          });
          for (const child of children) {
            await clonePageRecursive(child, cloned.id, child.title);
          }
        }

        return cloned;
      }

      const rootCloned = await clonePageRecursive(source, parentId, newTitle);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              originalPageId: pageId,
              clonedPageId: rootCloned.id,
              clonedTitle: rootCloned.title,
            }, null, 2),
          },
        ],
      };
    }
  );

  // 17. Compile / Export Bundle
  server.tool(
    "reader_compile_bundle",
    "Compile a parent page and all its nested subpages into a single, cohesive Markdown document with an automated Table of Contents",
    {
      pageId: z.string().describe("Root page ID to compile"),
      includeTableOfContents: z.boolean().optional().describe("Whether to generate a Table of Contents at the top (default: true)"),
    },
    async ({ pageId, includeTableOfContents = true }) => {
      const rootPage = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });
      if (!rootPage) {
        return { isError: true, content: [{ type: "text", text: `Page not found: ${pageId}` }] };
      }

      const allPages = await prisma.page.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });

      const childrenMap = new Map<string | null, typeof allPages>();
      for (const p of allPages) {
        const parent = p.parentId;
        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        childrenMap.get(parent)!.push(p);
      }

      const orderedList: Array<{ page: typeof rootPage; depth: number }> = [];
      function collect(p: typeof rootPage, depth: number) {
        orderedList.push({ page: p, depth });
        const children = childrenMap.get(p.id) ?? [];
        for (const child of children) {
          collect(child, depth + 1);
        }
      }
      collect(rootPage, 1);

      const tocLines: string[] = [];
      const sectionsMarkdown: string[] = [];

      for (const { page, depth } of orderedList) {
        const indent = "  ".repeat(depth - 1);
        const anchor = page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        tocLines.push(`${indent}- [${page.title}](#${anchor})`);

        const rawContent = (page.content || "").replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
        sectionsMarkdown.push(`<h${depth} id="${anchor}">${page.title}</h${depth}>\n\n${rawContent}`);
      }

      let finalMarkdown = "";
      if (includeTableOfContents && orderedList.length > 1) {
        finalMarkdown += `# ${rootPage.title}\n\n## Table of Contents\n\n${tocLines.join("\n")}\n\n---\n\n`;
      }
      finalMarkdown += sectionsMarkdown.join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: finalMarkdown,
          },
        ],
      };
    }
  );
}
