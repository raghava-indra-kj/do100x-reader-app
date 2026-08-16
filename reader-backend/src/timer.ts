import { Router, Request, Response } from "express";
import { prisma } from "./prisma";

const router = Router();

function getUserId(req: Request): string | undefined {
  return (req.headers["x-user-id"] as string) || (req.query.userId as string) || undefined;
}

/**
 * Recalculates and updates the totalTimeSeconds for a given task based on all its time_sessions.
 */
async function recalculateTaskTotalTime(taskId: string, userId: string): Promise<number> {
  const aggregate = await prisma.time_session.aggregate({
    where: { taskId, userId },
    _sum: { durationSeconds: true },
  });
  const total = aggregate._sum.durationSeconds ?? 0;
  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { totalTimeSeconds: total, updatedAt: new Date() },
  });
  return total;
}

// ==========================================
// 1. ACTIVE LIVE SERVER TIMER ENDPOINTS
// ==========================================

// GET /backend-api/timer/active - Get running timer status
router.get("/active", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const active = await prisma.active_timer.findUnique({
    where: { userId },
  });

  if (!active) {
    res.json({ active: false, timer: null });
    return;
  }

  const task = await prisma.task.findFirst({
    where: { id: active.taskId, userId, deletedAt: null },
    select: { id: true, title: true, listId: true, priority: true, totalTimeSeconds: true },
  });

  if (!task) {
    // Task was deleted, clean up active timer
    await prisma.active_timer.delete({ where: { userId } });
    res.json({ active: false, timer: null });
    return;
  }

  const now = new Date();
  let currentElapsed = active.accumulatedSeconds;
  if (!active.isPaused) {
    const elapsedSinceStart = Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
    currentElapsed += elapsedSinceStart;
  }

  res.json({
    active: true,
    timer: {
      id: active.id,
      taskId: active.taskId,
      taskTitle: task.title,
      taskPriority: task.priority,
      listId: task.listId,
      startTime: active.startTime.toISOString(),
      accumulatedSeconds: active.accumulatedSeconds,
      currentElapsedSeconds: currentElapsed,
      isPaused: active.isPaused,
      pausedAt: active.pausedAt ? active.pausedAt.toISOString() : null,
      notes: active.notes,
    },
  });
});

// POST /backend-api/timer/start - Start server timer for a task
router.post("/start", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { taskId, notes } = req.body;
  if (!taskId || typeof taskId !== "string") {
    res.status(400).json({ error: "taskId is required" });
    return;
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const now = new Date();

  // If user already had a timer running, auto-complete it before starting new one
  const existingActive = await prisma.active_timer.findUnique({ where: { userId } });
  if (existingActive) {
    let finalDuration = existingActive.accumulatedSeconds;
    if (!existingActive.isPaused) {
      finalDuration += Math.max(0, Math.floor((now.getTime() - existingActive.startTime.getTime()) / 1000));
    }
    if (finalDuration >= 5) {
      // Save session if > 5 seconds
      await prisma.time_session.create({
        data: {
          userId,
          taskId: existingActive.taskId,
          startTime: existingActive.startTime,
          endTime: now,
          durationSeconds: finalDuration,
          notes: existingActive.notes,
          createdAt: now,
          updatedAt: now,
        },
      });
      await recalculateTaskTotalTime(existingActive.taskId, userId);
    }
  }

  const newTimer = await prisma.active_timer.upsert({
    where: { userId },
    create: {
      userId,
      taskId,
      startTime: now,
      accumulatedSeconds: 0,
      isPaused: false,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      taskId,
      startTime: now,
      accumulatedSeconds: 0,
      isPaused: false,
      pausedAt: null,
      notes: notes || null,
      updatedAt: now,
    },
  });

  res.json({
    success: true,
    timer: {
      id: newTimer.id,
      taskId: newTimer.taskId,
      taskTitle: task.title,
      startTime: newTimer.startTime.toISOString(),
      accumulatedSeconds: 0,
      currentElapsedSeconds: 0,
      isPaused: false,
      notes: newTimer.notes,
    },
  });
});

