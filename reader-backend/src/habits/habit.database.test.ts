import { randomUUID } from 'node:crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { completeHabits, createHabit, editHabit, recordHabit, archiveHabit, deleteHabit, getHabit, listHabits, reorderHabits } from './habit-service';
import { createHabitsRouter } from './habit-router';
import { issueSession, attachSession } from '../session';
import { habitInput, logInput } from './habit-contract';

const enabled = process.env.HABITS_DATABASE_TEST === '1';
const now = new Date('2026-10-14T12:00:00Z');
const draft = { name: 'Read', description: 'A small daily practice', icon: 'book', color: 'orange', section: 'Learning', timezone: 'Asia/Kolkata', plan: { startDate: '2026-10-01', endDate: null, frequency: 'DAILY', weekdays: [1, 2, 3, 4, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'COUNT', target: 2, unit: 'pages', step: 1, reminders: ['09:00'] } };
describe('habit input validation', () => {
  it('rejects invalid dates, duplicate schedules, invalid amounts and unknown fields', () => {
    expect(habitInput.safeParse(draft).success).toBe(true);
    for (const plan of [{ ...draft.plan, startDate: '2026-02-30' }, { ...draft.plan, frequency: 'WEEKDAYS', weekdays: [] }, { ...draft.plan, target: 0 }, { ...draft.plan, reminders: ['25:00'] }, { ...draft.plan, step: 1.00001 }]) expect(habitInput.safeParse({ ...draft, plan }).success).toBe(false);
    expect(habitInput.safeParse({ ...draft, userId: 'other' }).success).toBe(false);
    expect(logInput.safeParse({ expectedVersion: 0, habitVersion: 1, status: 'SKIPPED', value: 3, note: '', mood: null }).success).toBe(false);
  });
});
describe.skipIf(!enabled)('isolated MySQL habit lifecycle', () => {
  const db = new PrismaClient();
  let owner: string, stranger: string, previousUserCount: number;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_habits_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Tests refuse non-isolated databases.');
    previousUserCount = await db.appuser.count();
    const user = async () => (await db.appuser.create({ data: { email: `${randomUUID()}@example.com`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } })).id;
    owner = await user(); stranger = await user();
  });
  afterAll(async () => { await db.$disconnect(); });
  const create = () => createHabit(db, owner, { ...draft, requestKey: randomUUID() }, now);
  it('persists, round-trips and deduplicates creates without mixing accounts', async () => {
    const input = { ...draft, requestKey: randomUUID() }, habit = await createHabit(db, owner, input, now);
    expect((await createHabit(db, owner, input, now)).id).toBe(habit.id);
    await expect(createHabit(db, owner, { ...input, name: 'Different' }, now)).rejects.toMatchObject({ status: 409 });
    expect((await getHabit(db, owner, habit.id)).name).toBe('Read');
    await expect(getHabit(db, stranger, habit.id)).rejects.toMatchObject({ status: 404 });
    expect(await listHabits(db, stranger, '2026-10-01', '2026-10-31')).toEqual([]);
  });
  it('protects metadata and effective-dated history, including JSON key order', async () => {
    const habit = await create();
    const renamed = await editHabit(db, owner, habit.id, { ...draft, name: 'Read thoughtfully', expectedVersion: habit.version }, now);
    expect(renamed.plans).toHaveLength(1);
    const updated = await editHabit(db, owner, habit.id, { ...draft, plan: { ...draft.plan, target: 5 }, expectedVersion: renamed.version }, now);
    expect(updated.plans.map(plan => [plan.effectiveFrom, plan.target])).toEqual([['2026-10-01', 2], ['2026-10-15', 5]]);
    await expect(editHabit(db, owner, habit.id, { ...draft, expectedVersion: habit.version }, now)).rejects.toMatchObject({ status: 409 });
    await expect(editHabit(db, stranger, habit.id, { ...draft, expectedVersion: updated.version }, now)).rejects.toMatchObject({ status: 404 });
  });
  it('records decimal quantities, notes and moods; clear keeps a conflict version', async () => {
    const habit = await create();
    const input = { expectedVersion: 0, habitVersion: habit.version, value: 1.25, status: 'RECORDED', note: 'One useful idea', mood: 4 };
    const log = await recordHabit(db, owner, habit.id, '2026-10-14', input, now);
    expect(log).toMatchObject({ value: 1.25, note: 'One useful idea', mood: 4, version: 1 });
    const cleared = await recordHabit(db, owner, habit.id, '2026-10-14', { ...input, expectedVersion: 1, value: 0, status: 'NONE', note: '', mood: null }, now);
    expect(cleared.version).toBe(2);
    await expect(recordHabit(db, owner, habit.id, '2026-10-14', input, now)).rejects.toMatchObject({ status: 409 });
    await expect(recordHabit(db, owner, habit.id, '2026-10-15', input, now)).rejects.toMatchObject({ status: 400 });
    await expect(recordHabit(db, stranger, habit.id, '2026-10-14', input, now)).rejects.toMatchObject({ status: 404 });
  });
  it('completes a selection atomically and keeps reflections', async () => {
    const first = await create(), second = await create();
    await recordHabit(db, owner, first.id, '2026-10-14', { expectedVersion: 0, habitVersion: 1, value: 1, status: 'RECORDED', note: 'Keep my reflection', mood: 5 }, now);
    const input = { date: '2026-10-14', items: [{ id: first.id, habitVersion: 1, expectedVersion: 1 }, { id: second.id, habitVersion: 99, expectedVersion: 0 }] };
    await expect(completeHabits(db, owner, input, now)).rejects.toMatchObject({ status: 409 });
    expect((await getHabit(db, owner, first.id)).logs[0].value).toBe(1);
    input.items[1].habitVersion = 1;
    expect(await completeHabits(db, owner, input, now)).toMatchObject([{ value: 2, note: 'Keep my reflection', mood: 5 }, { value: 2 }]);
    await expect(completeHabits(db, stranger, input, now)).rejects.toMatchObject({ status: 404 });
  });
  it('applies reminders immediately but defers weekly goal changes until Monday', async () => {
    const habit = await createHabit(db, owner, { ...draft, plan: { ...draft.plan, frequency: 'WEEKLY' }, requestKey: randomUUID() }, now);
    const reminderEdit = await editHabit(db, owner, habit.id, { ...draft, plan: { ...draft.plan, frequency: 'WEEKLY', reminders: ['18:00'] }, expectedVersion: 1 }, now);
    expect(reminderEdit.plans).toHaveLength(1);
    expect(reminderEdit.plans[0].reminders).toEqual(['18:00']);
    const goalEdit = await editHabit(db, owner, habit.id, { ...draft, plan: { ...draft.plan, frequency: 'WEEKLY', weeklyTarget: 4 }, expectedVersion: 2 }, now);
    expect(goalEdit.plans.map(plan => plan.effectiveFrom)).toEqual(['2026-10-01', '2026-10-19']);
    expect(goalEdit.plans[0].weeklyTarget).toBe(3);
  });
  it('serializes simultaneous check-ins instead of losing a completed action', async () => {
    const habit = await create(), input = { expectedVersion: 0, habitVersion: 1, value: 1, status: 'RECORDED', note: '', mood: null };
    const results = await Promise.allSettled([recordHabit(db, owner, habit.id, '2026-10-14', input, now), recordHabit(db, owner, habit.id, '2026-10-14', input, now)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect((await getHabit(db, owner, habit.id)).logs).toHaveLength(1);
  });
  it('archives and restores without deleting notes, then deletes only the owned habit', async () => {
    const habit = await create();
    await recordHabit(db, owner, habit.id, '2026-10-14', { expectedVersion: 0, habitVersion: 1, value: 2, status: 'RECORDED', note: 'Keep this note', mood: null }, now);
    const archived = await archiveHabit(db, owner, habit.id, { expectedVersion: 1 }, true, now);
    expect(archived.pauses).toEqual([{ from: '2026-10-15', to: null }]);
    const restored = await archiveHabit(db, owner, habit.id, { expectedVersion: 2 }, false, new Date('2026-10-20T12:00:00Z'));
    expect(restored.pauses).toEqual([{ from: '2026-10-15', to: '2026-10-20' }]);
    expect((await getHabit(db, owner, habit.id)).logs[0].note).toBe('Keep this note');
    await expect(deleteHabit(db, stranger, habit.id, { expectedVersion: 3 })).rejects.toMatchObject({ status: 404 });
    await deleteHabit(db, owner, habit.id, { expectedVersion: 3 });
    expect(await db.habit_log.count({ where: { habitId: habit.id } })).toBe(0);
    expect(await db.appuser.count()).toBe(previousUserCount + 2);
  });
  it('only reorders the complete owned active list', async () => {
    const rows = await db.habit.findMany({ where: { userId: owner, archivedAt: null }, orderBy: { sortOrder: 'asc' } });
    const ids = rows.map(row => row.id).reverse(); await reorderHabits(db, owner, ids);
    expect((await listHabits(db, owner, '2026-10-01', '2026-10-31')).filter(habit => !habit.archivedAt).map(habit => habit.id)).toEqual(ids);
    await expect(reorderHabits(db, stranger, ids)).rejects.toMatchObject({ status: 409 });
  });
  it('enforces real signed sessions, CSRF origins and request validation on HTTP routes', async () => {
    const app = express(); app.use(express.json()); app.use(attachSession(db));
    app.get('/login/:id', (req, res) => { issueSession(res, req.params.id as string); res.end(); });
    app.use('/habits', createHabitsRouter(db)); const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address() as { port: number }, base = `http://127.0.0.1:${address.port}`;
    try {
      expect((await fetch(`${base}/habits`)).status).toBe(401);
      const cookie = (await fetch(`${base}/login/${owner}`)).headers.get('set-cookie')!.split(';')[0];
      const send = (origin: string, body: unknown) => fetch(`${base}/habits`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      expect((await send('https://untrusted.example', { ...draft, requestKey: randomUUID() })).status).toBe(403);
      const trustedOrigin = process.env.APP_ORIGINS!.split(',')[0];
      expect((await send(trustedOrigin, { ...draft, requestKey: randomUUID(), userId: stranger })).status).toBe(400);
      expect((await send(trustedOrigin, { ...draft, requestKey: randomUUID() })).status).toBe(201);
      const exported = await fetch(`${base}/habits/export`, { headers: { Cookie: cookie } });
      expect(exported.status).toBe(200); expect(await exported.json()).toMatchObject({ format: 'do100x-habits' });
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});
