import { registerTool } from '../register-tool';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import { withoutExpiredCaptureComments, isExpiredCapture, createPageComment, updatePageComment } from "../../reader/capture-comment-access";
import { commentAnchorSchema } from '../../reader/comment-attachment';

export function registerCommentTools(server: McpServer, userId: string) {
  // 1. Get comments
  registerTool(server,
    "reader_get_comments",
    "Get comments, personal annotations, and marked explanations for a page or date",
    {
      pageId: z.string().optional().describe("Scope comments to a specific page UUID"),
      isExplanation: z.boolean().optional().describe("Filter for explanations only (true) or general comments (false)"),
      date: z.string().optional().describe("Filter by calendar date (YYYY-MM-DD)"),
    },
    async ({ pageId, isExplanation, date }) => {
      const where: Record<string, unknown> = {
        userId,
      };

      if (pageId) where.pageId = pageId;
      if (isExplanation !== undefined) where.isExplanation = isExplanation;

      if (date) {
        const parsed = new Date(`${date}T00:00:00.000Z`);
        if (!Number.isNaN(parsed.getTime())) {
          const next = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
          where.createdAt = { gte: parsed, lt: next };
        }
      }

      const comments = await prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              (await withoutExpiredCaptureComments(prisma, comments)).map((c) => ({
                id: c.id,
                pageId: c.pageId,
                pageTitle: c.pageTitle,
                sectionTitle: c.sectionTitle,
                selectedText: c.selectedText,
                body: c.body,
                anchor: c.anchor,
                anchorRevision: c.anchorRevision,
                resolvedAt: c.resolvedAt,
                linkedPageId: c.linkedPageId,
                isExplanation: c.isExplanation,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. Create comment
  registerTool(server,
    "reader_create_comment",
    "Add a new comment, explanation, or linked annotation to a page or selected text",
    {
      pageId: z.string().describe("Page UUID to attach the comment to"),
      selectedText: z.string().describe("The quote or text selection on the page"),
      body: z.string().describe("The note, explanation, or annotation text"),
      sectionTitle: z.string().nullable().optional().describe("Title of the section heading where the comment belongs"),
      linkedPageId: z.string().nullable().optional().describe("UUID of another page to link for cross-reference"),
      isExplanation: z.boolean().optional().default(false).describe("Mark this comment as an explanation"),
      anchor: commentAnchorSchema.optional().describe('Precise target using block IDs from reader_get_page.documentMetadata; text offsets are UTF-16 source offsets relative to each block'),
      contentVersion: z.number().int().nonnegative().optional().describe('Required when anchor is supplied; use reader_get_page.contentVersion'),
    },
    async ({
      pageId,
      selectedText,
      body,
      sectionTitle,
      linkedPageId,
      isExplanation,
      anchor, contentVersion,
    }) => {
      const targetPage = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
        select: { title: true },
      });

      if (!targetPage) {
        return {
          isError: true,
          content: [{ type: "text", text: `Page not found or inaccessible: ${pageId}` }],
        };
      }

      const now = new Date();
      const newComment = await createPageComment(prisma, {
          userId,
          pageId,
          pageTitle: targetPage.title,
          sectionTitle: sectionTitle ?? null,
          selectedText,
          body,
          linkedPageId: linkedPageId ?? null,
          isExplanation: isExplanation ?? false,
          createdAt: now,
          updatedAt: now,
      }, true, { anchor, contentVersion });
      if (!newComment) return { isError: true, content: [{ type: 'text', text: 'Page or linked page is no longer available.' }] };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, commentId: newComment.id }, null, 2),
          },
        ],
      };
    }
  );

  // 3. Update comment
  registerTool(server,
    "reader_update_comment",
    "Edit a comment, resolve or reopen it, or reattach it to a current page selection",
    {
      commentId: z.string().describe("The UUID of the comment to update"),
      body: z.string().optional().describe("The new body text"),
      linkedPageId: z.string().nullable().optional().describe("The new linked page UUID"),
      resolved: z.boolean().optional().describe('Resolve (true) or reopen (false) the discussion without changing its source attachment'),
      anchor: commentAnchorSchema.optional().describe('New selection for reattachment; use current block IDs and ranges from reader_get_page'),
      contentVersion: z.number().int().nonnegative().optional().describe('Required when reattaching; the current page revision'),
    },
    async ({ commentId, body, linkedPageId, resolved, anchor, contentVersion }) => {
      const existing = await prisma.comment.findFirst({
        where: { id: commentId, userId },
      });

      if (!existing || await isExpiredCapture(prisma, existing.pageId)) {
        return {
          isError: true,
          content: [{ type: "text", text: `Comment not found: ${commentId}` }],
        };
      }

      const updated = await updatePageComment(prisma, userId, commentId, { body, linkedPageId, resolved }, { anchor, contentVersion });
      if (!updated) return { isError: true, content: [{ type: 'text', text: 'Comment or linked page is no longer available.' }] };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, commentId }),
          },
        ],
      };
    }
  );

  // 4. Delete comment
  registerTool(server,
    "reader_delete_comment",
    "Delete a single comment by ID",
    {
      commentId: z.string().describe("The UUID of the comment to delete"),
    },
    async ({ commentId }) => {
      const existing = await prisma.comment.findFirst({
        where: { id: commentId, userId },
      });

      if (!existing || await isExpiredCapture(prisma, existing.pageId)) {
        return {
          isError: true,
          content: [{ type: "text", text: `Comment not found: ${commentId}` }],
        };
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deletedCommentId: commentId }),
          },
        ],
      };
    }
  );
}
