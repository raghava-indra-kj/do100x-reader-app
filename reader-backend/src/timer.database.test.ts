import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addTaskSession, deleteTaskSession, discardTaskTimer, editTaskSession, pauseTaskTimer, readActiveTimer, startTaskTimer, stopTaskTimer } from './timer-service';
import { softDeleteHierarchyTasks, taskHierarchyTransaction } from './task-hierarchy';
import { timeAnalytics } from './time-analytics';

describe.skipIf(process.env.CALENDAR_DATABASE_TEST !== '1')('transactional timers on isolated MySQL', () => {
  const db = new PrismaClient();
  let owner: string, stranger: string, first: string, second: string;
  const at = (seconds: number) => new Date(Date.parse('2026-10-14T09:00:00Z') + seconds * 1000);
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Refusing a non-isolated timer database.');
    owner = (await db.appuser.create({ data: { email: `${randomUUID()}@example.test` } })).id;
    stranger = (await db.appuser.create({ data: { email: `${randomUUID()}@example.test` } })).id;
  });
  beforeEach(async () => {
    await db.active_timer.deleteMany({ where: { userId: owner } });
    const task = async () => (await db.task.create({ data: { userId: owner, title: randomUUID(), createdAt: at(0), updatedAt: at(0) } })).id;
    first = await task(); second = await task();
  });
  afterAll(async () => { await db.$disconnect(); });
  it('deduplicates repeated starts and preserves the original run through pause/resume', async () => {
    const started = await startTaskTimer(db, owner, { taskId: first, expectedTimerId: null }, at(0));
    const again = await startTaskTimer(db, owner, { taskId: first, expectedTimerId: null }, at(20));
    expect(again.timer.id).toBe(started.timer.id); expect(again.timer.currentElapsedSeconds).toBe(20);
    await pauseTaskTimer(db, owner, { expectedTimerId: started.timer.id }, true, at(30));
    await pauseTaskTimer(db, owner, { expectedTimerId: started.timer.id }, true, at(90));
    await pauseTaskTimer(db, owner, { expectedTimerId: started.timer.id }, false, at(120));
    const saved = await stopTaskTimer(db, owner, { expectedTimerId: started.timer.id }, at(150));
    expect(saved.session).toMatchObject({ startTime: at(0).toISOString(), endTime: at(150).toISOString(), durationSeconds: 60 });
    expect(saved.taskTotalTimeSeconds).toBe(60);
  });
  it('saves a previous timer once when switching and prevents stale-tab actions', async () => {
    const previous = await startTaskTimer(db, owner, { taskId: first }, at(0));
    const current = await startTaskTimer(db, owner, { taskId: second, expectedTimerId: previous.timer.id }, at(60));
    expect(current.timer.id).not.toBe(previous.timer.id);
    await expect(pauseTaskTimer(db, owner, { expectedTimerId: previous.timer.id }, true, at(90))).rejects.toMatchObject({ status: 409 });
    await expect(discardTaskTimer(db, owner, { expectedTimerId: previous.timer.id })).rejects.toMatchObject({ status: 409 });
    const retry = await stopTaskTimer(db, owner, { expectedTimerId: previous.timer.id }, at(90));
    expect(retry.session.durationSeconds).toBe(60);
    expect((await readActiveTimer(db, owner, at(90))).timer?.id).toBe(current.timer.id);
    expect(await db.time_session.count({ where: { userId: owner, taskId: first } })).toBe(1);
  });
  it('serializes simultaneous start and stop requests without duplicates', async () => {
    const starts = await Promise.all([startTaskTimer(db, owner, { taskId: first, expectedTimerId: null }, at(0)), startTaskTimer(db, owner, { taskId: first, expectedTimerId: null }, at(0))]);
    expect(starts[0].timer.id).toBe(starts[1].timer.id);
    const stops = await Promise.all([stopTaskTimer(db, owner, { expectedTimerId: starts[0].timer.id }, at(30)), stopTaskTimer(db, owner, { expectedTimerId: starts[0].timer.id }, at(30))]);
    expect(stops[0].session.id).toBe(stops[1].session.id);
    expect(await db.time_session.count({ where: { userId: owner, taskId: first } })).toBe(1);
  });
  it('validates manual ranges, preserves exact timestamps on notes edits and detects conflicts', async () => {
    const input = { startTime: at(0).toISOString(), durationSeconds: 65, notes: 'Original', requestKey: randomUUID() };
    const saved = await addTaskSession(db, owner, first, input, at(100));
    expect((await addTaskSession(db, owner, first, input, at(101))).session.id).toBe(saved.session.id);
    await expect(addTaskSession(db, owner, first, { ...input, durationSeconds: 66 })).rejects.toMatchObject({ status: 409 });
    for (const patch of [{ startTime: 'bad' }, { durationSeconds: -1 }, { durationSeconds: 1.1 }, { endTime: at(20).toISOString() }]) await expect(addTaskSession(db, owner, first, { ...input, ...patch })).rejects.toMatchObject({ status: 400 });
    const edited = await editTaskSession(db, owner, saved.session.id, { notes: '', expectedUpdatedAt: saved.session.updatedAt }, at(200));
    expect(edited.session).toMatchObject({ startTime: input.startTime, durationSeconds: 65, notes: '' });
    await expect(editTaskSession(db, owner, saved.session.id, { notes: 'stale', expectedUpdatedAt: saved.session.updatedAt }, at(210))).rejects.toMatchObject({ status: 409 });
    await expect(deleteTaskSession(db, stranger, saved.session.id, {})).rejects.toMatchObject({ status: 404 });
    await deleteTaskSession(db, owner, saved.session.id, { expectedUpdatedAt: edited.session.updatedAt });
    expect((await db.task.findUniqueOrThrow({ where: { id: first } })).totalTimeSeconds).toBe(0);
  });
  it('adds simultaneous manual entries without losing task totals', async () => {
    await Promise.all([30, 60, 90].map(durationSeconds => addTaskSession(db, owner, first, { startTime: at(0).toISOString(), durationSeconds, requestKey: randomUUID() })));
    expect((await db.task.findUniqueOrThrow({ where: { id: first } })).totalTimeSeconds).toBe(180);
  });
  it('preserves live elapsed time and existing logs when deleting a task tree', async () => {
    await addTaskSession(db, owner, first, { startTime: at(0).toISOString(), durationSeconds: 30 });
    const timer = await startTaskTimer(db, owner, { taskId: first }, new Date(Date.now() - 60_000));
    await taskHierarchyTransaction(db, tx => softDeleteHierarchyTasks(tx, owner, [first]));
    const session = await db.time_session.findUniqueOrThrow({ where: { id: timer.timer.id } });
    expect(session.durationSeconds).toBeGreaterThanOrEqual(60);
    expect(await db.time_session.count({ where: { userId: owner, taskId: first } })).toBe(2);
    expect((await db.task.findUniqueOrThrow({ where: { id: first } })).totalTimeSeconds).toBeGreaterThanOrEqual(90);
    expect((await readActiveTimer(db, owner)).active).toBe(false);
  });
  it('cannot start timers or add time against another account’s task', async () => {
    await expect(startTaskTimer(db, stranger, { taskId: first })).rejects.toMatchObject({ status: 404 });
    await expect(addTaskSession(db, stranger, first, { startTime: at(0).toISOString(), durationSeconds: 60 })).rejects.toMatchObject({ status: 404 });
  });
  it('reports caller-local days and uses matching count/total filters, preserving deleted titles', async () => {
    const list = await db.task_list.create({ data: { userId: owner, name: 'Research', createdAt: at(0), updatedAt: at(0) } });
    await db.task.update({ where: { id: first }, data: { listId: list.id, title: 'Preserved title' } });
    await addTaskSession(db, owner, first, { startTime: '2026-10-14T20:00:00Z', durationSeconds: 120 });
    await addTaskSession(db, owner, second, { startTime: '2026-10-14T20:00:00Z', durationSeconds: 60 });
    await db.task.update({ where: { id: first }, data: { deletedAt: at(300) } });
    const report = await timeAnalytics(db, owner, { startDate: '2026-10-15', endDate: '2026-10-15', timeZone: 'Asia/Kolkata', listId: list.id }, at(0));
    expect(report).toMatchObject({ totalSeconds: 120, sessionsCount: 1, dailyTimeline: { '2026-10-15': 120 }, byTask: [{ title: 'Preserved title', listName: 'Research', deleted: true }] });
    await expect(timeAnalytics(db, owner, { startDate: '2026-02-30', endDate: '2026-03-01' })).rejects.toMatchObject({ status: 400 });
    await expect(timeAnalytics(db, owner, { startDate: '2026-10-15' })).rejects.toMatchObject({ status: 400 });
  });
});
