import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { createTaskMemory, taskRow } from "./test-support/task-memory";
import { createHierarchyTask, updateHierarchyTask, updateHierarchyTasks, planTaskListRepair, taskHierarchyTransaction } from "./task-hierarchy";
import { repairTaskLists } from "./repair-task-lists";

describe("task list inheritance", () => {
  const db = createTaskMemory();
  const tx = db as unknown as Prisma.TransactionClient;
  const run = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => taskHierarchyTransaction(db as unknown as PrismaClient, action);
  const row = (id: string) => db.state.tasks.find(row => row.id === id)!;
  beforeEach(() => db.reset());
  it("inherits named lists at every depth and Inbox for Inbox trees", async () => {
    expect((await createHierarchyTask(tx, "owner", { title: "New", parentId: "grandchild", createdAt: new Date(), updatedAt: new Date() })).listId).toBe("list-a");
    await run(tx => updateHierarchyTask(tx, "owner", "root", { listId: null }));
    expect((await createHierarchyTask(tx, "owner", { title: "Inbox subtask", parentId: "child", createdAt: new Date(), updatedAt: new Date() })).listId).toBeNull();
    expect((await createHierarchyTask(tx, "owner", { title: "Top level", createdAt: new Date(), updatedAt: new Date() })).listId).toBeNull();
  });
  it("uses the root list rather than copying a previously mismatched child", async () => {
    row("child").listId = null;
    expect((await createHierarchyTask(tx, "owner", { title: "New", parentId: "child", createdAt: new Date(), updatedAt: new Date() })).listId).toBe("list-a");
  });
  it("rejects conflicting subtask lists, unknown parents and foreign/deleted lists", async () => {
    const base = { title: "New", createdAt: new Date(), updatedAt: new Date() };
    await expect(createHierarchyTask(tx, "owner", { ...base, parentId: "root", listId: "inbox" })).rejects.toThrow("Subtasks use");
    await expect(createHierarchyTask(tx, "owner", { ...base, parentId: "foreign" })).rejects.toThrow("not found");
    await expect(createHierarchyTask(tx, "owner", { ...base, listId: "list-x" })).rejects.toThrow("List not found");
    db.state.lists[1].deletedAt = new Date();
    await expect(createHierarchyTask(tx, "owner", { ...base, listId: "list-b" })).rejects.toThrow("List not found");
  });
  it("moves the whole tree without changing descendant metadata or tracked time", async () => {
    const before = { ...row("grandchild") };
    await run(tx => updateHierarchyTask(tx, "owner", "root", { listId: "list-b", priority: 1 }));
    expect([row("root").listId, row("child").listId, row("grandchild").listId]).toEqual(["list-b", "list-b", "list-b"]);
    expect(row("grandchild")).toEqual({ ...before, listId: "list-b", updatedAt: expect.any(Date) });
    expect(row("foreign").listId).toBe("list-x");
  });
  it("reparenting moves descendants; detaching retains the inherited list", async () => {
    await run(tx => updateHierarchyTask(tx, "owner", "child", { parentId: "other" }));
    expect(row("grandchild").listId).toBe("list-b");
    await run(tx => updateHierarchyTask(tx, "owner", "child", { parentId: null }));
    expect(row("child").parentId).toBeNull(); expect(row("child").listId).toBe("list-b");
  });
  it("rejects cycles, independent subtask moves, missing and foreign parents without writing", async () => {
    const original = structuredClone(db.state);
    for (const changes of [{ parentId: "grandchild" }, { parentId: "root" }, { parentId: "foreign" }, { parentId: "missing" }]) {
      await expect(run(tx => updateHierarchyTask(tx, "owner", "root", changes))).rejects.toThrow();
    }
    await expect(run(tx => updateHierarchyTask(tx, "owner", "child", { listId: "list-b" }))).rejects.toThrow("Subtasks use");
    expect(db.state).toEqual(original);
  });
  it("handles parent and child selected together in any order; metadata changes only selected tasks", async () => {
    expect(await run(tx => updateHierarchyTasks(tx, "owner", ["grandchild", "root", "root"], { listId: "list-b", priority: 1 }))).toEqual({ count: 2 });
    expect(row("child").listId).toBe("list-b"); expect(row("child").priority).toBe(2);
  });
  it("rejects mixed invalid bulk moves atomically", async () => {
    await expect(run(tx => updateHierarchyTasks(tx, "owner", ["other", "child"], { listId: "list-b" }))).rejects.toThrow("Subtasks use");
    await expect(run(tx => updateHierarchyTasks(tx, "owner", ["root", "foreign"], { listId: "list-b" }))).rejects.toThrow("not found");
    expect(row("root").listId).toBe("list-a");
  });
  it("rolls back a partial hierarchy write when a database operation fails", async () => {
    const original = structuredClone(db.state);
    const fail = vi.spyOn(db.task, "updateMany").mockRejectedValueOnce(new Error("Database failure"));
    await expect(run(tx => updateHierarchyTask(tx, "owner", "root", { listId: "list-b" }))).rejects.toThrow("Database failure");
    expect(db.state).toEqual(original); fail.mockRestore();
  });
  it("retries serialization conflicts and bounds the retry count", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "5.22" });
    const action = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValue("saved");
    expect(await run(action)).toBe("saved"); expect(action).toHaveBeenCalledTimes(2);
    await expect(run(async () => { throw conflict; })).rejects.toThrow("Please try again");
  });
});

