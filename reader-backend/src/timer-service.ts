import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, active_timer, time_session } from '@prisma/client';
import { z } from 'zod';
import { accountTransaction } from './account-transaction';
import { parseTaskInput } from './task-contract';
import { TaskHierarchyError } from './task-errors';

type Tx = Prisma.TransactionClient;
const notesInput = z.string().max(15000).nullable().optional();
const durationInput = z.number().int().positive().max(366 * 86400);
const instantInput = z.string().datetime({ offset: true }).transform(value => new Date(value));
const timerIdentity = z.object({ expectedTimerId: z.string().uuid().nullable().optional() });
const startInput = timerIdentity.extend({ taskId: z.string().min(1).max(36), notes: notesInput }).strict();
const stopInput = timerIdentity.extend({ notes: notesInput, durationSeconds: durationInput.optional() }).strict();
const sessionFields = z.object({ startTime: instantInput, endTime: instantInput.nullable().optional(), durationSeconds: durationInput, notes: notesInput });
const createSessionInput = sessionFields.extend({ requestKey: z.string().uuid().optional() }).strict();
const editSessionInput = sessionFields.partial().extend({ expectedUpdatedAt: instantInput.optional() }).strict();
const sessionVersionInput = z.object({ expectedUpdatedAt: instantInput.optional() }).strict();

