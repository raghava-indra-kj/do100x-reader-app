import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { requireSession } from '../session';
import { TaskHierarchyError } from '../task-errors';
import { calendarDateInput } from './calendar-contract';
import { calendarPreferences, calendarRange, saveCalendarPreferences, taskSchedules, unscheduledTasks } from './calendar-query';
import { CalendarError, createCalendarEvent, deleteCalendarEvent, editCalendarEvent, getCalendarEvent, saveCalendarOccurrence } from './calendar-service';
import { addCalendarSource, exportCalendarSource, listCalendarSources, refreshCalendarSource, removeCalendarSource, updateCalendarSource } from './calendar-sources';
import { exportIcal } from './ical-export';

const id = (req: Request) => z.string().uuid().parse(req.params.id);
function route(work: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try { await work(req, res); }
    catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ message: error.issues[0]?.message ?? 'Check the calendar values.' }); return; }
      if (error instanceof CalendarError || error instanceof TaskHierarchyError) { res.status(error.status).json({ message: error.message }); return; }
      const code = (error as { code?: string })?.code;
      if (code === 'P2021' || code === 'P2022') { res.status(503).json({ message: 'Calendar needs its database update installed with the app release.' }); return; }
      if (code === 'P2002' || code === 'P2034') { res.status(409).json({ message: 'Another calendar change was saved at the same time. Refresh and try again.' }); return; }
      console.error('Calendar request failed', error);
      res.status(500).json({ message: 'Couldn’t load or save the calendar. Please try again.' });
    }
  };
}
export function createCalendarRouter(db: PrismaClient) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
  router.use(requireSession);
  router.get('/', route(async (req, res) => { res.json(await calendarRange(db, res.locals.userId, req.query)); }));
  router.get('/preferences', route(async (_req, res) => { res.json(await calendarPreferences(db, res.locals.userId)); }));
  router.get('/sources', route(async (_req, res) => { res.json(await listCalendarSources(db, res.locals.userId)); }));
  router.post('/sources', route(async (req, res) => { res.status(201).json(await addCalendarSource(db, res.locals.userId, req.body)); }));
  router.put('/sources/:id', route(async (req, res) => { res.json(await updateCalendarSource(db, res.locals.userId, id(req), req.body)); }));
  router.post('/sources/:id/refresh', route(async (req, res) => { res.json(await refreshCalendarSource(db, res.locals.userId, id(req))); }));
  router.delete('/sources/:id', route(async (req, res) => { await removeCalendarSource(db, res.locals.userId, id(req), req.body); res.status(204).end(); }));
  router.get('/sources/:id/export', route(async (req, res) => { res.setHeader('Content-Disposition', 'attachment; filename="calendar-source.ics"'); res.setHeader('Cache-Control', 'private, no-store'); res.type('text/calendar').send(await exportCalendarSource(db, res.locals.userId, id(req))); }));
  router.get('/export', route(async (req, res) => { const data = await calendarRange(db, res.locals.userId, req.query, { includeSources: false }); res.setHeader('Content-Disposition', 'attachment; filename="do100x-calendar.ics"'); res.type('text/calendar').send(exportIcal(data.events, data.occurrences)); }));
  router.put('/preferences', route(async (req, res) => { res.json(await saveCalendarPreferences(db, res.locals.userId, req.body)); }));
  router.get('/tasks', route(async (req, res) => { res.json(await unscheduledTasks(db, res.locals.userId, req.query)); }));
  router.get('/tasks/:id/schedule', route(async (req, res) => { res.json(await taskSchedules(db, res.locals.userId, id(req))); }));
  router.post('/events', route(async (req, res) => { res.status(201).json(await createCalendarEvent(db, res.locals.userId, req.body)); }));
  router.get('/events/:id', route(async (req, res) => { res.json(await getCalendarEvent(db, res.locals.userId, id(req))); }));
  router.put('/events/:id', route(async (req, res) => { res.json(await editCalendarEvent(db, res.locals.userId, id(req), req.body)); }));
  router.put('/events/:id/occurrences/:date', route(async (req, res) => { res.json(await saveCalendarOccurrence(db, res.locals.userId, id(req), calendarDateInput.parse(req.params.date), req.body)); }));
  router.delete('/events/:id', route(async (req, res) => { await deleteCalendarEvent(db, res.locals.userId, id(req), req.body); res.status(204).end(); }));
  return router;
}
