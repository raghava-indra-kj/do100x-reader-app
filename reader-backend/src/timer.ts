import { Router, Request, Response } from "express";
import { timeAnalytics } from './time-analytics';
import { prisma } from "./prisma";
import { requireSession } from "./session";
import { taskHierarchyErrorHandler, TaskHierarchyError } from './task-hierarchy';
import { addTaskSession, deleteTaskSession, deleteTaskSessions, discardTaskTimer, editTaskSession, pauseTaskTimer, readActiveTimer, sessionDto, startTaskTimer, stopTaskTimer } from './timer-service';

const router = Router();
router.use(requireSession);
router.get('/active', async (_req, res) => { res.json(await readActiveTimer(prisma, res.locals.userId)); });
router.post('/start', async (req, res) => { res.json(await startTaskTimer(prisma, res.locals.userId, req.body)); });
router.post('/pause', async (req, res) => { res.json(await pauseTaskTimer(prisma, res.locals.userId, req.body, true)); });
router.post('/resume', async (req, res) => { res.json(await pauseTaskTimer(prisma, res.locals.userId, req.body, false)); });
router.post('/stop', async (req, res) => { res.json(await stopTaskTimer(prisma, res.locals.userId, req.body)); });
router.post('/discard', async (req, res) => { res.json(await discardTaskTimer(prisma, res.locals.userId, req.body)); });
router.get('/tasks/:taskId/sessions', async (req, res) => {
  const userId = res.locals.userId;
  if (!await prisma.task.findFirst({ where: { id: req.params.taskId, userId } })) throw new TaskHierarchyError(404, 'Task not found.');
  const sessions = await prisma.time_session.findMany({ where: { taskId: req.params.taskId, userId }, orderBy: { startTime: 'desc' } });
  res.json({ sessions: sessions.map(sessionDto) });
});
router.post('/tasks/:taskId/sessions', async (req, res) => { res.json(await addTaskSession(prisma, res.locals.userId, req.params.taskId, req.body)); });
router.patch('/sessions/:sessionId', async (req, res) => { res.json(await editTaskSession(prisma, res.locals.userId, req.params.sessionId, req.body)); });
router.delete('/sessions/:sessionId', async (req, res) => { res.json(await deleteTaskSession(prisma, res.locals.userId, req.params.sessionId, req.body)); });
router.delete('/tasks/:taskId/sessions', async (req, res) => { res.json(await deleteTaskSessions(prisma, res.locals.userId, req.params.taskId)); });

// Reports use the same timezone, date range and list filters as agent tools.
router.get('/analytics', async (req, res) => { res.json(await timeAnalytics(prisma, res.locals.userId, req.query)); });
router.use(taskHierarchyErrorHandler);
export default router;
