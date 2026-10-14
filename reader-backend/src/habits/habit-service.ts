import { createHash, randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, habit as HabitRow, habit_log as LogRow } from '@prisma/client';
import { addDays, dayDiff, localDate, monday, planOn, scheduled, type Habit, type HabitLog, type HabitPlan } from '@reader/habit-core';
import { completeInput, createHabitInput, editHabitInput, habitPlanInput, logInput, versionInput } from './habit-contract';

type Database = PrismaClient;
type Transaction = Prisma.TransactionClient;
export class HabitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function logDto(row: LogRow): HabitLog {
  return { id: row.id, habitId: row.habitId, date: row.date, value: Number(row.value), status: row.status as HabitLog['status'], note: row.note, mood: row.mood, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export function habitDto(row: HabitRow & { logs?: LogRow[] }): Habit {
  return { id: row.id, name: row.name, description: row.description, icon: row.icon, color: row.color, section: row.section, timezone: row.timezone, sortOrder: row.sortOrder, version: row.version, archivedAt: row.archivedAt?.toISOString() ?? null, plans: row.plans as unknown as HabitPlan[], pauses: row.pauses as unknown as Habit['pauses'], logs: (row.logs ?? []).map(logDto), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
const json = (value: unknown) => value as Prisma.InputJsonValue;
async function lockAccount(tx: Transaction, userId: string) {
  await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
}
async function owned(tx: Transaction, userId: string, id: string, version?: number) {
  const row = await tx.habit.findFirst({ where: { id, userId } });
  if (!row) throw new HabitError(404, 'Habit not found.');
  if (version !== undefined && row.version !== version) throw new HabitError(409, 'This habit changed in another tab. Refresh it before saving.');
  return row;
}
export async function listHabits(db: Database, userId: string, from: string, to: string) {
  if (from > to || dayDiff(from, to) >= 366) throw new HabitError(400, 'Choose a range of up to one year.');
  return (await db.habit.findMany({ where: { userId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { logs: { where: { date: { gte: from, lte: to } }, orderBy: { date: 'asc' } } } })).map(habitDto);
}
export async function getHabit(db: Database, userId: string, id: string) {
  const row = await db.habit.findFirst({ where: { id, userId }, include: { logs: { orderBy: { date: 'asc' } } } });
  if (!row) throw new HabitError(404, 'Habit not found.');
  return habitDto(row);
}
export async function createHabit(db: Database, userId: string, raw: unknown, now = new Date()) {
  const { requestKey, plan, ...metadata } = createHabitInput.parse(raw);
  const today = localDate(metadata.timezone, now);
  if (plan.startDate < addDays(today, -3650) || plan.startDate > addDays(today, 365)) throw new HabitError(400, 'Start within the last ten years or the next year.');
  const requestHash = createHash('sha256').update(JSON.stringify({ ...metadata, plan })).digest('hex');
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    const existing = await tx.habit.findUnique({ where: { userId_requestKey: { userId, requestKey } } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new HabitError(409, 'This create request was already used for a different habit.');
      return habitDto(existing);
    }
    if (await tx.habit.count({ where: { userId } }) >= 250) throw new HabitError(409, 'Your account has 250 habits. Export and remove an unused habit before adding another.');
    const last = await tx.habit.aggregate({ where: { userId }, _max: { sortOrder: true } });
    return habitDto(await tx.habit.create({ data: { id: randomUUID(), userId, requestKey, requestHash, ...metadata, sortOrder: (last._max.sortOrder ?? -1) + 1, plans: json([{ ...plan, id: randomUUID(), effectiveFrom: plan.startDate }]), pauses: [], createdAt: now, updatedAt: now } }));
  });
}
export async function editHabit(db: Database, userId: string, id: string, raw: unknown, now = new Date()) {
  const { expectedVersion, plan, ...metadata } = editHabitInput.parse(raw);
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    const row = await owned(tx, userId, id, expectedVersion), habit = habitDto(row);
    if (row.archivedAt) throw new HabitError(409, 'Restore this habit before editing it.');
    if (metadata.timezone !== row.timezone) throw new HabitError(400, 'The timezone stays fixed so saved calendar dates do not move. Create a new habit to use a different timezone.');
    const latest = habit.plans[habit.plans.length - 1], today = localDate(row.timezone, now);
    if (plan.startDate !== habit.plans[0].startDate) throw new HabitError(400, 'The start date stays fixed to preserve your history.');
    const { id: _id, effectiveFrom: _effective, ...previous } = latest;
    let plans = habit.plans;
    const { reminders: _oldReminders, ...oldSchedule } = habitPlanInput.parse(previous);
    const { reminders: _newReminders, ...newSchedule } = plan;
    if (JSON.stringify(oldSchedule) !== JSON.stringify(newSchedule)) {
      const weekly = plan.frequency === 'WEEKLY' || (planOn(habit, today) ?? latest).frequency === 'WEEKLY';
      let effectiveFrom = weekly ? addDays(monday(today), 7) : addDays(today, 1);
      if (habit.plans[0].startDate > today) effectiveFrom = habit.plans[0].startDate;
      if (plan.endDate && plan.endDate < effectiveFrom) throw new HabitError(400, `The new end date must be ${effectiveFrom} or later.`);
      plans = [...habit.plans.filter(item => item.effectiveFrom <= today), { ...plan, id: randomUUID(), effectiveFrom }];
    }
    // Reminder preferences take effect now; they do not change the meaning of saved check-ins.
    plans = plans.map(item => ({ ...item, reminders: plan.reminders }));
    return habitDto(await tx.habit.update({ where: { id }, data: { ...metadata, plans: json(plans), version: { increment: 1 }, updatedAt: now } }));
  });
}
export async function recordHabit(db: Database, userId: string, id: string, date: string, raw: unknown, now = new Date()) {
  const input = logInput.parse(raw);
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    return recordInTransaction(tx, userId, id, date, input, now);
  });
}
async function recordInTransaction(tx: Transaction, userId: string, id: string, date: string, input: ReturnType<typeof logInput.parse>, now: Date) {
    const row = await owned(tx, userId, id, input.habitVersion), habit = habitDto(row), today = localDate(row.timezone, now);
    if (row.archivedAt) throw new HabitError(409, 'Restore this habit to change a check-in.');
    if (date > today) throw new HabitError(400, 'Future days cannot be checked in.');
    const existing = await tx.habit_log.findUnique({ where: { habitId_date: { habitId: id, date } } });
    if ((existing?.version ?? 0) !== input.expectedVersion) throw new HabitError(409, 'This check-in changed in another tab. Refresh before saving.');
    const plan = planOn(habit, date);
    if (!plan || (!scheduled(habit, date) && !existing)) throw new HabitError(400, 'This habit is not scheduled for that day.');
    if (plan.goalType === 'CHECK' && input.value !== 0 && input.value !== 1) throw new HabitError(400, 'Check-off habits use a value of zero or one.');
    const data = { value: input.value, status: input.status, note: input.note, mood: input.mood, updatedAt: now };
    // Clearing retains a versioned empty record to reject stale requests after undo.
    const result = existing
      ? await tx.habit_log.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } })
      : await tx.habit_log.create({ data: { id: randomUUID(), habitId: id, userId, date, ...data, createdAt: now } });
    return logDto(result);
}
export async function completeHabits(db: Database, userId: string, raw: unknown, now = new Date()) {
  const { date, items } = completeInput.parse(raw);
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    const results: HabitLog[] = [];
    for (const item of items) {
      const habit = habitDto(await owned(tx, userId, item.id, item.habitVersion));
      const plan = planOn(habit, date);
      if (!plan || !scheduled(habit, date)) throw new HabitError(400, 'Only scheduled habits can be completed.');
      const previous = await tx.habit_log.findUnique({ where: { habitId_date: { habitId: item.id, date } } });
      if (previous?.status === 'SKIPPED') throw new HabitError(409, 'A selected habit was skipped. Refresh before completing the list.');
      results.push(await recordInTransaction(tx, userId, item.id, date, { ...item, value: Math.max(Number(previous?.value ?? 0), plan.target), status: 'RECORDED', note: previous?.note ?? '', mood: previous?.mood ?? null }, now));
    }
    return results;
  }, { timeout: 30_000 });
}
export async function archiveHabit(db: Database, userId: string, id: string, raw: unknown, archived: boolean, now = new Date()) {
  const { expectedVersion } = versionInput.parse(raw);
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    const row = await owned(tx, userId, id, expectedVersion), habit = habitDto(row), today = localDate(row.timezone, now);
    if (Boolean(row.archivedAt) === archived) return habit;
    const pauses = archived ? [...habit.pauses, { from: addDays(today, 1), to: null }]
      : habit.pauses.map(pause => pause.to === null ? { ...pause, to: today } : pause).filter(pause => !pause.to || pause.from < pause.to);
    return habitDto(await tx.habit.update({ where: { id }, data: { archivedAt: archived ? now : null, pauses: json(pauses), version: { increment: 1 }, updatedAt: now } }));
  });
}
export async function deleteHabit(db: Database, userId: string, id: string, raw: unknown) {
  const { expectedVersion } = versionInput.parse(raw);
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    await owned(tx, userId, id, expectedVersion);
    await tx.habit.delete({ where: { id } });
  });
}
export async function reorderHabits(db: Database, userId: string, ids: string[]) {
  return db.$transaction(async tx => {
    await lockAccount(tx, userId);
    const rows = await tx.habit.findMany({ where: { userId, archivedAt: null }, select: { id: true } });
    if (ids.length !== rows.length || new Set(ids).size !== ids.length || rows.some(row => !ids.includes(row.id))) throw new HabitError(409, 'Your habit list changed. Refresh it before reordering.');
    for (const [sortOrder, id] of ids.entries()) await tx.habit.update({ where: { id }, data: { sortOrder, version: { increment: 1 } } });
  });
}
export async function exportHabits(db: Database, userId: string) {
  return { format: 'do100x-habits', version: 1, exportedAt: new Date().toISOString(), habits: (await db.habit.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' }, include: { logs: { orderBy: { date: 'asc' } } } })).map(habitDto) };
}
