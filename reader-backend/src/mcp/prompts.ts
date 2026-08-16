import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../prisma";

export function registerPrompts(server: McpServer, userId: string) {
  // 1. Study Guide
  server.prompt(
    "reader_study_guide",
    "Generate a structured study guide with key takeaways, definitions, and questions for a page and its subpages",
    {
      pageId: z.string().describe("The UUID of the root or target page to summarize"),
    },
    async ({ pageId }) => {
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      const subpages = await prisma.page.findMany({
        where: { parentId: pageId, userId, deletedAt: null },
        select: { title: true, content: true },
      });

      const contentBlock = [
        `Main Page: ${page?.title ?? "Untitled"}`,
        page?.content ?? "",
        ...subpages.map((s) => `Subpage: ${s.title}\n${s.content ?? ""}`),
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
      const page = await prisma.page.findFirst({
        where: { id: pageId, userId, deletedAt: null },
      });

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I am reading the page "${page?.title ?? "Document"}".

Context:\n${page?.content ?? ""}\n\nCan you explain the following concept/section clearly with real-world analogies, examples, and step-by-step breakdown?\n\nTarget Concept: ${sectionOrText}`,
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
}
