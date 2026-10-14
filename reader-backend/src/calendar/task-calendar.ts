import { randomUUID } from 'node:crypto';
import type { Prisma, task } from '@prisma/client';
import { addWallMinutes, nextPendingOccurrence, occurrenceAt, scheduleError, wallMinutes, type Occurrence } from '@reader/calendar-core';
import { TaskHierarchyError } from '../task-errors';
import { eventDto, syncTaskSchedule } from './calendar-service';

/** Called inside the same transaction as every HTTP/MCP task mutation. */
export async function applyTaskCalendarChanges(tx: Prisma.TransactionClient, userId: string, before: task, changes: Record<string, unknown>) {
  if (!['title', 'status', 'dueDate', 'dueTime'].some(key => key in changes)) return;
  const rows = await tx.calendar_event.findMany({ where: { userId, taskId: before.id, deletedAt: null }, include: { exceptions: true } });
  if (!rows.length) return;
  if (typeof changes.title === 'string') await tx.calendar_event.updateMany({ where: { userId, taskId: before.id, deletedAt: null }, data: { title: changes.title, version: { increment: 1 } } });
  if (changes.dueDate === null) {
    await tx.calendar_event.updateMany({ where: { userId, taskId: before.id, deletedAt: null }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    return;
  }
  const candidates = rows.map(row => ({ row, next: nextPendingOccurrence(eventDto(row)) })).filter((item): item is typeof item & { next: Occurrence } => !!item.next).sort((a, b) => a.next.startInstant.localeCompare(b.next.startInstant));
  const completed = rows.flatMap(row => row.exceptions).filter(item => item.completed && !item.cancelled).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  let target: typeof candidates[number] | undefined = candidates[0];
  // Editing or reopening a finished task must move its actual last occurrence,
  // rather than changing only the task's due fields while its calendar stays behind.
  if (!target && before.status === 'done' && completed) {
    const row = rows.find(row => row.id === completed.eventId)!;
    const next = occurrenceAt(eventDto(row), completed.date);
    if (next) target = { row, next };
  }
  if (target && (changes.dueDate !== undefined || changes.dueTime !== undefined)) {
    const date = changes.dueDate instanceof Date ? changes.dueDate.toISOString().slice(0, 10) : target.next.start.slice(0, 10);
    const dueTime = changes.dueTime === undefined ? (target.next.allDay ? null : target.next.start.slice(11)) : changes.dueTime;
    const allDay = !dueTime, start = `${date}T${dueTime || '00:00'}`;
    const duration = allDay ? Math.max(1440, Math.ceil(wallMinutes(target.next.start, target.next.end) / 1440) * 1440) : target.next.allDay ? 30 : wallMinutes(target.next.start, target.next.end);
    const end = addWallMinutes(start, duration);
    const error = scheduleError({ start, end, allDay, timeZone: target.row.timeZone, repeat: null });
    if (error) throw new TaskHierarchyError(400, error);
    await tx.calendar_occurrence.upsert({ where: { eventId_date: { eventId: target.row.id, date: target.next.date } }, create: { id: randomUUID(), userId, eventId: target.row.id, date: target.next.date, startLocal: start, endLocal: end, allDay }, update: { startLocal: start, endLocal: end, allDay, version: { increment: 1 } } });
    await tx.calendar_event.update({ where: { id: target.row.id }, data: { version: { increment: 1 } } });
    Object.assign(target.next, { start, end, allDay });
  }
  if (changes.status === 'done' && before.status !== 'done' && target) {
    const { next, row } = target;
    await tx.calendar_occurrence.upsert({ where: { eventId_date: { eventId: row.id, date: next.date } }, create: { id: randomUUID(), userId, eventId: row.id, date: next.date, startLocal: next.start, endLocal: next.end, allDay: next.allDay, completed: true }, update: { completed: true, cancelled: false, version: { increment: 1 } } });
    await tx.calendar_event.update({ where: { id: row.id }, data: { version: { increment: 1 } } });
  } else if ((changes.status === 'todo' || changes.status === 'in_progress') && before.status === 'done') {
    // Reopen the most recently completed instance, preserving the rest of the series.
    if (completed) {
      await tx.calendar_occurrence.update({ where: { id: completed.id }, data: { completed: false, version: { increment: 1 } } });
      await tx.calendar_event.update({ where: { id: completed.eventId }, data: { version: { increment: 1 } } });
    }
  }
  if (changes.status !== undefined || changes.dueDate !== undefined || changes.dueTime !== undefined) await syncTaskSchedule(tx, userId, before.id);
}
