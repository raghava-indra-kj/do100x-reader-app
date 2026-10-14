import { Router, Request, Response } from "express";
import { z } from 'zod';
import { prisma } from "./prisma";
import { requireSession } from "./session";
import { taskHierarchyTransaction, taskHierarchyErrorHandler, taskSubtreeIds, TaskHierarchyError } from "./task-hierarchy";
import { createListInput, updateListInput, parseTaskInput } from './task-contract';
import { accountTransaction, lockAccount } from './account-transaction';
import { elapsedSeconds, finishTimer } from './timer-service';

const router = Router();
router.use(requireSession);


// GET /backend-api/task-lists - Get all lists for user with task counts
router.get("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const lists = await prisma.task_list.findMany({
    where: { userId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate task counts per list
  const activeTasks = await prisma.task.findMany({
    where: { userId, deletedAt: null },
    select: { parentId: true, listId: true, status: true, totalTimeSeconds: true },
  });

  const countsMap = new Map<string | null, { total: number; uncompleted: number; totalTimeSeconds: number }>();

  for (const t of activeTasks) {
    const key = t.listId;
    if (!countsMap.has(key)) {
      countsMap.set(key, { total: 0, uncompleted: 0, totalTimeSeconds: 0 });
    }
    const c = countsMap.get(key)!;
    if (!t.parentId) c.total++;
    if (!t.parentId && t.status !== "done" && t.status !== "cancelled") {
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
  const userId = res.locals.userId as string;
  const { name, color, icon } = parseTaskInput(createListInput, req.body);

  const now = new Date();
  const newList = await accountTransaction(prisma, userId, async tx => {
  const maxSort = await tx.task_list.aggregate({
    where: { userId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  return tx.task_list.create({
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
  const userId = res.locals.userId as string;
  const id = parseTaskInput(z.string().min(1).max(36), req.params.id);
  const { name, color, icon, sortOrder } = parseTaskInput(updateListInput, req.body);

  const updated = await accountTransaction(prisma, userId, async tx => {
  const existing = await tx.task_list.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!existing) {
    throw new TaskHierarchyError(404, "List not found");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (name !== undefined) updateData.name = name.trim();
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  return tx.task_list.update({
    where: { id },
    data: updateData,
  });
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
  const userId = res.locals.userId as string;
  const id = parseTaskInput(z.string().min(1).max(36), req.params.id);
  const deleteTasks = req.query.deleteTasks === "true";
  await taskHierarchyTransaction(prisma, async tx => {
    await lockAccount(tx, userId);
    const existing = await tx.task_list.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) throw new TaskHierarchyError(404, "List not found");
    const now = new Date();
    const tasks = await tx.task.findMany({ where: { listId: id, userId, deletedAt: null }, select: { id: true } });
    const taskIds = await taskSubtreeIds(tx, userId, tasks.map(task => task.id));
    const timer = deleteTasks ? await tx.active_timer.findUnique({ where: { userId } }) : null;
    if (timer && taskIds.includes(timer.taskId) && elapsedSeconds(timer, now) >= 1) await finishTimer(tx, userId, timer, {}, now);
    // Delete the list and move/delete its task trees together. Concurrent
    // hierarchy writes cannot validate a list that is being removed.
    await tx.task_list.update({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: now, updatedAt: now },
    });
    await tx.task.updateMany({
      where: { id: { in: taskIds }, userId, deletedAt: null },
      data: deleteTasks ? { deletedAt: now, updatedAt: now, version: { increment: 1 } } : { listId: null, updatedAt: now, version: { increment: 1 } },
    });
    if (deleteTasks) await tx.active_timer.deleteMany({ where: { userId, taskId: { in: taskIds } } });
  });

  res.json({ success: true, deletedListId: id });
});

router.use(taskHierarchyErrorHandler);
export default router;
