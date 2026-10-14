// Local-only, isolated-database preview. Never imported by the production application.
import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { attachSession, issueSession } from '../session';
import { createHabitsRouter } from './habit-router';
import { addDays, localDate, type HabitDraft } from '@reader/habit-core';
import { createHabit, recordHabit } from './habit-service';

async function start() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV !== 'test' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_habits_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Preview requires a dedicated local Habits test database.');
  const db = new PrismaClient();
  const user = await db.appuser.create({ data: { displayName: 'Habits preview', email: `habits-preview-${randomUUID()}@example.com`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
  if (process.env.HABITS_PREVIEW_SEED === '1') {
    const timezone = 'Asia/Kolkata', today = localDate(timezone), startDate = addDays(today, -13);
    const plan: HabitDraft['plan'] = { startDate, endDate: null, frequency: 'DAILY', weekdays: [1, 3, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'COUNT', target: 2, unit: 'pages', step: 1, reminders: ['09:00', '18:00'] };
    const samples: HabitDraft[] = [
      { name: 'Read a little', description: 'Make room for an idea worth keeping.', icon: 'book', color: 'orange', section: 'Learning', timezone, plan },
      { name: 'Drink water', description: 'A glass at a time.', icon: 'water', color: 'blue', section: 'Health', timezone, plan: { ...plan, target: 8, unit: 'glasses' } },
      { name: 'Go for a walk', description: 'Step outside and move.', icon: 'walk', color: 'green', section: 'Movement', timezone, plan: { ...plan, frequency: 'WEEKLY', target: 20, unit: 'minutes', step: 5 } },
      { name: 'Write a journal', description: 'One thought is enough.', icon: 'pen', color: 'violet', section: 'Mind', timezone, plan: { ...plan, goalType: 'CHECK', target: 1, unit: '', step: 1 } },
    ];
    for (const [index, sample] of samples.entries()) {
      const habit = await createHabit(db, user.id, { ...sample, requestKey: randomUUID() });
      for (let daysAgo = 13; daysAgo >= 1; daysAgo--) {
        if (sample.plan.frequency === 'WEEKLY' ? daysAgo % 2 === 0 : (daysAgo + index) % 7 === 0) continue;
        await recordHabit(db, user.id, habit.id, addDays(today, -daysAgo), { expectedVersion: 0, habitVersion: 1, status: 'RECORDED', value: sample.plan.target, note: daysAgo === 1 ? 'A small step that felt worthwhile.' : '', mood: daysAgo === 1 ? 4 : null });
      }
    }
    console.log('Created disposable sample habits for browser review.');
  }
  const app = express(); app.use(express.json());
  app.get('/backend-api/auth/session', (_req, res) => { issueSession(res, user.id); res.json({ id: user.id, displayName: user.displayName, email: user.email, avatarUrl: null }); });
  app.get('/backend-api/user-preferences', (_req, res) => res.json({ motivationsEnabled: false }));
  app.use('/backend-api', attachSession(db));
  app.use('/backend-api/habits', createHabitsRouter(db));
  app.use('/backend-api', (_req, res) => res.status(404).json({ message: 'This isolated preview provides Habits only.' }));
  app.use(express.static(path.resolve(process.cwd(), 'reader-frontend/dist')));
  app.get('*splat', (_req, res) => res.sendFile(path.resolve(process.cwd(), 'reader-frontend/dist/index.html')));
  app.listen(5183, '127.0.0.1', () => console.log('Habits local database preview: http://127.0.0.1:5183/habits'));
}
void start().catch(error => { console.error('Preview could not start:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
