import express from "express";
import { PrismaClient } from "@prisma/client";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { expect, it } from "vitest";
import { createAuthRouter } from "./auth-router";
import type { GoogleProfile } from "./google";
import { attachSession, requireSession } from "../session";
import { authConfig } from "./config";
import { createReaderPreferencesRouter } from "../reader/reader-preferences";
import tasks from "../tasks";
import lists from "../task-lists";
import timer from "../timer";
import config from "../model-config";
import models from "../user-models";
import comments from "../comments";
import vocabulary from "../vocabulary";
import chat from "../chat";
import preferences from "../user-preferences";
import { validateUserToken } from "../mcp/user-context";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

it.skipIf(process.env.RUN_DATABASE_TESTS !== "1")("Google-only sign-in, ownership and Reader initialization are reliable", async () => {
  const db = new PrismaClient();
  const tokens = new Map<string, GoogleProfile>();
  const subjects: string[] = [];
  const createdUserIds = new Set<string>();
  const sharedEmail = `changed-${randomUUID()}@example.com`;
  const challengeHashes: string[] = [];
  const app = express(); app.use(express.json()); app.use(attachSession(db));
  app.use("/backend-api/auth", createAuthRouter(db, async token => { const profile = tokens.get(token); if (!profile) throw new Error("Invalid Google token"); return profile; }));
  app.use("/backend-api/reader", createReaderPreferencesRouter(db));
  app.use("/backend-api/tasks", tasks); app.use("/backend-api/task-lists", lists); app.use("/backend-api/timer", timer);
  app.use("/backend-api/model-config", config); app.use("/backend-api/user-models", models);
  app.use("/backend-api/comments", comments); app.use("/backend-api/vocabulary", vocabulary);
  app.use("/backend-api/chat", chat); app.use("/backend-api/user-preferences", preferences);
  app.get("/private", requireSession, (_req, res) => res.json({ id: res.locals.userId }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No test port");
  const base = `http://127.0.0.1:${address.port}`;
  const request = (path: string, method = "GET", body?: unknown, cookie?: string, extra: Record<string, string> = {}) => fetch(base + path, {
    method, headers: { Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const challenge = async () => {
    const response = await request("/backend-api/auth/challenge");
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    challengeHashes.push(hash(cookie.split("=")[1]));
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Strict");
    return { cookie, nonce: (await response.json()).nonce as string };
  };
  const signIn = async (subject = randomUUID(), email = `${randomUUID()}@example.com`, displayName = "Reader") => {
    if (!subjects.includes(subject)) subjects.push(subject);
    const c = await challenge(); const credential = randomUUID();
    tokens.set(credential, { subject, email, displayName, avatarUrl: null, nonce: c.nonce });
    const response = await request("/backend-api/auth/google", "POST", { credential }, c.cookie, { "x-login-csrf": c.nonce });
    expect(response.status).toBe(200);
    const user = await response.json();
    createdUserIds.add(user.id);
    const cookie = response.headers.getSetCookie().find(value => value.startsWith("reader_session="))!.split(";")[0];
    return { user, cookie, c, credential, subject };
  };
  try {
    expect(await (await request("/backend-api/auth/config")).json()).toEqual({ googleClientId: authConfig().clientId });
    expect((await request("/backend-api/auth/session", "GET", undefined, undefined, { "x-user-id": "owner" })).status).toBe(401);
    expect((await request("/backend-api/signup", "POST", { username: "owner", password: "secret" })).status).toBe(404);
    expect((await request("/backend-api/me", "POST", { username: "owner", password: "secret" })).status).toBe(404);
    expect((await request("/backend-api/auth/google", "POST", { credential: "invalid" })).status).toBe(403);
    const c = await challenge();
    expect((await request("/backend-api/auth/google", "POST", { credential: "invalid" }, c.cookie, { "x-login-csrf": c.nonce })).status).toBe(401);
    expect((await request("/backend-api/auth/google", "POST", { credential: "invalid" }, c.cookie, { "x-login-csrf": "wrong" })).status).toBe(403);
    expect((await request("/backend-api/auth/google", "POST", { credential: "invalid" }, c.cookie, { "x-login-csrf": c.nonce, Origin: "https://attacker.example" })).status).toBe(403);
    const credential = randomUUID(); tokens.set(credential, { subject: randomUUID(), email: "unused@example.com", displayName: null, avatarUrl: null, nonce: "wrong" });
    expect((await request("/backend-api/auth/google", "POST", { credential }, c.cookie, { "x-login-csrf": c.nonce })).status).toBe(403);
    await db.auth_login_challenge.update({ where: { idHash: challengeHashes.at(-1)! }, data: { expiresAt: new Date(0) } });
    expect((await request("/backend-api/auth/google", "POST", { credential }, c.cookie, { "x-login-csrf": c.nonce })).status).toBe(403);

    const a = await signIn();
    expect(Object.keys(a.user).sort()).toEqual(["avatarUrl", "displayName", "email", "id"]);
    expect(await db.page.count({ where: { userId: a.user.id } })).toBe(0);
    expect(await db.reader_preferences.count({ where: { userId: a.user.id } })).toBe(0);
    expect((await request("/backend-api/auth/google", "POST", { credential: a.credential }, a.c.cookie, { "x-login-csrf": a.c.nonce })).status).toBe(403);
    const again = await signIn(a.subject, sharedEmail, "Changed name");
    expect(again.user.id).toBe(a.user.id); expect(again.user.displayName).toBe("Changed name");
    expect((await (await request("/backend-api/auth/session", "GET", undefined, a.cookie)).json()).email).toBe(sharedEmail);
    const b = await signIn(undefined, sharedEmail);
    expect(b.user.id).not.toBe(a.user.id); // No email-based linking.
    const concurrentSubject = randomUUID();
    const [first, second] = await Promise.all([signIn(concurrentSubject), signIn(concurrentSubject)]);
    expect(first.user.id).toBe(second.user.id);
    expect(await db.auth_identity.count({ where: { providerSubject: concurrentSubject } })).toBe(1);

    const payload = Buffer.from(JSON.stringify({ userId: a.user.id, expires: Date.now() + 60000 })).toString("base64url");
    const signature = createHmac("sha256", authConfig().sessionSecret).update(payload).digest("base64url");
    expect((await request("/private", "GET", undefined, `reader_session=${payload}.${signature}`)).status).toBe(401);
    expect((await request("/private", "GET", undefined, `${a.cookie}tampered`)).status).toBe(401);
    expect((await request("/backend-api/user-preferences", "PATCH", { motivationsEnabled: true }, a.cookie, { Origin: "https://attacker.example" })).status).toBe(403);
    for (const path of ["tasks", "task-lists", "timer/active", "model-config", "user-models", "user-preferences", "reader/preferences"]) {
      expect((await request(`/backend-api/${path}`, "GET", undefined, undefined, { "x-user-id": a.user.id })).status).toBe(401);
    }

    const homes = await Promise.all([request("/backend-api/reader/home", "POST", {}, a.cookie), request("/backend-api/reader/home", "POST", {}, a.cookie)]);
    const ids = await Promise.all(homes.map(response => response.json()));
    expect(ids[0].homePageId).toBe(ids[1].homePageId);
    expect(await db.page.count({ where: { userId: a.user.id } })).toBe(1);
    expect((await request("/backend-api/reader/preferences", "PATCH", { homePageId: ids[0].homePageId }, b.cookie)).status).toBe(404);
    await db.page.update({ where: { id: ids[0].homePageId }, data: { deletedAt: new Date() } });
    expect(await (await request("/backend-api/reader/preferences", "GET", undefined, a.cookie)).json()).toEqual({ homePageId: null });
    const repaired = await (await request("/backend-api/reader/home", "POST", {}, a.cookie)).json();
    expect(repaired.homePageId).not.toBe(ids[0].homePageId);

    expect((await request("/backend-api/task-lists", "POST", { name: "Owner list", userId: b.user.id }, a.cookie)).status).toBe(200);
    const ownerList = await db.task_list.findFirstOrThrow({ where: { userId: a.user.id } });
    expect(ownerList.name).toBe("Owner list");
    expect(await db.task_list.count({ where: { userId: b.user.id } })).toBe(0);
    expect((await request("/backend-api/tasks", "POST", { title: "Wrong list", listId: ownerList.id }, b.cookie)).status).toBe(404);
    const task = await (await request("/backend-api/tasks", "POST", { title: "Owner task" }, a.cookie)).json();
    expect((await request(`/backend-api/tasks/${task.id}`, "PATCH", { title: "Stolen" }, b.cookie)).status).toBe(404);
    expect((await request(`/backend-api/tasks/${task.id}`, "GET", undefined, b.cookie)).status).toBe(404);
    expect((await request("/backend-api/tasks", "POST", { title: "Wrong parent", parentId: task.id }, b.cookie)).status).toBe(404);

    expect((await request("/backend-api/model-config", "POST", { userId: b.user.id, baseUrl: "https://example.com/v1", apiKey: "test-key" }, a.cookie)).status).toBe(201);
    expect(await db.model_config.count({ where: { userId: b.user.id } })).toBe(0);
    expect((await request(`/backend-api/model-config?userId=${a.user.id}`, "GET", undefined, b.cookie)).status).toBe(404);
    const modelId = await (await request("/backend-api/user-models", "POST", { name: "Owned model", modelId: "test", userId: b.user.id }, a.cookie)).json();
    expect((await request(`/backend-api/user-models/${modelId}`, "DELETE", undefined, b.cookie)).status).toBe(404);
    expect((await request("/backend-api/chat", "POST", { userId: a.user.id, modelId: "test", systemPrompt: "Test", userPrompt: "Test", pageId: repaired.homePageId }, b.cookie)).status).toBe(404);
    expect((await request("/backend-api/comments", "POST", { pageId: repaired.homePageId, body: "Private", selectedText: "text" }, b.cookie)).status).toBe(404);
    // Vocabulary accepts personal words only, never a page/owner supplied by a client.
    expect((await request("/backend-api/vocabulary", "POST", { pageId: repaired.homePageId, term: "Private" }, b.cookie)).status).toBe(400);
    expect(await validateUserToken(a.user.id)).toMatchObject({ id: a.user.id, displayName: "Changed name" });
    expect(await validateUserToken(a.user.email)).toBeNull();
    expect((await request("/backend-api/auth/logout", "POST", {}, a.cookie)).headers.get("set-cookie")).toContain("reader_session=;");
    const identity = await db.auth_identity.findUniqueOrThrow({ where: { userId_provider: { userId: b.user.id, provider: "GOOGLE" } } });
    await db.auth_identity.delete({ where: { id: identity.id } });
    expect((await request("/backend-api/auth/session", "GET", undefined, b.cookie)).status).toBe(401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    // Only this fixture's accounts are removed; no shared application data is reset.
    const users = await db.appuser.findMany({ where: { OR: [{ identities: { some: { providerSubject: { in: subjects } } } }, { id: { in: [...createdUserIds] } }] }, select: { id: true } });
    const userIds = users.map(user => user.id);
    await db.active_timer.deleteMany({ where: { userId: { in: userIds } } });
    await db.time_session.deleteMany({ where: { userId: { in: userIds } } });
    await db.task.deleteMany({ where: { userId: { in: userIds } } });
    await db.task_list.deleteMany({ where: { userId: { in: userIds } } });
    await db.model_config.deleteMany({ where: { userId: { in: userIds } } });
    await db.user_model.deleteMany({ where: { userId: { in: userIds } } });
    await db.user_preferences.deleteMany({ where: { userId: { in: userIds } } });
    await db.page.deleteMany({ where: { userId: { in: userIds } } });
    await db.appuser.deleteMany({ where: { id: { in: userIds } } });
    await db.auth_login_challenge.deleteMany({ where: { idHash: { in: challengeHashes } } });
    await db.$disconnect();
  }
}, 30000);