describe("preview-only repair planner", () => {
  it("defaults to a read-only preview and applies only list/timestamp changes when explicitly requested", async () => {
    const db = createTaskMemory(); db.state.tasks[1].listId = null; db.state.tasks[1].status = "done";
    db.state.tasks[2].listId = "list-b";
    const original = structuredClone(db.state);
    const client = db as unknown as PrismaClient;
    expect((await repairTaskLists(client, "owner")).changes).toHaveLength(2);
    expect(db.state).toEqual(original);
    await repairTaskLists(client, "owner", true);
    expect(db.state.tasks[1]).toEqual({ ...original.tasks[1], listId: "list-a", updatedAt: expect.any(Date) });
    expect(db.state.tasks[2].listId).toBe("list-a");
    expect(db.state.tasks[0]).toEqual(original.tasks[0]); expect(db.state.tasks[4]).toEqual(original.tasks[4]);
    expect((await repairTaskLists(client, "owner", true)).changes).toEqual([]);
  });
  it("rolls back the entire repair on a failed write and rejects unknown accounts", async () => {
    const db = createTaskMemory(); db.state.tasks[1].listId = null; db.state.tasks[2].listId = null;
    const original = structuredClone(db.state);
    const write = db.task.update;
    const failure = vi.spyOn(db.task, "update").mockImplementationOnce(write).mockRejectedValueOnce(new Error("Failed write"));
    await expect(repairTaskLists(db as unknown as PrismaClient, "owner", true)).rejects.toThrow("Failed write");
    expect(db.state).toEqual(original); failure.mockRestore();
    await expect(repairTaskLists(db as unknown as PrismaClient, "missing", true)).rejects.toThrow("Account not found");
  });
  it("repairs nested named/Inbox mismatches without changing roots, metadata or other accounts", () => {
    const db = createTaskMemory(); db.state.tasks[1].listId = null; db.state.tasks[2].listId = "list-b";
    const original = structuredClone(db.state);
    expect(planTaskListRepair("owner", db.state.tasks, db.state.lists)).toEqual({ changes: [
      { id: "child", fromListId: null, toListId: "list-a" }, { id: "grandchild", fromListId: "list-b", toListId: "list-a" },
    ], issues: [] });
    expect(db.state).toEqual(original);
    db.state.tasks[0].listId = null;
    expect(planTaskListRepair("owner", db.state.tasks, db.state.lists).changes).toEqual([{ id: "grandchild", fromListId: "list-b", toListId: null }]);
  });
  it("reports corrupt trees and skips them instead of inventing parent/list data", () => {
    const db = createTaskMemory();
    db.state.tasks.push(taskRow("orphan", "missing"), taskRow("cross-owner", "foreign"), taskRow("cycle-a", "cycle-b"), taskRow("cycle-b", "cycle-a"));
    db.state.lists[0].deletedAt = new Date();
    const plan = planTaskListRepair("owner", db.state.tasks, db.state.lists);
    expect(plan.changes).toEqual([]);
    expect(plan.issues.map(issue => issue.id).sort()).toEqual(["child", "grandchild", "orphan", "cross-owner", "cycle-a", "cycle-b"].sort());
  });
});