// POST /backend-api/timer/pause - Pause active timer
router.post("/pause", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const active = await prisma.active_timer.findUnique({ where: { userId } });
  if (!active || active.isPaused) {
    res.status(400).json({ error: "No active unpaused timer to pause" });
    return;
  }

  const now = new Date();
  const elapsedSinceStart = Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
  const newAccumulated = active.accumulatedSeconds + elapsedSinceStart;

  const updated = await prisma.active_timer.update({
    where: { userId },
    data: {
      accumulatedSeconds: newAccumulated,
      isPaused: true,
      pausedAt: now,
      updatedAt: now,
    },
  });

  res.json({
    success: true,
    timer: {
      id: updated.id,
      taskId: updated.taskId,
      accumulatedSeconds: updated.accumulatedSeconds,
      currentElapsedSeconds: updated.accumulatedSeconds,
      isPaused: true,
      pausedAt: updated.pausedAt ? updated.pausedAt.toISOString() : null,
    },
  });
});

// POST /backend-api/timer/resume - Resume paused timer
router.post("/resume", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const active = await prisma.active_timer.findUnique({ where: { userId } });
  if (!active || !active.isPaused) {
    res.status(400).json({ error: "No paused timer to resume" });
    return;
  }

  const now = new Date();
  const updated = await prisma.active_timer.update({
    where: { userId },
    data: {
      startTime: now,
      isPaused: false,
      pausedAt: null,
      updatedAt: now,
    },
  });

  res.json({
    success: true,
    timer: {
      id: updated.id,
      taskId: updated.taskId,
      startTime: updated.startTime.toISOString(),
      accumulatedSeconds: updated.accumulatedSeconds,
      currentElapsedSeconds: updated.accumulatedSeconds,
      isPaused: false,
    },
  });
});

