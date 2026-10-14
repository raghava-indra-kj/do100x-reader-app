import { Router, Request, Response } from "express";
import { prisma } from "./prisma";
import { requireSession } from "./session";
import { createHierarchyTask, updateHierarchyTask, taskHierarchyTransaction, taskHierarchyErrorHandler, softDeleteHierarchyTasks, TaskHierarchyError } from "./task-hierarchy";
import { filterMatrixTasks, matrixOptions } from "./task-matrix";
import { createTaskInput, updateTaskInput, parseTaskInput, taskDueFilter } from './task-contract';
import { z } from 'zod';
import { lockAccount } from './account-transaction';

const router = Router();
router.use(requireSession);


// GET /backend-api/tasks - List tasks with smart filters
router.get("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { listId, status, priority, due, search, parentId, includeSubtasks, matrixDate, timeZone, includeOverdue } = req.query;
  const matrix = matrixOptions(matrixDate, status, timeZone, includeOverdue);
  if (status !== undefined && !['all', 'active', 'uncompleted', 'todo', 'in_progress', 'done', 'cancelled'].includes(status as string)) throw new TaskHierarchyError(400, 'Choose a valid task status.');
  if (priority !== undefined && priority !== 'all' && !/^[1-4]$/.test(String(priority))) throw new TaskHierarchyError(400, 'Choose a priority from 1 to 4.');
  for (const value of [listId, parentId, search]) if (value !== undefined && (typeof value !== 'string' || value.length > 1000)) throw new TaskHierarchyError(400, 'Choose valid task filters.');
  if (includeSubtasks !== undefined && !['true', 'false'].includes(String(includeSubtasks))) throw new TaskHierarchyError(400, 'Choose a valid subtask filter.');

  const where: Record<string, unknown> = {
    userId,
    deletedAt: null,
  };

  // List filter
  if (listId !== undefined && listId !== "all") {
    where.listId = listId === "null" || listId === "inbox" ? null : (listId as string);
  }

  // Parent filter (default to top-level tasks if parentId not specified, unless includeSubtasks is true or smart view)
  if (parentId !== undefined) {
    where.parentId = parentId === "null" ? null : (parentId as string);
  } else if (includeSubtasks !== "true" && !due && !priority && !search && status !== 'done' && status !== 'cancelled') {
    where.parentId = null; // Top-level tasks only
  }

  // Status filter
  if (status && status !== "all") {
    if (status === "active" || status === "uncompleted") {
      where.status = { notIn: ["done", "cancelled"] };
    } else {
      where.status = status as string;
    }
  }

  // Priority filter (1-4)
  if (priority && priority !== "all") {
    where.priority = parseInt(priority as string, 10);
  }

  // Due Date Smart Filter
  if (due) {
    const filter = taskDueFilter(due, timeZone);
    if (filter) where.dueDate = filter;
    if (due === 'overdue') where.status = { notIn: ['done', 'cancelled'] };
  }

  // Search filter
  if (search && typeof search === "string" && search.trim()) {
    where.OR = [
      { title: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ];
  }

  const loadedTasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
  const tasks = matrix ? filterMatrixTasks(loadedTasks, matrix) : loadedTasks;
  const parentIds = [...new Set(tasks.map(task => task.parentId).filter((id): id is string => !!id))];
  const parents = parentIds.length ? await prisma.task.findMany({ where: { id: { in: parentIds }, userId, deletedAt: null }, select: { id: true, title: true } }) : [];
  const parentTitles = new Map(parents.map(parent => [parent.id, parent.title]));

  // Also fetch subtask counts and list info
  const taskIds = tasks.map((t) => t.id);
  const subtaskCounts = await prisma.task.groupBy({
    by: ["parentId"],
    where: { parentId: { in: taskIds }, userId, deletedAt: null },
    _count: { id: true },
  });
  const subtaskCountMap = new Map(subtaskCounts.map((s) => [s.parentId, s._count.id]));

  // Check which tasks currently have subtasks completed
  const completedSubtasks = await prisma.task.groupBy({
    by: ["parentId"],
    where: { parentId: { in: taskIds }, status: "done", userId, deletedAt: null },
    _count: { id: true },
  });
  const completedSubtaskCountMap = new Map(completedSubtasks.map((s) => [s.parentId, s._count.id]));

  // Fetch list info
  const lists = await prisma.task_list.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, name: true, color: true, icon: true },
  });
  const listMap = new Map(lists.map((l) => [l.id, l]));

  const result = tasks.map((t) => ({
    id: t.id,
    version: t.version,
    listId: t.listId,
    list: t.listId ? listMap.get(t.listId) ?? null : null,
    parentId: t.parentId,
    parentTitle: t.parentId ? parentTitles.get(t.parentId) ?? null : null,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    dueTime: t.dueTime,
    sortOrder: t.sortOrder,
    totalTimeSeconds: t.totalTimeSeconds,
    subtaskCount: subtaskCountMap.get(t.id) || 0,
    completedSubtaskCount: completedSubtaskCountMap.get(t.id) || 0,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  res.json({ tasks: result });
});

// GET /backend-api/tasks/:id - Get task detail with full subtasks tree & time sessions
router.get("/:id", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const id = parseTaskInput(z.string().min(1).max(36), req.params.id);

  const task = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Guard old malformed trees as well as newly validated hierarchy writes.
  const visited = new Set([task.id]);
  async function fetchSubtasksRecursive(parentId: string): Promise<any[]> {
    const children = await prisma.task.findMany({
      where: { parentId, userId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const enriched = [];
    for (const child of children) {
      if (visited.has(child.id)) throw new TaskHierarchyError(409, 'This task hierarchy contains a cycle and needs repair.');
      visited.add(child.id);
      const nested = await fetchSubtasksRecursive(child.id);
      enriched.push({
        id: child.id,
        version: child.version,
        parentId: child.parentId,
        listId: child.listId,
        title: child.title,
        description: child.description,
        status: child.status,
        priority: child.priority,
        dueDate: child.dueDate ? child.dueDate.toISOString() : null,
        dueTime: child.dueTime,
        sortOrder: child.sortOrder,
        totalTimeSeconds: child.totalTimeSeconds,
        completedAt: child.completedAt ? child.completedAt.toISOString() : null,
        subtasks: nested,
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      });
    }
    return enriched;
  }

  const subtasks = await fetchSubtasksRecursive(task.id);

  // Fetch logged time sessions
  const sessions = await prisma.time_session.findMany({
    where: { taskId: id, userId },
    orderBy: { startTime: "desc" },
  });

  // Check if active timer is running for this task
  const activeTimer = await prisma.active_timer.findUnique({
    where: { userId },
  });

  const list = task.listId
    ? await prisma.task_list.findFirst({ where: { id: task.listId, userId, deletedAt: null } })
    : null;

  res.json({
    id: task.id,
    version: task.version,
    listId: task.listId,
    list: list ? { id: list.id, name: list.name, color: list.color, icon: list.icon } : null,
    parentId: task.parentId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    dueTime: task.dueTime,
    sortOrder: task.sortOrder,
    totalTimeSeconds: task.totalTimeSeconds,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    subtasks,
    timeSessions: sessions.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime ? s.endTime.toISOString() : null,
      durationSeconds: s.durationSeconds,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    isActiveTimerRunning: activeTimer?.taskId === task.id,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

// POST /backend-api/tasks - Create task or subtask
router.post("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { title, description, listId, parentId, priority, dueDate, dueTime, status } = parseTaskInput(createTaskInput, req.body);
  if (dueTime && !dueDate) throw new TaskHierarchyError(400, 'Choose a date before setting a time.');

  const now = new Date();

  const newTask = await taskHierarchyTransaction(prisma, tx => createHierarchyTask(tx, userId, {
    listId,
    parentId,
    title: title.trim(),
    description: description ?? null,
    status: status || "todo",
    priority: priority ?? 4,
    dueDate: dueDate ?? null,
    dueTime: dueTime || null,
    totalTimeSeconds: 0,
    completedAt: status === 'done' ? now : null,
    createdAt: now,
    updatedAt: now,
  }));

  res.json({
    id: newTask.id,
    version: newTask.version,
    listId: newTask.listId,
    parentId: newTask.parentId,
    title: newTask.title,
    description: newTask.description,
    status: newTask.status,
    priority: newTask.priority,
    dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : null,
    dueTime: newTask.dueTime,
    sortOrder: newTask.sortOrder,
    totalTimeSeconds: newTask.totalTimeSeconds,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    completedAt: newTask.completedAt?.toISOString() ?? null,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  });
});

// PATCH /backend-api/tasks/:id - Update task properties
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const id = parseTaskInput(z.string().min(1).max(36), req.params.id);
  const existing = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    dueTime,
    listId,
    parentId,
    sortOrder,
    expectedVersion,
  } = parseTaskInput(updateTaskInput, req.body);

  const now = new Date();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
    expectedVersion,
  };

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;

  if (status !== undefined) {
    updateData.status = status;
    if (status === "done" && existing.status !== "done") {
      updateData.completedAt = now;
    } else if (status !== "done") {
      updateData.completedAt = null;
    }
  }

  if (priority !== undefined) {
    updateData.priority = priority;
  }

  if (dueDate !== undefined) {
    updateData.dueDate = dueDate;
    if (dueDate === null) updateData.dueTime = null;
  }

  if (dueTime !== undefined) {
    if (dueTime && !(dueDate === undefined ? existing.dueDate : dueDate)) throw new TaskHierarchyError(400, 'Choose a date before setting a time.');
    updateData.dueTime = dueTime || null;
  }

  if (listId !== undefined) updateData.listId = listId;
  if (parentId !== undefined) updateData.parentId = parentId;

  if (sortOrder !== undefined) {
    updateData.sortOrder = sortOrder;
  }

  const updated = await taskHierarchyTransaction(prisma, tx => updateHierarchyTask(tx, userId, id, updateData));

  res.json({
    id: updated.id,
    version: updated.version,
    listId: updated.listId,
    parentId: updated.parentId,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    priority: updated.priority,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    dueTime: updated.dueTime,
    sortOrder: updated.sortOrder,
    totalTimeSeconds: updated.totalTimeSeconds,
    completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /backend-api/tasks/:id - Soft delete a subtree while retaining its logged history.
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const id = parseTaskInput(z.string().min(1).max(36), req.params.id);
  const allTargetIds = await taskHierarchyTransaction(prisma, tx => softDeleteHierarchyTasks(tx, userId, [id]));

  res.json({ success: true, deletedTaskId: id, affectedTaskIds: allTargetIds });
});

// POST /backend-api/tasks/reorder - Reorder task sortOrders
router.post("/reorder", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { orderedIds, expectedVersions } = parseTaskInput(z.object({ orderedIds: z.array(z.string().min(1).max(36)).min(1).max(5000), expectedVersions: z.record(z.string().min(1).max(36), z.number().int().positive()).optional() }).strict(), req.body);
  if (new Set(orderedIds).size !== orderedIds.length) throw new TaskHierarchyError(400, 'Choose each task only once.');
  await taskHierarchyTransaction(prisma, async tx => {
    await lockAccount(tx, userId);
    const rows = await tx.task.findMany({ where: { id: { in: orderedIds }, userId, deletedAt: null } });
    if (rows.length !== orderedIds.length) throw new TaskHierarchyError(409, 'Your task list changed. Refresh before reordering.');
    if (expectedVersions && (Object.keys(expectedVersions).length !== rows.length || rows.some(row => row.version !== expectedVersions[row.id]))) throw new TaskHierarchyError(409, 'Your task list changed in another tab. Refresh before reordering.');
    const now = new Date();
    for (const [sortOrder, id] of orderedIds.entries()) await tx.task.update({ where: { id }, data: { sortOrder, updatedAt: now, version: { increment: 1 } } });
  });

  res.json({ success: true });
});

router.use(taskHierarchyErrorHandler);
export default router;
