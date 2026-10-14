import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { addDays, localDate } from '@reader/habit-core';
import { requireSession } from '../session';
import { dateInput } from './habit-contract';
import { HabitError, archiveHabit, completeHabits, createHabit, deleteHabit, editHabit, exportHabits, getHabit, listHabits, recordHabit, reorderHabits } from './habit-service';

const id = (req: Request) => z.string().uuid().parse(req.params.id);
function route(work: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try { await work(req, res); }
    catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ message: error.issues[0]?.message ?? 'Check the entered values.' }); return; }
      if (error instanceof HabitError) { res.status(error.status).json({ message: error.message }); return; }
      const code = (error as { code?: string })?.code;
      if (code === 'P2021' || code === 'P2022') { res.status(503).json({ message: 'Habits is not available on this server yet. Its database update must be installed with the app release.' }); return; }
      if (code === 'P2002' || code === 'P2034') { res.status(409).json({ message: 'Another change was saved at the same time. Refresh and try again.' }); return; }
      console.error('Habits request failed', error);
      res.status(500).json({ message: 'Couldn’t save or load habits. Please try again.' });
    }
  };
}
export function createHabitsRouter(db: PrismaClient) {
  const router = Router();
  router.use(requireSession);
  router.get('/', route(async (req, res) => {
    const today = localDate('UTC');
    const from = dateInput.parse(req.query.from ?? addDays(today, -31)), to = dateInput.parse(req.query.to ?? today);
    res.json({ items: await listHabits(db, res.locals.userId, from, to) });
  }));
  router.get('/export', route(async (_req, res) => { res.json(await exportHabits(db, res.locals.userId)); }));
  router.post('/complete', route(async (req, res) => { res.json({ logs: await completeHabits(db, res.locals.userId, req.body) }); }));
  router.put('/order', route(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string().uuid()).max(250) }).strict().parse(req.body);
    await reorderHabits(db, res.locals.userId, ids); res.status(204).end();
  }));
  router.post('/', route(async (req, res) => { res.status(201).json(await createHabit(db, res.locals.userId, req.body)); }));
  router.get('/:id', route(async (req, res) => { res.json(await getHabit(db, res.locals.userId, id(req))); }));
  router.put('/:id', route(async (req, res) => { res.json(await editHabit(db, res.locals.userId, id(req), req.body)); }));
  router.put('/:id/logs/:date', route(async (req, res) => { res.json(await recordHabit(db, res.locals.userId, id(req), dateInput.parse(req.params.date), req.body)); }));
  router.post('/:id/archive', route(async (req, res) => { res.json(await archiveHabit(db, res.locals.userId, id(req), req.body, true)); }));
  router.post('/:id/restore', route(async (req, res) => { res.json(await archiveHabit(db, res.locals.userId, id(req), req.body, false)); }));
  router.delete('/:id', route(async (req, res) => { await deleteHabit(db, res.locals.userId, id(req), req.body); res.status(204).end(); }));
  return router;
}