// POST /backend-api/timer/stop - Finish timer, save notes, create session, update task total
router.post("/stop", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { notes } = req.body;

  const active = await prisma.active_timer.findUnique({ where: { userId } });
  if (!active) {
    res.status(400).json({ error: "No active timer to stop" });
    return;
  }

  const now = new Date();
  let finalDuration = active.accumulatedSeconds;
  if (!active.isPaused) {
    finalDuration += Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
  }

  // Create historical session
  const session = await prisma.time_session.create({
    data: {
      userId,
      taskId: active.taskId,
      startTime: active.startTime,
      endTime: now,
      durationSeconds: Math.max(1, finalDuration),
      notes: notes !== undefined ? notes : active.notes,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Recalculate total time on task
  const newTotalSeconds = await recalculateTaskTotalTime(active.taskId, userId);

  // Delete active timer
  await prisma.active_timer.delete({ where: { userId } });

  res.json({
    success: true,
    session: {
      id: session.id,
      taskId: session.taskId,
      durationSeconds: session.durationSeconds,
      notes: session.notes,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
    },
    taskTotalTimeSeconds: newTotalSeconds,
  });
});

// POST /backend-api/timer/discard - Discard active timer without recording
router.post("/discard", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  await prisma.active_timer.deleteMany({ where: { userId } });
  res.json({ success: true });
});

// ==========================================
// 2. MANUAL TIME SESSION LOGGING ENDPOINTS
// ==========================================

// GET /backend-api/timer/tasks/:taskId/sessions - Get sessions for a task
router.get("/tasks/:taskId/sessions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { taskId } = req.params;
  const sessions = await prisma.time_session.findMany({
    where: { taskId, userId },
    orderBy: { startTime: "desc" },
  });

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime ? s.endTime.toISOString() : null,
      durationSeconds: s.durationSeconds,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

// POST /backend-api/timer/tasks/:taskId/sessions - Add manual session
router.post("/tasks/:taskId/sessions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { taskId } = req.params;
  const { startTime, endTime, durationSeconds, notes } = req.body;

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const sTime = startTime ? new Date(startTime) : new Date();
  const eTime = endTime ? new Date(endTime) : null;
  const duration = durationSeconds ? parseInt(durationSeconds, 10) : 0;

  const now = new Date();
  const session = await prisma.time_session.create({
    data: {
      userId,
      taskId,
      startTime: sTime,
      endTime: eTime,
      durationSeconds: Math.max(0, duration),
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    },
  });

  const total = await recalculateTaskTotalTime(taskId, userId);

  res.json({
    session: {
      id: session.id,
      taskId: session.taskId,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      durationSeconds: session.durationSeconds,
      notes: session.notes,
    },
    taskTotalTimeSeconds: total,
  });
});

// PATCH /backend-api/timer/sessions/:sessionId - Edit session
router.patch("/sessions/:sessionId", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { sessionId } = req.params;
  const { startTime, endTime, durationSeconds, notes } = req.body;

  const existing = await prisma.time_session.findFirst({
    where: { id: sessionId, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (startTime !== undefined) updateData.startTime = new Date(startTime);
  if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
  if (durationSeconds !== undefined) updateData.durationSeconds = Math.max(0, parseInt(durationSeconds, 10));
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.time_session.update({
    where: { id: sessionId },
    data: updateData,
  });

  const total = await recalculateTaskTotalTime(existing.taskId, userId);

  res.json({
    session: {
      id: updated.id,
      taskId: updated.taskId,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime ? updated.endTime.toISOString() : null,
      durationSeconds: updated.durationSeconds,
      notes: updated.notes,
    },
    taskTotalTimeSeconds: total,
  });
});

// DELETE /backend-api/timer/sessions/:sessionId - Delete single session
router.delete("/sessions/:sessionId", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { sessionId } = req.params;
  const existing = await prisma.time_session.findFirst({
    where: { id: sessionId, userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await prisma.time_session.delete({ where: { id: sessionId } });
  const total = await recalculateTaskTotalTime(existing.taskId, userId);

  res.json({ success: true, deletedSessionId: sessionId, taskTotalTimeSeconds: total });
});

// DELETE /backend-api/timer/tasks/:taskId/sessions - Delete all sessions for task
router.delete("/tasks/:taskId/sessions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { taskId } = req.params;
  await prisma.time_session.deleteMany({
    where: { taskId, userId },
  });

  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { totalTimeSeconds: 0, updatedAt: new Date() },
  });

  res.json({ success: true, deletedForTaskId: taskId, taskTotalTimeSeconds: 0 });
});

// ==========================================
// 3. TIME ANALYTICS & BREAKDOWN
// ==========================================

// GET /backend-api/timer/analytics - Comprehensive time metrics
router.get("/analytics", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "User ID required" });
    return;
  }

  const { days = "7" } = req.query;
  const dayCount = parseInt(days as string, 10) || 7;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dayCount);

  const sessions = await prisma.time_session.findMany({
    where: { userId, startTime: { gte: sinceDate } },
    orderBy: { startTime: "desc" },
  });

  const tasks = await prisma.task.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, title: true, listId: true, priority: true },
  });
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const lists = await prisma.task_list.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, name: true, color: true },
  });
  const listMap = new Map(lists.map((l) => [l.id, l]));

  let totalSeconds = 0;
  const taskBreakdown = new Map<string, { taskId: string; title: string; seconds: number; listName: string }>();
  const listBreakdown = new Map<string, { listId: string | null; name: string; color: string; seconds: number }>();
  const dailyTimeline = new Map<string, number>();

  for (const s of sessions) {
    totalSeconds += s.durationSeconds;
    const task = taskMap.get(s.taskId);
    const title = task?.title || "Deleted Task";
    const listId = task?.listId || null;
    const list = listId ? listMap.get(listId) : null;
    const listName = list?.name || "Inbox";
    const listColor = list?.color || "#3b82f6";

    // Task breakdown
    if (!taskBreakdown.has(s.taskId)) {
      taskBreakdown.set(s.taskId, { taskId: s.taskId, title, seconds: 0, listName });
    }
    taskBreakdown.get(s.taskId)!.seconds += s.durationSeconds;

    // List breakdown
    const listKey = listId || "inbox";
    if (!listBreakdown.has(listKey)) {
      listBreakdown.set(listKey, { listId, name: listName, color: listColor, seconds: 0 });
    }
    listBreakdown.get(listKey)!.seconds += s.durationSeconds;

    // Daily breakdown
    const dateKey = s.startTime.toISOString().slice(0, 10);
    dailyTimeline.set(dateKey, (dailyTimeline.get(dateKey) || 0) + s.durationSeconds);
  }

  res.json({
    periodDays: dayCount,
    totalSeconds,
    sessionsCount: sessions.length,
    byTask: Array.from(taskBreakdown.values()).sort((a, b) => b.seconds - a.seconds),
    byList: Array.from(listBreakdown.values()).sort((a, b) => b.seconds - a.seconds),
    dailyTimeline: Object.fromEntries(dailyTimeline.entries()),
  });
});

export default router;
