import { Router, Request, Response } from "express";
import { prisma } from "./prisma";

const router = Router();

function getUserId(req: Request): string | undefined {
  return (req.headers["x-user-id"] as string) || (req.query.userId as string) || undefined;
}

// GET /backend-api/task-lists - Get all lists for user with task counts
router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const lists = await prisma.task_list.findMany({
    where: { userId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate task counts per list
  const activeTasks = await prisma.task.findMany({
    where: { userId, deletedAt: null, parentId: null },
    select: { listId: true, status: true, totalTimeSeconds: true },
  });

  const countsMap = new Map<string | null, { total: number; uncompleted: number; totalTimeSeconds: number }>();

  for (const t of activeTasks) {
    const key = t.listId;
    if (!countsMap.has(key)) {
      countsMap.set(key, { total: 0, uncompleted: 0, totalTimeSeconds: 0 });
    }
    const c = countsMap.get(key)!;
    c.total++;
    if (t.status !== "done" && t.status !== "cancelled") {
      c.uncompleted++;
    }
    c.totalTimeSeconds += t.totalTimeSeconds || 0;
  }

  const inboxCounts = countsMap.get(null) || { total: 0, uncompleted: 0, totalTimeSeconds: 0 };

  const enrichedLists = lists.map((l) => {
    const c = countsMap.get(l.id) || { total: 0, uncompleted: 0, totalTimeSeconds: 0 };
    return {
      id: l.id,
      name: l.name,
      color: l.color,
      icon: l.icon,
      sortOrder: l.sortOrder,
      taskCount: c.total,
      uncompletedCount: c.uncompleted,
      totalTimeSeconds: c.totalTimeSeconds,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  });

  res.json({
    lists: enrichedLists,
    inbox: {
      taskCount: inboxCounts.total,
      uncompletedCount: inboxCounts.uncompleted,
      totalTimeSeconds: inboxCounts.totalTimeSeconds,
    },
  });
});

// POST /backend-api/task-lists - Create new list
router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { name, color, icon } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "List name is required" });
    return;
  }

  const now = new Date();
  const maxSort = await prisma.task_list.aggregate({
    where: { userId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const newList = await prisma.task_list.create({
    data: {
      userId,
      name: name.trim(),
      color: color || "#3b82f6",
      icon: icon || "List",
      sortOrder,
      createdAt: now,
      updatedAt: now,
    },
  });

  res.json({
    id: newList.id,
    name: newList.name,
    color: newList.color,
    icon: newList.icon,
    sortOrder: newList.sortOrder,
    taskCount: 0,
    uncompletedCount: 0,
    totalTimeSeconds: 0,
    createdAt: newList.createdAt.toISOString(),
    updatedAt: newList.updatedAt.toISOString(),
  });
});

// PATCH /backend-api/task-lists/:id - Update list
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { id } = req.params;
  const { name, color, icon, sortOrder } = req.body;

  const existing = await prisma.task_list.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (name !== undefined) updateData.name = name.trim();
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  const updated = await prisma.task_list.update({
    where: { id },
    data: updateData,
  });

  res.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
    icon: updated.icon,
    sortOrder: updated.sortOrder,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// DELETE /backend-api/task-lists/:id - Soft delete list (tasks move to Inbox or get deleted)
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { id } = req.params;
  const deleteTasks = req.query.deleteTasks === "true";

  const existing = await prisma.task_list.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const now = new Date();

  // Soft delete list
  await prisma.task_list.update({
    where: { id },
    data: { deletedAt: now, updatedAt: now },
  });

  if (deleteTasks) {
    // Soft delete associated tasks
    await prisma.task.updateMany({
      where: { listId: id, userId, deletedAt: null },
      data: { deletedAt: now, updatedAt: now },
    });
  } else {
    // Move tasks to Inbox (listId = null)
    await prisma.task.updateMany({
      where: { listId: id, userId, deletedAt: null },
      data: { listId: null, updatedAt: now },
    });
  }

  res.json({ success: true, deletedListId: id });
});

export default router;
