import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import express from "express";
import type { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { issueSession, attachSession } from "../session";
import { createQuizRouter } from "./quiz-router";

const requireClient = createRequire(import.meta.url);
const Client = requireClient(process.env.QUIZ_TEST_CLIENT_MODULE || "@prisma/client").PrismaClient as typeof PrismaClient;

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("HTTP quiz routes enforce access and share domain behavior", async () => {
  const db = new Client();
  const rollback = new Error("HTTP quiz fixture rollback");
  try {
    await db.$transaction(async (tx) => {
      const owner = await tx.appuser.create({ data: { id: randomUUID(), email: `test-${randomUUID()}@example.com`, identities: { create: { provider: "GOOGLE", providerSubject: randomUUID() } } } });
      const stranger = await tx.appuser.create({ data: { id: randomUUID(), email: `test-${randomUUID()}@example.com`, identities: { create: { provider: "GOOGLE", providerSubject: randomUUID() } } } });
      const page = await tx.page.create({ data: { id: randomUUID(), userId: owner.id, title: "HTTP fixture", content: "Unchanged", childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
      const app = express();
      app.use(express.json());
      app.use(attachSession(tx));
      app.get("/test-login/:userId", (req, res) => { issueSession(res, req.params.userId as string); res.json({ ok: true }); });
      app.use("/quizzes", createQuizRouter(tx));
      const server = app.listen(0);
      try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No HTTP test port");
        const base = `http://127.0.0.1:${address.port}`;
        const cookie = async (id: string) => (await fetch(`${base}/test-login/${id}`)).headers.get("set-cookie")!.split(";")[0];
        const ownerCookie = await cookie(owner.id);
        const strangerCookie = await cookie(stranger.id);
        const request = (path: string, method = "GET", body?: unknown, session?: string) => fetch(`${base}/quizzes${path}`, {
          method, headers: { Origin: "http://localhost:3000", ...(session ? { Cookie: session } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const input = { pageId: page.id, quiz: { title: "API paper", questions: [{ kind: "OBJECTIVE", selectionMode: "SINGLE", promptMarkdown: "Q?", explanationMarkdown: "Why.", options: [{ bodyMarkdown: "Yes", isCorrect: true }, { bodyMarkdown: "No", isCorrect: false }] }] } };
        expect((await request("/", "POST", input)).status).toBe(401);
        expect((await request("/", "POST", input, strangerCookie)).status).toBe(404);
        const createdResponse = await request("/", "POST", input, ownerCookie);
        expect(createdResponse.status).toBe(201);
        const created = await createdResponse.json();
        const quizId = created.quizId as string;
        expect((await request(`/${quizId}?view=author`, "GET", undefined, strangerCookie)).status).toBe(404);
        const learner = await (await request(`/${quizId}`)).json();
        expect(JSON.stringify(learner)).not.toMatch(/isCorrect|explanationMarkdown/);
        expect((await (await request(`/?pageId=${page.id}`)).json()).items).toHaveLength(1);
        const revised = await (await request(`/${quizId}`, "PATCH", { expectedRevisionNo: 1, operations: [{ type: "setMetadata", title: "Revised" }] }, ownerCookie)).json();
        expect(revised.revisionNo).toBe(2);
        expect((await request(`/${quizId}`, "PATCH", { expectedRevisionNo: 1, operations: [{ type: "setMetadata", title: "Stale" }] }, ownerCookie)).status).toBe(409);
        const started = await (await request(`/${quizId}/attempts`, "POST", { startRequestKey: randomUUID() }, ownerCookie)).json();
        const respondentAttempt = await (await request(`/${quizId}/attempts`, "POST", { startRequestKey: randomUUID() }, strangerCookie)).json();
        const optionId = started.questions[0].options[0].id;
        expect((await request(`/attempts/${started.id}/answers`, "PUT", { questionId: started.questions[0].id, selectedOptionIds: [optionId] }, ownerCookie)).status).toBe(200);
        const result = await (await request(`/attempts/${started.id}/submit`, "POST", {}, ownerCookie)).json();
        expect(result.questions[0].verdict).toBe("CORRECT");
        expect((await request(`/attempts/${started.id}`, "GET", undefined, strangerCookie)).status).toBe(404);
        expect((await request(`/${quizId}/archive`, "POST", { expectedRevisionNo: 2 }, ownerCookie)).status).toBe(200);
        expect((await request(`/${quizId}/attempts`, "POST", { startRequestKey: randomUUID() }, ownerCookie)).status).toBe(404);
        expect((await request(`/attempts/${started.id}`, "GET", undefined, ownerCookie)).status).toBe(200);
        expect((await request(`/?pageId=${page.id}&archivedOnly=true`)).status).toBe(404);
        expect((await (await request(`/?pageId=${page.id}&archivedOnly=true`, "GET", undefined, strangerCookie)).json()).items).toHaveLength(1);
        expect((await request(`/attempts/${respondentAttempt.id}`, "GET", undefined, strangerCookie)).status).toBe(200);
        expect((await tx.page.findUniqueOrThrow({ where: { id: page.id } })).content).toBe("Unchanged");
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      throw rollback;
    }, { timeout: 20_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally { await db.$disconnect(); }
});
