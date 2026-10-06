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

  it("HTTP and MCP matrix filters include nested tasks with private, scoped parent context", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T02:00:00Z"));
    Object.assign(row("child"), { dueDate: new Date("2026-10-06"), priority: 1 });
    Object.assign(row("grandchild"), { dueDate: null, status: "done", completedAt: new Date("2026-10-05T20:00:00Z") });
    Object.assign(row("foreign"), { dueDate: new Date("2026-10-06") });
    for (const status of ["active", "done", "all"]) {
      const args = { matrixDate: "today", status, timeZone: "Asia/Kolkata", includeSubtasks: true };
      const query = new URLSearchParams(Object.entries(args).map(([key, value]) => [key, String(value)]));
      const httpRows = (await (await fetch(`${base}/tasks?${query}`, { headers: { cookie } })).json()).tasks;
      const result = await call("reader_list_tasks", args);
      expect(result.isError).not.toBe(true);
      const mcpRows = JSON.parse((result.content as any[])[0].text).tasks;
      expect(httpRows.map((task: any) => task.id)).toEqual(mcpRows.map((task: any) => task.id));
      expect(httpRows.map((task: any) => task.id)).toEqual(status === "active" ? ["child"] : status === "done" ? ["grandchild"] : ["child", "grandchild"]);
      expect(httpRows[0].parentTitle).toBe(status === "done" ? "child" : "root");
      expect(mcpRows[0].parentTitle).toBe(httpRows[0].parentTitle);
    }
    row("root").userId = "visitor";
    const rows = (await (await fetch(`${base}/tasks?matrixDate=today&includeSubtasks=true&timeZone=Asia%2FKolkata`, { headers: { cookie } })).json()).tasks;
    expect(rows[0].parentTitle).toBeNull();
  });
  it("completion and reopening change matrix membership using server timestamps", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T02:00:00Z"));
    const url = `${base}/tasks?matrixDate=today&status=done&includeSubtasks=true&timeZone=Asia%2FKolkata`;
    expect((await request("/tasks/child", { status: "done" }, "PATCH")).status).toBe(200);
    expect(row("child").completedAt).toEqual(new Date());
    expect((await (await fetch(url, { headers: { cookie } })).json()).tasks.map((task: any) => task.id)).toEqual(["child"]);
    expect((await request("/tasks/child", { status: "todo" }, "PATCH")).status).toBe(200);
    expect(row("child").completedAt).toBeNull();
    expect((await (await fetch(url, { headers: { cookie } })).json()).tasks).toEqual([]);
  });
  it("invalid matrix options return controlled HTTP and MCP errors", async () => {
    expect((await fetch(`${base}/tasks?matrixDate=invalid`, { headers: { cookie } })).status).toBe(400);
    expect((await fetch(`${base}/tasks?matrixDate=today&timeZone=bad-zone`, { headers: { cookie } })).status).toBe(400);
    expect((await call("reader_list_tasks", { matrixDate: "today", timeZone: "bad-zone" })).isError).toBe(true);
  });

  it("HTTP-created subtasks inherit the named list and detail returns its correct name", async () => {
    const response = await request("/tasks", { title: "Initializing the Project", parentId: "root" });
    expect(response.status).toBe(200); const created = await response.json(); expect(created.listId).toBe("list-a");
    const detail = await (await fetch(`${base}/tasks/${created.id}`, { headers: { cookie } })).json();
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
