import { Prisma, PrismaClient, task } from "@prisma/client";
import type { ErrorRequestHandler } from "express";

export class TaskHierarchyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const taskHierarchyErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof TaskHierarchyError) res.status(error.status).json({ error: error.message });
  else next(error);
};

// Placement reads and writes must share a transaction, including ancestor/list
// validation. Serializable isolation prevents simultaneous moves from diverging.
export async function taskHierarchyTransaction<T>(db: PrismaClient, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error;
      if (attempt >= 2) throw new TaskHierarchyError(409, "Tasks changed while saving. Please try again.");
    }
  }
}

const normalizeList = (id: string | null | undefined) => !id || id === "inbox" || id === "null" ? null : id;
const normalizeParent = (id: string | null | undefined) => !id || id === "null" ? null : id;

async function ownTask(tx: Prisma.TransactionClient, userId: string, id: string): Promise<task> {
  const row = await tx.task.findFirst({ where: { id, userId, deletedAt: null } });
  if (!row) throw new TaskHierarchyError(404, "Task or parent task not found.");
  return row;
}

async function validateList(tx: Prisma.TransactionClient, userId: string, id: string | null) {
  if (id && !await tx.task_list.findFirst({ where: { id, userId, deletedAt: null } })) {
    throw new TaskHierarchyError(404, "List not found.");
  }
}

async function rootTask(tx: Prisma.TransactionClient, userId: string, id: string, forbiddenId?: string): Promise<task> {
  const seen = new Set<string>();
  let current = await ownTask(tx, userId, id);
  while (true) {
    if (current.id === forbiddenId || seen.has(current.id)) {
      throw new TaskHierarchyError(400, "A task can’t move inside itself or one of its subtasks.");
    }
    seen.add(current.id);
    if (!current.parentId) return current;
    current = await ownTask(tx, userId, current.parentId);
  }
}

export async function taskSubtreeIds(tx: Prisma.TransactionClient, userId: string, ids: string[]): Promise<string[]> {
  const found = new Set(ids);
  let frontier = [...found];
  while (frontier.length) {
    const children = await tx.task.findMany({ where: { userId, deletedAt: null, parentId: { in: frontier } }, select: { id: true } });
    frontier = children.map(row => row.id).filter(id => !found.has(id));
    frontier.forEach(id => found.add(id));
  }
  return [...found];
}

function assertInheritedList(requested: string | null | undefined, inherited: string | null) {
  if (requested !== undefined && normalizeList(requested) !== inherited) {
    throw new TaskHierarchyError(400, "Subtasks use their parent’s list. Move the parent task or detach the subtask first.");
  }
}

type NewTask = Omit<Prisma.taskUncheckedCreateInput, "userId" | "listId" | "parentId"> & { listId?: string | null; parentId?: string | null };

export async function createHierarchyTask(tx: Prisma.TransactionClient, userId: string, input: NewTask) {
  if (typeof input.title !== "string" || !input.title.trim()) throw new TaskHierarchyError(400, "Enter a task title.");
  const parentId = normalizeParent(input.parentId);
  let listId = normalizeList(input.listId);
  if (parentId) {
    listId = (await rootTask(tx, userId, parentId)).listId;
    assertInheritedList(input.listId, listId);
  }
  await validateList(tx, userId, listId);
  const sortOrder = input.sortOrder ?? ((await tx.task.aggregate({ where: { userId, parentId, deletedAt: null }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
  return tx.task.create({ data: { ...input, title: input.title.trim(), userId, parentId, listId, sortOrder } });
}

// Callers filter editable metadata. Placement fields stay simple scalars here.
type TaskChanges = Record<string, unknown> & { listId?: string | null; parentId?: string | null };

export async function updateHierarchyTask(tx: Prisma.TransactionClient, userId: string, id: string, changes: TaskChanges) {
  const existing = await ownTask(tx, userId, id);
  const parentId = changes.parentId === undefined ? existing.parentId : normalizeParent(changes.parentId);
  let listId = changes.listId === undefined ? existing.listId : normalizeList(changes.listId);
  if (parentId) {
    listId = (await rootTask(tx, userId, parentId, id)).listId;
    assertInheritedList(changes.listId, listId);
  } else if (changes.parentId !== undefined && existing.parentId && changes.listId === undefined) {
    // Detaching preserves the effective inherited list, even before an old
    // mismatched subtree has been repaired.
    listId = (await rootTask(tx, userId, existing.parentId, id)).listId;
  }
  await validateList(tx, userId, listId);
  const data = { ...changes, parentId, listId, updatedAt: changes.updatedAt ?? new Date() } as Prisma.taskUncheckedUpdateInput;
  if (changes.status === "done" && existing.status !== "done") data.completedAt = new Date();
  else if (changes.status !== undefined && changes.status !== "done") data.completedAt = null;
  const updated = await tx.task.update({ where: { id, userId, deletedAt: null }, data });
  if (changes.listId !== undefined || changes.parentId !== undefined || existing.listId !== listId) {
    const ids = await taskSubtreeIds(tx, userId, [id]);
    await tx.task.updateMany({ where: { id: { in: ids }, userId, deletedAt: null }, data: { listId, updatedAt: data.updatedAt } });
  }
  return updated;
}

export async function updateHierarchyTasks(tx: Prisma.TransactionClient, userId: string, taskIds: string[], changes: TaskChanges) {
  const ids = [...new Set(taskIds)];
  const rows = await Promise.all(ids.map(id => ownTask(tx, userId, id)));
  if (changes.listId !== undefined) {
    const listId = normalizeList(changes.listId);
    await validateList(tx, userId, listId);
    for (const row of rows) {
      if (!row.parentId) continue;
      const root = await rootTask(tx, userId, row.id);
      if (!ids.includes(root.id)) assertInheritedList(listId, root.listId);
    }
    // Move roots first, so selected descendants observe the new inherited list.
    rows.sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId));
  }
  for (const row of rows) await updateHierarchyTask(tx, userId, row.id, changes);
  return { count: ids.length };
}

type RepairTask = Pick<task, "id" | "userId" | "listId" | "parentId" | "deletedAt">;
type RepairList = { id: string; userId: string; deletedAt: Date | null };

export function planTaskListRepair(userId: string, tasks: RepairTask[], lists: RepairList[]) {
  const taskMap = new Map(tasks.filter(row => row.userId === userId && !row.deletedAt).map(row => [row.id, row]));
  const listIds = new Set(lists.filter(row => row.userId === userId && !row.deletedAt).map(row => row.id));
  const changes: Array<{ id: string; fromListId: string | null; toListId: string | null }> = [];
  const issues: Array<{ id: string; reason: string }> = [];
  for (const row of taskMap.values()) {
    if (!row.parentId) continue;
    let current = row;
    const seen = new Set<string>();
    let reason = "";
    while (current.parentId) {
      if (seen.has(current.id)) { reason = "Cyclic task hierarchy"; break; }
      seen.add(current.id);
      const parent = taskMap.get(current.parentId);
      if (!parent) { reason = "Parent is missing, deleted or owned by another user"; break; }
      current = parent;
    }
    if (!reason && current.listId && !listIds.has(current.listId)) reason = "Root list is missing, deleted or owned by another user";
    if (reason) issues.push({ id: row.id, reason });
    else if (row.listId !== current.listId) changes.push({ id: row.id, fromListId: row.listId, toListId: current.listId });
  }
  return { changes, issues };
}