export const elapsedSeconds = (active: active_timer, now = new Date()) => active.accumulatedSeconds + (active.isPaused ? 0 : Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000)));
async function ownTask(tx: Tx, userId: string, taskId: string) {
  const task = await tx.task.findFirst({ where: { id: taskId, userId, deletedAt: null } });
  if (!task) throw new TaskHierarchyError(404, 'Task not found.'); return task;
}
export async function recalculateTaskTime(tx: Tx, userId: string, taskId: string) {
  const total = (await tx.time_session.aggregate({ where: { userId, taskId }, _sum: { durationSeconds: true } }))._sum.durationSeconds ?? 0;
  if (total > 2_147_483_647) throw new TaskHierarchyError(400, 'The task’s total exceeds the supported time limit.');
  await tx.task.updateMany({ where: { userId, id: taskId }, data: { totalTimeSeconds: total, updatedAt: new Date(), version: { increment: 1 } } });
  return total;
}
function assertTimer(active: active_timer | null, expected: string | null | undefined) {
  if (expected !== undefined && (active?.id ?? null) !== expected) throw new TaskHierarchyError(409, 'The active timer changed in another tab. Refresh before changing it.');
  if (!active) throw new TaskHierarchyError(404, 'There is no active timer.');
  return active;
}
async function timerDto(db: Tx, userId: string, active: active_timer, now: Date) {
  const task = await db.task.findFirst({ where: { id: active.taskId, userId } });
  return { id: active.id, taskId: active.taskId, taskTitle: task?.title ?? 'Deleted task', taskPriority: task?.priority ?? 4, listId: task?.listId ?? null, startTime: active.startTime.toISOString(), startedAt: active.createdAt.toISOString(), accumulatedSeconds: active.accumulatedSeconds, currentElapsedSeconds: elapsedSeconds(active, now), isPaused: active.isPaused, pausedAt: active.pausedAt?.toISOString() ?? null, notes: active.notes };
}
export async function readActiveTimer(db: PrismaClient, userId: string, now = new Date()) {
  const active = await db.active_timer.findUnique({ where: { userId } });
  return { active: !!active, timer: active ? await timerDto(db, userId, active, now) : null };
}
export function sessionDto(row: time_session) {
  return { id: row.id, taskId: row.taskId, startTime: row.startTime.toISOString(), endTime: row.endTime?.toISOString() ?? null, durationSeconds: row.durationSeconds, notes: row.notes, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export async function finishTimer(tx: Tx, userId: string, active: active_timer, input: { notes?: string | null; durationSeconds?: number }, now: Date) {
  const duration = input.durationSeconds ?? Math.max(1, elapsedSeconds(active, now));
  parseTaskInput(durationInput, duration);
  const endTime = active.isPaused ? active.pausedAt ?? now : now;
  // createdAt identifies the run; startTime identifies only the latest resumed segment.
  const startTime = new Date(Math.min(active.createdAt.getTime(), endTime.getTime() - duration * 1000));
  const session = await tx.time_session.create({ data: { id: active.id, userId, taskId: active.taskId, startTime, endTime, durationSeconds: duration, notes: input.notes === undefined ? active.notes : input.notes, createdAt: now, updatedAt: now } });
  await tx.active_timer.delete({ where: { userId } });
  return { success: true, session: sessionDto(session), taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, active.taskId) };
}
export async function startTaskTimer(db: PrismaClient, userId: string, raw: unknown, now = new Date()) {
  const input = parseTaskInput(startInput, raw);
  return accountTransaction(db, userId, async tx => {
    await ownTask(tx, userId, input.taskId);
    const active = await tx.active_timer.findUnique({ where: { userId } });
    // A repeated Start on the same task must never reset elapsed work.
    if (active?.taskId === input.taskId && (input.expectedTimerId === undefined || input.expectedTimerId === null || input.expectedTimerId === active.id)) return { success: true, timer: await timerDto(tx, userId, active, now) };
    if (input.expectedTimerId !== undefined && (active?.id ?? null) !== input.expectedTimerId) throw new TaskHierarchyError(409, 'The active timer changed. Refresh before starting another task.');
    if (active) await finishTimer(tx, userId, active, {}, now);
    const timer = await tx.active_timer.create({ data: { id: randomUUID(), userId, taskId: input.taskId, startTime: now, notes: input.notes ?? null, createdAt: now, updatedAt: now } });
    return { success: true, timer: await timerDto(tx, userId, timer, now) };
  });
}
export async function pauseTaskTimer(db: PrismaClient, userId: string, raw: unknown, pause: boolean, now = new Date()) {
  const input = parseTaskInput(timerIdentity.strict(), raw ?? {});
  return accountTransaction(db, userId, async tx => {
    const active = assertTimer(await tx.active_timer.findUnique({ where: { userId } }), input.expectedTimerId);
    const updated = active.isPaused === pause ? active : await tx.active_timer.update({ where: { userId }, data: pause ? { accumulatedSeconds: elapsedSeconds(active, now), isPaused: true, pausedAt: now, updatedAt: now } : { startTime: now, isPaused: false, pausedAt: null, updatedAt: now } });
    return { success: true, timer: await timerDto(tx, userId, updated, now) };
  });
}
export async function stopTaskTimer(db: PrismaClient, userId: string, raw: unknown, now = new Date()) {
  const input = parseTaskInput(stopInput, raw ?? {});
  return accountTransaction(db, userId, async tx => {
    if (input.expectedTimerId) {
      const previous = await tx.time_session.findFirst({ where: { id: input.expectedTimerId, userId } });
      if (previous) return { success: true, session: sessionDto(previous), taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, previous.taskId) };
    }
    const active = assertTimer(await tx.active_timer.findUnique({ where: { userId } }), input.expectedTimerId);
    return finishTimer(tx, userId, active, input, now);
  });
}
export async function discardTaskTimer(db: PrismaClient, userId: string, raw: unknown) {
  const input = parseTaskInput(timerIdentity.strict(), raw ?? {});
  return accountTransaction(db, userId, async tx => {
    const active = await tx.active_timer.findUnique({ where: { userId } });
    if (!active) return { success: true };
    assertTimer(active, input.expectedTimerId);
    await tx.active_timer.delete({ where: { userId } }); return { success: true };
  });
}
function sessionRange(startTime: Date, endTime: Date | null | undefined, durationSeconds: number) {
  const end = endTime ?? new Date(startTime.getTime() + durationSeconds * 1000);
  if (end <= startTime || durationSeconds * 1000 > end.getTime() - startTime.getTime()) throw new TaskHierarchyError(400, 'The time range must contain the recorded duration.');
  return { startTime, endTime: end, durationSeconds };
}
export async function addTaskSession(db: PrismaClient, userId: string, taskId: string, raw: unknown, now = new Date()) {
  const input = parseTaskInput(createSessionInput, raw), range = sessionRange(input.startTime, input.endTime, input.durationSeconds);
  return accountTransaction(db, userId, async tx => {
    await ownTask(tx, userId, taskId);
    const previous = input.requestKey ? await tx.time_session.findUnique({ where: { id: input.requestKey } }) : null;
    if (previous && (previous.userId !== userId || previous.taskId !== taskId || previous.startTime.getTime() !== range.startTime.getTime() || previous.endTime?.getTime() !== range.endTime.getTime() || previous.durationSeconds !== range.durationSeconds || previous.notes !== (input.notes ?? null))) throw new TaskHierarchyError(409, 'This time-entry request was already used. Reopen the editor to add another.');
    const row = previous ?? await tx.time_session.create({ data: { id: input.requestKey ?? randomUUID(), userId, taskId, ...range, notes: input.notes ?? null, createdAt: now, updatedAt: now } });
    return { session: sessionDto(row), taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, taskId) };
  });
}
export async function editTaskSession(db: PrismaClient, userId: string, id: string, raw: unknown, now = new Date()) {
  const input = parseTaskInput(editSessionInput, raw);
  return accountTransaction(db, userId, async tx => {
    const existing = await tx.time_session.findFirst({ where: { id, userId } });
    if (!existing) throw new TaskHierarchyError(404, 'Time entry not found.');
    if (input.expectedUpdatedAt && input.expectedUpdatedAt.getTime() !== existing.updatedAt.getTime()) throw new TaskHierarchyError(409, 'This time entry changed. Reload before editing.');
    const startTime = input.startTime ?? existing.startTime, duration = input.durationSeconds ?? existing.durationSeconds;
    const endTime = input.endTime === undefined && (input.startTime !== undefined || input.durationSeconds !== undefined) ? null : input.endTime === undefined ? existing.endTime : input.endTime;
    const range = sessionRange(startTime, endTime, duration);
    const row = await tx.time_session.update({ where: { id }, data: { ...range, ...(input.notes === undefined ? {} : { notes: input.notes }), updatedAt: new Date(Math.max(now.getTime(), existing.updatedAt.getTime() + 1)) } });
    return { session: sessionDto(row), taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, existing.taskId) };
  });
}
export async function deleteTaskSession(db: PrismaClient, userId: string, id: string, raw: unknown) {
  const input = parseTaskInput(sessionVersionInput, raw ?? {});
  return accountTransaction(db, userId, async tx => {
    const row = await tx.time_session.findFirst({ where: { id, userId } });
    if (!row) throw new TaskHierarchyError(404, 'Time entry not found.');
    if (input.expectedUpdatedAt && input.expectedUpdatedAt.getTime() !== row.updatedAt.getTime()) throw new TaskHierarchyError(409, 'This time entry changed. Reload before deleting.');
    await tx.time_session.delete({ where: { id } });
    return { success: true, deletedSessionId: id, taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, row.taskId) };
  });
}
export async function deleteTaskSessions(db: PrismaClient, userId: string, taskId: string) {
  return accountTransaction(db, userId, async tx => {
    await ownTask(tx, userId, taskId); await tx.time_session.deleteMany({ where: { userId, taskId } });
    return { success: true, deletedForTaskId: taskId, taskTotalTimeSeconds: await recalculateTaskTime(tx, userId, taskId) };
  });
}
