import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../prisma";
import { ensurePersonalReaderSpace } from "../reader-space";

export function registerPrompts(server: McpServer, userId: string) {
  // 1. Study Guide
  server.prompt(
    "reader_study_guide",
    "Generate a structured study guide with key takeaways, definitions, and questions for a page and its subpages",
    {
      pageId: z.string().describe("The UUID of the root or target page to summarize"),
    },
    async ({ pageId }) => {
      const space = await ensurePersonalReaderSpace(userId);
      const page = await prisma.reader_document.findFirst({
        where: { id: pageId, readerSpaceId: space.readerSpaceId, deletedAt: null },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
      });

      const subpages = await prisma.reader_document.findMany({
        where: { parentId: pageId, readerSpaceId: space.readerSpaceId, deletedAt: null },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
      });

      const contentBlock = [
        `Main Page: ${page?.title ?? "Untitled"}`,
        page?.revisions[0]?.markdown ?? "",
        ...subpages.map((s) => `Subpage: ${s.title}\n${s.revisions[0]?.markdown ?? ""}`),
      ].join("\n\n---\n\n");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please generate a comprehensive study guide for this material.
Include:
1. Executive Summary
2. Key Concepts & Definitions
3. In-depth Breakdown of Topics
4. 5 Review / Discussion Questions

Material:
${contentBlock}`,
            },
          },
        ],
      };
    }
  );

  // 2. Explain Section
  server.prompt(
    "reader_explain_section",
    "Deep-dive explanation and analogies for a specific excerpt or section from a page",
    {
      pageId: z.string().describe("The page UUID"),
      sectionOrText: z.string().describe("The text or heading to explain"),
    },
    async ({ pageId, sectionOrText }) => {
      const space = await ensurePersonalReaderSpace(userId);
      const page = await prisma.reader_document.findFirst({
        where: { id: pageId, readerSpaceId: space.readerSpaceId, deletedAt: null },
        include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
      });

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I am reading the page "${page?.title ?? "Document"}".

Context:\n${page?.revisions[0]?.markdown ?? ""}\n\nCan you explain the following concept/section clearly with real-world analogies, examples, and step-by-step breakdown?\n\nTarget Concept: ${sectionOrText}`,
            },
          },
        ],
      };
    }
  );

  // 3. Vocabulary Quiz
  server.prompt(
    "reader_vocabulary_quiz",
    "Create an interactive vocabulary quiz based on terms looked up in Reader",
    {
      limit: z.string().optional().describe("Number of terms to test (default: 5)"),
    },
    async ({ limit }) => {
      const count = limit ? parseInt(limit, 10) : 5;
      const terms = await prisma.vocabulary.findMany({
        where: { userId },
        take: count,
        orderBy: { createdAt: "desc" },
      });

      const wordList = terms.map((t) => t.term).join(", ");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Create a 5-question multiple-choice vocabulary quiz to test my understanding of these words:
Words: ${wordList}

Format:
- Each question with 4 options (A, B, C, D)
- Answer key at the very bottom hidden in a spoiler or after the quiz`,
            },
          },
        ],
      };
    }
  );

  // 4. Create Page with Format Guide
  server.prompt(
    "reader_create_page_with_format_guide",
    "Generate a new Reader page adhering strictly to the official format.llm.md guidelines (frontmatter, callouts, diagrams)",
    {
      topic: z.string().describe("The topic, title, or subject of the page to create"),
      category: z.string().optional().describe("Optional category tag (e.g. 'Engineering', 'Architecture', 'Notes')"),
    },
    async ({ topic, category }) => {
      const { FORMAT_LLM_MD_CONTENT } = await import("./constants/format-guide");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please generate a comprehensive, beautifully structured documentation page about "${topic}".

You MUST strictly follow the Reader application Markdown Formatting Guidelines (format.llm.md):

${FORMAT_LLM_MD_CONTENT}

Topic: ${topic}
Category: ${category ?? "Documentation"}

Ensure:
1. Valid YAML frontmatter with double-quoted title and category.
2. ATX headings for clear sectioning.
3. Blank lines inside any <callout> and <details> tags.
4. Live Mermaid or D2 diagram code blocks where visual architecture is helpful.`,
            },
          },
        ],
      };
    }
  );

  // 5. Eisenhower Task Prioritizer
  server.prompt(
    "reader_task_prioritizer",
    "Analyze open tasks and organize them into an Eisenhower Priority Matrix (P1-P4) with an actionable daily execution plan",
    {},
    async () => {
      const tasks = await prisma.task.findMany({
        where: { userId, status: { notIn: ["done", "cancelled"] }, deletedAt: null },
        select: { id: true, title: true, priority: true, dueDate: true, listId: true, totalTimeSeconds: true },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      });

      const formatted = tasks.map((t) => `- [${t.id}] ${t.title} (Priority: P${t.priority}, Due: ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "No date"}, Time spent: ${Math.round(t.totalTimeSeconds / 60)}m)`).join("\n");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Here are my current open tasks:

${formatted}

Please analyze these tasks and provide:
1. **Eisenhower Matrix Breakdown**:
   - **Q1: Urgent & Important (P1)** — Do First today
   - **Q2: Important, Not Urgent (P2)** — Schedule on calendar
   - **Q3: Urgent, Not Important (P3)** — Delegate or quick batch
   - **Q4: Not Urgent, Not Important (P4)** — Eliminate or Backlog
2. **Top 3 High-Impact Focus Items** for today.
3. Recommended priority updates for any misclassified tasks.`,
            },
          },
        ],
      };
    }
  );

  // 6. Time Audit & Productivity Review
  server.prompt(
    "reader_time_audit",
    "Audit logged time sessions over past days to highlight focus bottlenecks and recommend scheduling optimizations",
    {
      days: z.string().optional().describe("Number of past days to audit (default: 7)"),
    },
    async ({ days }) => {
      const dayCount = days ? parseInt(days, 10) : 7;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - dayCount);

      const sessions = await prisma.time_session.findMany({
        where: { userId, startTime: { gte: sinceDate } },
        orderBy: { startTime: "desc" },
      });

      const tasks = await prisma.task.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, title: true, priority: true },
      });
      const taskMap = new Map(tasks.map((t) => [t.id, t.title]));

      const log = sessions.map((s) => `- ${s.startTime.toISOString().slice(0, 10)}: "${taskMap.get(s.taskId) || "Task"}" spent ${Math.round(s.durationSeconds / 60)} min${s.notes ? ` (Notes: ${s.notes})` : ""}`).join("\n");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Here is my recorded time log over the past ${dayCount} days:

${log}

Please provide a thorough **Time & Productivity Audit**:
1. Where was the vast majority of time spent?
2. Were high-priority (P1/P2) goals receiving adequate focus vs. lower-value tasks?
3. What are 3 actionable recommendations to optimize my daily schedule and reduce context switching?`,
            },
          },
        ],
      };
    }
  );
}
