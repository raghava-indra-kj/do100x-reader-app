import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect, it } from "vitest";
import { issueSession } from "../../session";
import { createQuizRouter } from "../../quiz/quiz-router";
import { registerQuizTools } from "./quizzes";

const requireClient = createRequire(import.meta.url);
const DbClient = requireClient(process.env.QUIZ_TEST_CLIENT_MODULE || "@prisma/client").PrismaClient as typeof PrismaClient;

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("MCP and HTTP share quiz, revision, and attempt persistence", async () => {
  const db = new DbClient();
  const rollback = new Error("MCP quiz fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.appuser.create({ data: { id: randomUUID(), username: `q${randomUUID().slice(0, 12)}`, password: "0000" } });
      const page = await tx.page.create({ data: { id: randomUUID(), userId: owner.id, title: "MCP fixture", content: "Unchanged", childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
      const server = new McpServer({ name: "quiz-test", version: "1" });
      registerQuizTools(server, owner.id, tx);
      const client = new Client({ name: "quiz-test-client", version: "1" });
      const [a, b] = InMemoryTransport.createLinkedPair();
      await server.connect(a); await client.connect(b);
      const call = async (name: string, args: Record<string, unknown>) => {
        const result = await client.callTool({ name, arguments: args });
        if (result.isError) throw new Error(JSON.stringify(result.content));
        return JSON.parse((result.content as { type: "text"; text: string }[])[0].text);
      };
      const app = express(); app.use(express.json());
      app.get("/login", (_req, res) => { issueSession(res, owner.id); res.json({ ok: true }); });
      app.use("/quizzes", createQuizRouter(tx));
      const http = app.listen(0);
      try {
        const address = http.address();
        if (!address || typeof address === "string") throw new Error("No HTTP test port");
        const base = `http://127.0.0.1:${address.port}`;
        const cookie = (await fetch(`${base}/login`)).headers.get("set-cookie")!.split(";")[0];
        const created = await call("reader_create_quiz", { pageId: page.id, quiz: { title: "MCP paper", questions: [{ kind: "SUBJECTIVE", responseLength: "SHORT", promptMarkdown: "Explain?", referenceAnswerMarkdown: "Clear answer", explanationMarkdown: "Details", options: [] }] } });
        const quizId = created.quizId as string;
        expect((await call("reader_list_quizzes", { pageId: page.id })).items).toHaveLength(1);
        const added = await call("reader_apply_quiz_changes", { quizId, changes: { expectedRevisionNo: 1, operations: [{ type: "addQuestion", question: { kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "Choose", explanationMarkdown: "Reason", options: [{ bodyMarkdown: "A", isCorrect: true }, { bodyMarkdown: "B", isCorrect: false }] } }] } });
        expect(added.questions).toHaveLength(2);
        const removed = await call("reader_apply_quiz_changes", { quizId, changes: { expectedRevisionNo: 2, operations: [{ type: "removeQuestion", questionId: added.questions[1].id }] } });
        expect(removed.questions).toHaveLength(1);
        const httpRead = await (await fetch(`${base}/quizzes/${quizId}?view=author`, { headers: { Cookie: cookie } })).json();
        expect(httpRead.revisionId).toBe(removed.revisionId);
        const changed = await fetch(`${base}/quizzes/${quizId}`, { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevisionNo: 3, operations: [{ type: "setMetadata", title: "HTTP revision" }] }) });
        expect(changed.status).toBe(200);
        expect((await call("reader_get_quiz", { quizId })).title).toBe("HTTP revision");
        const second = await call("reader_create_quiz", { pageId: page.id, quiz: { title: "Second", questions: [{ kind: "SUBJECTIVE", responseLength: "LONG", promptMarkdown: "Discuss", referenceAnswerMarkdown: "Answer", explanationMarkdown: "Why", options: [] }] } });
        expect((await call("reader_swap_quiz_order", { quizId, otherQuizId: second.quizId })).firstId).toBe(quizId);
        expect((await call("reader_list_quizzes", { pageId: page.id })).items[0].id).toBe(second.quizId);
        const attempt = await call("reader_start_quiz_attempt", { quizId, startRequestKey: randomUUID() });
        await call("reader_save_quiz_answer", { attemptId: attempt.id, answer: { questionId: attempt.questions[0].id, responseMarkdown: "My answer" } });
        const submitted = await call("reader_submit_quiz_attempt", { attemptId: attempt.id });
        expect(submitted.status).toBe("SUBMITTED");
        const context = await call("reader_get_quiz_evaluation_context", { attemptId: attempt.id });
        expect(context.questions[0].referenceAnswerMarkdown).toBe("Clear answer");
        const evaluation = await call("reader_record_quiz_evaluations", { attemptId: attempt.id, batch: {
          requestKey: randomUUID(), modelId: "test-model", promptVersion: "v1",
          evaluations: [{ questionId: attempt.questions[0].id, verdict: "PARTIAL", scorePercent: 50, feedbackMarkdown: "Add a key detail." }],
        } });
        expect(evaluation.evaluations).toHaveLength(1);
        expect((await call("reader_get_quiz_evaluation_history", { attemptId: attempt.id })).filter((row: { source: string }) => row.source === "AI")).toHaveLength(1);
        const httpAttempt = await (await fetch(`${base}/quizzes/attempts/${attempt.id}`, { headers: { Cookie: cookie } })).json();
        expect(httpAttempt.questions[0].answer.responseMarkdown).toBe("My answer");
        expect(httpAttempt.questions[0].latestFeedback.feedbackMarkdown).toBe("Add a key detail.");
        expect((await call("reader_get_quiz_attempt", { attemptId: attempt.id })).id).toBe(attempt.id);
        expect((await call("reader_list_quiz_attempts", { quizId })).items).toHaveLength(1);
        expect((await call("reader_archive_quiz", { quizId, expectedRevisionNo: 4 })).id).toBe(quizId);
        expect((await call("reader_list_quizzes", { pageId: page.id, archivedOnly: true })).items[0].id).toBe(quizId);
      } finally {
        await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
        await client.close(); await server.close();
      }
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally { await db.$disconnect(); }
});
