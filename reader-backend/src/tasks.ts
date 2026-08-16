import { Router, Request, Response } from "express";
import { prisma } from "./prisma";

const router = Router();

function getUserId(req: Request): string | undefined {
  return (req.headers["x-user-id"] as string) || (req.query.userId as string) || undefined;
}

// GET /backend-api/tasks - List tasks with smart filters
router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { listId, status, priority, due, search, parentId, includeSubtasks } = req.query;

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
  } else if (includeSubtasks !== "true" && !due && !priority && !search) {
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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (due === "today") {
      where.dueDate = { gte: todayStart, lte: todayEnd };
    } else if (due === "next7") {
      const next7End = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.dueDate = { gte: todayStart, lte: next7End };
    } else if (due === "overdue") {
      where.dueDate = { lt: todayStart };
      where.status = { notIn: ["done", "cancelled"] };
    }
  }

  // Search filter
  if (search && typeof search === "string" && search.trim()) {
    where.OR = [
      { title: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

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
    listId: t.listId,
    list: t.listId ? listMap.get(t.listId) ?? null : null,
    parentId: t.parentId,
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
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Recursive subtasks collector
  async function fetchSubtasksRecursive(parentId: string): Promise<any[]> {
    const children = await prisma.task.findMany({
      where: { parentId, userId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const enriched = [];
    for (const child of children) {
      const nested = await fetchSubtasksRecursive(child.id);
      enriched.push({
        id: child.id,
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
    })),
    isActiveTimerRunning: activeTimer?.taskId === task.id,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
});

// POST /backend-api/tasks - Create task or subtask
router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { title, description, listId, parentId, priority, dueDate, dueTime, status } = req.body;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Task title is required" });
    return;
  }

  // Validate parentId if provided
  let validParentId: string | null = null;
  if (parentId) {
    const parent = await prisma.task.findFirst({
      where: { id: parentId, userId, deletedAt: null },
    });
    if (parent) validParentId = parent.id;
  }

  // Validate listId if provided
  let validListId: string | null = null;
  if (listId && listId !== "null" && listId !== "inbox") {
    const list = await prisma.task_list.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });
    if (list) validListId = list.id;
  }

  const now = new Date();
  const maxSort = await prisma.task.aggregate({
    where: { userId, parentId: validParentId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  let parsedDueDate: Date | null = null;
  if (dueDate) {
    const d = new Date(dueDate);
    if (!Number.isNaN(d.getTime())) parsedDueDate = d;
  }

  const newTask = await prisma.task.create({
    data: {
      userId,
      listId: validListId,
      parentId: validParentId,
      title: title.trim(),
      description: description ?? null,
      status: status || "todo",
      priority: priority !== undefined ? Math.max(1, Math.min(4, parseInt(priority, 10))) : 4,
      dueDate: parsedDueDate,
      dueTime: dueTime || null,
      sortOrder,
      totalTimeSeconds: 0,
      createdAt: now,
      updatedAt: now,
    },
  });

  res.json({
    id: newTask.id,
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
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  });
});

// PATCH /backend-api/tasks/:id - Update task properties
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { id } = req.params;
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
  } = req.body;

  const now = new Date();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
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
    updateData.priority = Math.max(1, Math.min(4, parseInt(priority, 10)));
  }

  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === "") {
      updateData.dueDate = null;
    } else {
      const d = new Date(dueDate);
      if (!Number.isNaN(d.getTime())) updateData.dueDate = d;
    }
  }

  if (dueTime !== undefined) {
    updateData.dueTime = dueTime || null;
  }

  if (listId !== undefined) {
    updateData.listId = listId === null || listId === "null" || listId === "inbox" ? null : listId;
  }

  if (parentId !== undefined) {
    const targetParentId = parentId === null || parentId === "null" ? null : parentId;
    if (targetParentId === id) {
      res.status(400).json({ error: "Cannot make task a subtask of itself" });
      return;
    }
    if (targetParentId) {
      // Prevent cyclic nesting: check if targetParentId is a descendant of id
      let curr: string | null = targetParentId;
      let isCycle = false;
      while (curr) {
        if (curr === id) {
          isCycle = true;
          break;
        }
        const parentTask: { parentId: string | null } | null = await prisma.task.findFirst({
          where: { id: curr, userId, deletedAt: null },
          select: { parentId: true },
        });
        curr = parentTask ? parentTask.parentId : null;
      }
      if (isCycle) {
        res.status(400).json({ error: "Cannot move task into its own descendant subtask" });
        return;
      }
    }
    updateData.parentId = targetParentId;
  }

  if (sortOrder !== undefined) {
    updateData.sortOrder = sortOrder;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  res.json({
    id: updated.id,
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

// DELETE /backend-api/tasks/:id - Soft delete task, all descendant subtasks, and clean up time sessions
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { id } = req.params;
  const existing = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const now = new Date();

  // Recursive collection of all descendant task IDs
  async function getAllDescendantTaskIds(taskId: string): Promise<string[]> {
    const ids: string[] = [taskId];
    const children = await prisma.task.findMany({
      where: { parentId: taskId, userId, deletedAt: null },
      select: { id: true },
    });
    for (const child of children) {
      const subIds = await getAllDescendantTaskIds(child.id);
      ids.push(...subIds);
    }
    return ids;
  }

  const allTargetIds = await getAllDescendantTaskIds(id);

  // 1. Delete all time sessions associated with task and its subtasks
  await prisma.time_session.deleteMany({
    where: { taskId: { in: allTargetIds }, userId },
  });

  // 2. Soft delete the tasks and all subtasks
  await prisma.task.updateMany({
    where: { id: { in: allTargetIds }, userId },
    data: { deletedAt: now, updatedAt: now },
  });

  // 3. If active timer was running on any of these tasks, delete it
  const active = await prisma.active_timer.findUnique({ where: { userId } });
  if (active && allTargetIds.includes(active.taskId)) {
    await prisma.active_timer.delete({ where: { userId } });
  }

  res.json({ success: true, deletedTaskId: id, affectedTaskIds: allTargetIds });
});

// POST /backend-api/tasks/reorder - Reorder task sortOrders
router.post("/reorder", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: "orderedIds array is required" });
    return;
  }

  const now = new Date();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.task.updateMany({
        where: { id, userId, deletedAt: null },
        data: { sortOrder: index, updatedAt: now },
      })
    )
  );

  res.json({ success: true });
});

export default router;
