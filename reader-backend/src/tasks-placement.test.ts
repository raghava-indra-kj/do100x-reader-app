import { z } from 'zod';
import { readJson } from './test-support/read-json';
const taskListSchema = z.object({ tasks: z.array(z.object({ id: z.string(), parentTitle: z.string().nullable().optional() })) });
import express from "express";
import type { Server } from "node:http";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createTaskMemory } from "./test-support/task-memory";

vi.mock("./prisma", async () => {
  const { createTaskMemory } = await import("./test-support/task-memory");
  return { prisma: createTaskMemory() };
});
import { prisma } from "./prisma";
import { issueSession, attachSession } from "./session";
import tasksRouter from "./tasks";
import listsRouter from "./task-lists";
import { registerTaskTools } from "./mcp/tools/tasks";

const db = prisma as unknown as ReturnType<typeof createTaskMemory>;

describe("HTTP and MCP share the task placement contract", () => {
  let http: Server, base: string, cookie: string, mcp: McpServer, client: Client;
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use(attachSession());
    app.post("/fixture-session", (_req, res) => { issueSession(res, "owner"); res.sendStatus(204); });
    app.use("/tasks", tasksRouter); app.use("/lists", listsRouter);
    http = await new Promise<Server>(resolve => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); });
    const address = http.address(); base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    cookie = (await fetch(`${base}/fixture-session`, { method: "POST" })).headers.get("set-cookie")!.split(";")[0];
    mcp = new McpServer({ name: "tasks-test", version: "1" }); registerTaskTools(mcp, "owner");
    client = new Client({ name: "test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair(); await mcp.connect(a); await client.connect(b);
  });
  afterAll(async () => { await client.close(); await mcp.close(); await new Promise<void>(resolve => http.close(() => resolve())); });
  beforeEach(() => db.reset());
  afterEach(() => vi.useRealTimers());
  const request = (url: string, body: any, method = "POST") => fetch(`${base}${url}`, {
    method, headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });
  const row = (id: string) => db.state.tasks.find(row => row.id === id)!;

  it('returns task versions and prevents stale HTTP and MCP updates', async () => {
    const first = await request('/tasks/root', { title: 'Latest', expectedVersion: 1 }, 'PATCH');
    expect(first.status).toBe(200); expect((await readJson(first, z.object({ version: z.number() }))).version).toBe(2);
    expect((await request('/tasks/root', { title: 'Stale', expectedVersion: 1 }, 'PATCH')).status).toBe(409);
    expect((await call('reader_update_task', { taskId: 'root', title: 'Stale agent', expectedVersion: 1 })).isError).toBe(true);
    expect(row('root').title).toBe('Latest');
  });
  it('preserves logs and rejects mixed-owner deletes through MCP atomically', async () => {
    db.state.sessions.push({ id: 'history', taskId: 'child', userId: 'owner', durationSeconds: 91 });
    expect((await call('reader_batch_delete_tasks', { taskIds: ['root', 'foreign'] })).isError).toBe(true);
    expect(row('root').deletedAt).toBeNull();
    expect((await call('reader_delete_task', { taskId: 'root' })).isError).not.toBe(true);
    expect(row('grandchild').deletedAt).toBeInstanceOf(Date);
    expect(db.state.sessions).toHaveLength(1);
    expect(row('foreign').deletedAt).toBeNull();
  });
  it('rejects invalid MCP dates and resolves bulk smart dates in the caller timezone', async () => {
    expect((await call('reader_create_task', { title: 'Invalid', dueDate: '2026-02-30' })).isError).toBe(true);
    expect((await call('reader_update_task', { taskId: 'root', dueDate: 'not-a-date' })).isError).toBe(true);
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T20:00:00Z'));
    expect((await call('reader_batch_update_tasks', { taskIds: ['root'], dueDate: 'today', timeZone: 'Asia/Kolkata' })).isError).not.toBe(true);
    expect(row('root').dueDate.toISOString()).toBe('2026-10-06T00:00:00.000Z');
  });

  it('rejects invalid task/list input instead of silently corrupting dates or metadata', async () => {
    for (const body of [{ title: ' ' }, { title: 5 }, { title: 'x', priority: 1.5 }, { title: 'x', dueDate: '2026-02-30' }, { title: 'x', dueTime: '25:30' }, { title: 'x', dueTime: '12:30' }, { title: 'x', status: 'unknown' }]) expect((await request('/tasks', body)).status).toBe(400);
    for (const body of [{ title: '' }, { description: {} }, { priority: '2' }, { dueDate: 'bad' }, { sortOrder: -1 }]) expect((await request('/tasks/child', body, 'PATCH')).status).toBe(400);
    expect((await request('/lists', { name: '   ' })).status).toBe(400);
    expect((await request('/lists/list-a', { name: 42 }, 'PATCH')).status).toBe(400);
    expect(row('child').title).toBe('child');
  });
  it('uses the caller calendar date for Today and exactly seven days for Next 7', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T20:00:00Z'));
    row('child').dueDate = new Date('2026-10-06'); row('grandchild').dueDate = new Date('2026-10-12'); row('root').dueDate = new Date('2026-10-13'); row('other').dueDate = null;
    for (const due of ['today', 'next7']) {
      const args = { due, timeZone: 'Asia/Kolkata', includeSubtasks: true };
      const rows = (await readJson(fetch(`${base}/tasks?${new URLSearchParams(Object.entries(args).map(([k, v]) => [k, String(v)] as [string, string]))}`, { headers: { cookie } }), taskListSchema)).tasks;
      expect(rows.map((task: any) => task.id)).toEqual(due === 'today' ? ['child'] : ['child', 'grandchild']);
      const result = await call('reader_list_tasks', args);
      expect(JSON.parse((result.content as any[])[0].text).tasks.map((task: any) => task.id)).toEqual(rows.map((task: any) => task.id));
    }
  });
  it('clearing a due date clears its time and Completed includes nested tasks', async () => {
    expect((await request('/tasks/child', { dueDate: null }, 'PATCH')).status).toBe(200);
    expect(row('child').dueTime).toBeNull();
    expect((await request('/tasks/grandchild', { status: 'done' }, 'PATCH')).status).toBe(200);
    expect((await readJson(fetch(`${base}/tasks?status=done`, { headers: { cookie } }), taskListSchema)).tasks.map((task: any) => task.id)).toEqual(['grandchild']);
  });
  it('soft deletion retains historical time and stops only this owner’s subtree timer', async () => {
    db.state.sessions = [{ id: 'history', userId: 'owner', taskId: 'child', durationSeconds: 91 }];
    db.state.timers = [{ id: 'active', userId: 'owner', taskId: 'grandchild', isPaused: true, accumulatedSeconds: 0, startTime: new Date(), createdAt: new Date() }, { id: 'foreign-timer', userId: 'visitor', taskId: 'foreign' }];
    const response = await request('/tasks/root', undefined, 'DELETE');
    expect(response.status).toBe(200);
    expect(db.state.tasks.filter(task => task.deletedAt).map(task => task.id)).toEqual(['root', 'child', 'grandchild']);
    expect(db.state.sessions).toHaveLength(1);
    expect(db.state.timers.map(timer => timer.id)).toEqual(['foreign-timer']);
  });
  it('validates all reorder members before making any change', async () => {
    expect((await request('/tasks/reorder', { orderedIds: ['root', 'foreign'] })).status).toBe(409);
    expect((await request('/tasks/reorder', { orderedIds: ['root', 'root'] })).status).toBe(400);
    expect(row('root').sortOrder).toBe(1);
    expect((await request('/tasks/reorder', { orderedIds: ['other', 'root'] })).status).toBe(200);
    expect(row('other').sortOrder).toBe(0); expect(row('root').sortOrder).toBe(1);
  });
  it('rejects a stale reorder atomically after another tab changes any member', async () => {
    const orderedIds = ['other', 'root'], expectedVersions = { other: 1, root: 1 };
    expect((await request('/tasks/reorder', { orderedIds, expectedVersions })).status).toBe(200);
    expect(row('other').version).toBe(2);
    expect((await request('/tasks/reorder', { orderedIds: ['root', 'other'], expectedVersions })).status).toBe(409);
    expect(row('other').sortOrder).toBe(0); expect(row('root').sortOrder).toBe(1);
  });

  it("HTTP and MCP matrix filters include nested tasks with private, scoped parent context", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T02:00:00Z"));
    Object.assign(row("child"), { dueDate: new Date("2026-10-06"), priority: 1 });
    Object.assign(row("grandchild"), { dueDate: null, status: "done", completedAt: new Date("2026-10-05T20:00:00Z") });
    Object.assign(row("foreign"), { dueDate: new Date("2026-10-06") });
    for (const status of ["active", "done", "all"]) {
      const args = { matrixDate: "today", status, timeZone: "Asia/Kolkata", includeSubtasks: true };
      const query = new URLSearchParams(Object.entries(args).map(([key, value]) => [key, String(value)] as [string, string]));
      const httpRows = (await readJson(fetch(`${base}/tasks?${query}`, { headers: { cookie } }), taskListSchema)).tasks;
      const result = await call("reader_list_tasks", args);
      expect(result.isError).not.toBe(true);
      const mcpRows = JSON.parse((result.content as any[])[0].text).tasks;
      expect(httpRows.map((task: any) => task.id)).toEqual(mcpRows.map((task: any) => task.id));
      expect(httpRows.map((task: any) => task.id)).toEqual(status === "active" ? ["child"] : status === "done" ? ["grandchild"] : ["child", "grandchild"]);
      expect(httpRows[0].parentTitle).toBe(status === "done" ? "child" : "root");
      expect(mcpRows[0].parentTitle).toBe(httpRows[0].parentTitle);
    }
    row("root").userId = "visitor";
    const rows = (await readJson(fetch(`${base}/tasks?matrixDate=today&includeSubtasks=true&timeZone=Asia%2FKolkata`, { headers: { cookie } }), taskListSchema)).tasks;
    expect(rows[0].parentTitle).toBeNull();
  });
  it("completion and reopening change matrix membership using server timestamps", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T02:00:00Z"));
    const url = `${base}/tasks?matrixDate=today&status=done&includeSubtasks=true&timeZone=Asia%2FKolkata`;
    expect((await request("/tasks/child", { status: "done" }, "PATCH")).status).toBe(200);
    expect(row("child").completedAt).toEqual(new Date());
    expect((await readJson(fetch(url, { headers: { cookie } }), taskListSchema)).tasks.map((task: any) => task.id)).toEqual(["child"]);
    expect((await request("/tasks/child", { status: "todo" }, "PATCH")).status).toBe(200);
    expect(row("child").completedAt).toBeNull();
    expect((await readJson(fetch(url, { headers: { cookie } }), taskListSchema)).tasks).toEqual([]);
  });
  it("invalid matrix options return controlled HTTP and MCP errors", async () => {
    expect((await fetch(`${base}/tasks?matrixDate=invalid`, { headers: { cookie } })).status).toBe(400);
    expect((await fetch(`${base}/tasks?matrixDate=today&timeZone=bad-zone`, { headers: { cookie } })).status).toBe(400);
    expect((await call("reader_list_tasks", { matrixDate: "today", timeZone: "bad-zone" })).isError).toBe(true);
  });

  it("HTTP-created subtasks inherit the named list and detail returns its correct name", async () => {
    const response = await request("/tasks", { title: "Initializing the Project", parentId: "root" });
    expect(response.status).toBe(200); const created = await readJson(response, z.object({ id: z.string(), listId: z.string().nullable() })); expect(created.listId).toBe("list-a");
    const detail = await readJson(fetch(`${base}/tasks/${created.id}`, { headers: { cookie } }), z.object({ list: z.object({ name: z.string() }) }));
    expect(detail.list.name).toBe("Data Agent");
  });
  it("HTTP reparenting and parent list changes propagate to nested children", async () => {
    expect((await request("/tasks/root", { listId: "list-b" }, "PATCH")).status).toBe(200);
    expect(row("grandchild").listId).toBe("list-b");
    expect((await request("/tasks/child", { parentId: "other" }, "PATCH")).status).toBe(200);
    expect(row("child").parentId).toBe("other");
    expect((await request("/tasks/child", { listId: "list-a" }, "PATCH")).status).toBe(400);
    expect((await request("/tasks/root", { parentId: "foreign" }, "PATCH")).status).toBe(404);
  });
  it("requires the current signed session for HTTP writes", async () => {
    expect((await fetch(`${base}/tasks`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-user-id": "owner" }, body: JSON.stringify({ title: "No session" }) })).status).toBe(401);
  });
  it("MCP creation inherits lists and returns clear errors for conflicting/foreign placement", async () => {
    const result = await call("reader_create_task", { title: "New", parentTaskId: "child" });
    expect(result.isError).not.toBe(true);
    expect(JSON.parse((result.content as any[])[0].text).listId).toBe("list-a");
    expect((await call("reader_create_task", { title: "Wrong", parentTaskId: "child", listId: "inbox" })).isError).toBe(true);
    expect((await call("reader_update_task", { taskId: "root", listId: "list-x" })).isError).toBe(true);
    expect((await call("reader_update_task", { taskId: "root", parentTaskId: "grandchild" })).isError).toBe(true);
  });
  it("MCP bulk creation inherits through arbitrary nesting and reports actual list names", async () => {
    const result = await call("reader_create_tasks_bulk", { tasks: [{ title: "Project", listId: "list-a", subtasks: [{ title: "Child", subtasks: [{ title: "Grandchild", subtasks: [{ title: "Deep" }] }] }] }] });
    expect(result.isError).not.toBe(true);
    const summary = JSON.parse((result.content as any[])[0].text);
    expect(summary.tasks[0].listName).toBe("Data Agent"); expect(summary.tasks[0].subtasksCount).toBe(3);
    expect(db.state.tasks.slice(5).every(task => task.listId === "list-a")).toBe(true);
  });
  it("MCP bulk creation is all-or-nothing, including auto-created lists", async () => {
    const result = await call("reader_create_tasks_bulk", { tasks: [{ title: "Valid", listName: "New list" }, { title: "Foreign", listId: "list-x" }] });
    expect(result.isError).toBe(true); expect(db.state.tasks).toHaveLength(5); expect(db.state.lists).toHaveLength(3);
  });
  it("MCP batch moves roots and children together, but rejects independent child moves", async () => {
    expect((await call("reader_batch_update_tasks", { taskIds: ["grandchild", "root"], listId: "list-b", priority: 1 })).isError).not.toBe(true);
    expect(row("child").listId).toBe("list-b"); expect(row("child").priority).toBe(2);
    expect((await call("reader_batch_update_tasks", { taskIds: ["child"], listId: "list-a" })).isError).toBe(true);
  });
  it("list deletion moves the entire tree to Inbox atomically", async () => {
    expect((await request("/lists/list-a", undefined, "DELETE")).status).toBe(200);
    expect([row("root").listId, row("child").listId, row("grandchild").listId]).toEqual([null, null, null]);
    expect((await request("/tasks", { title: "Deleted list", listId: "list-a" })).status).toBe(404);
  });
});
