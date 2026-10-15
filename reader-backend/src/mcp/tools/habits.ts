import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { dateRange, dayDiff, dayStatus, habitStats, localDate, quantityTotals, weekProgress } from '@reader/habit-core';
import { prisma } from '../../prisma';
import { completeInput, createHabitInput, dateInput, editHabitInput, logInput, versionInput } from '../../habits/habit-contract';
import { archiveHabit, completeHabits, createHabit, deleteHabit, editHabit, exportHabits, getHabit, listHabits, recordHabit, reorderHabits } from '../../habits/habit-service';
import { createOnce, readOnly, registerFeatureTool as register } from './feature-tool';

const id = z.string().uuid();
const range = z.object({ from: dateInput, to: dateInput }).strict().refine(value => value.from <= value.to && dayDiff(value.from, value.to) < 366, 'Choose an inclusive range of up to 366 days.');

export function registerHabitTools(server: McpServer, userId: string, db: PrismaClient = prisma) {
  register(server, 'reader_list_habits', 'List your active and archived habits in manual order, including plans, pauses and check-ins in an inclusive date range. Dates use each habit’s timezone.', { range }, async ({ range }) => ({ items: await listHabits(db, userId, range.from, range.to) }), readOnly);
  register(server, 'reader_get_habit', 'Get one owned habit with its full check-in history, plan changes, reminders, archive state and current versions.', { habitId: id }, ({ habitId }) => getHabit(db, userId, habitId), readOnly);
  register(server, 'reader_get_habit_progress', 'Get daily status, weekly progress, streaks, completion rate and quantity totals using the same rules as Habits UI. Stats and totals cover history through the earlier of range.to and today in the habit’s timezone; daily rows cover the requested inclusive range.', { habitId: id, range }, async ({ habitId, range }) => {
    const habit = await getHabit(db, userId, habitId), today = localDate(habit.timezone), asOf = range.to < today ? range.to : today;
    return { habitId, ...range, asOf, stats: habitStats(habit, asOf), quantityTotals: quantityTotals(habit, asOf), days: dateRange(range.from, range.to).map(date => ({ date, status: dayStatus(habit, date, asOf), week: weekProgress(habit, date, asOf), log: habit.logs.find(log => log.date === date) ?? null })) };
  }, readOnly);
  register(server, 'reader_create_habit', 'Create a check-off or count habit with daily, weekday, weekly-target or interval scheduling, icon, color, section and reminders. Reuse requestKey only for an exact retry. Reminder delivery still requires the open app and browser permission.', { habit: createHabitInput }, ({ habit }) => createHabit(db, userId, habit), createOnce);
  register(server, 'reader_update_habit', 'Update habit metadata, goal, schedule or reminders with expectedVersion. Timezone and original start date stay fixed; schedule changes preserve history and take effect next day/next week as in the app.', { habitId: id, habit: editHabitInput }, ({ habitId, habit }) => editHabit(db, userId, habitId, habit));
  register(server, 'reader_record_habit', 'Record, edit, skip or clear one check-in. Supply habitVersion and the log’s expectedVersion (0 for a new day). RECORDED supports counts, notes and mood; SKIPPED excuses a day; NONE clears it. Future check-ins are rejected.', { habitId: id, date: dateInput, log: logInput }, ({ habitId, date, log }) => recordHabit(db, userId, habitId, date, log));
  register(server, 'reader_complete_habits', 'Complete selected scheduled habits atomically for one date. Every item needs habitVersion and log expectedVersion (0 if absent). Existing notes, mood and amounts above target are retained; one conflict rolls back all items.', { completion: completeInput }, async ({ completion }) => ({ logs: await completeHabits(db, userId, completion) }));
  register(server, 'reader_archive_habit', 'Archive a habit without deleting its history. Future days are paused. Use the current expectedVersion.', { habitId: id, ...versionInput.shape }, ({ habitId, expectedVersion }) => archiveHabit(db, userId, habitId, { expectedVersion }, true));
  register(server, 'reader_restore_habit', 'Restore an archived habit, retaining check-ins and excluding the archived period from streak expectations. Use the current expectedVersion.', { habitId: id, ...versionInput.shape }, ({ habitId, expectedVersion }) => archiveHabit(db, userId, habitId, { expectedVersion }, false));
  register(server, 'reader_reorder_habits', 'Set manual habit order. Supply every active habit ID exactly once, excluding archived habits. Reload versions after reordering.', { ids: z.array(id).max(250) }, async ({ ids }) => { await reorderHabits(db, userId, ids); return { reordered: true }; });
  register(server, 'reader_export_habits', 'Export your full habit history, plans, pauses and check-ins as do100x-habits JSON, including archived habits.', {}, () => exportHabits(db, userId), readOnly);
  register(server, 'reader_delete_habit', 'Permanently delete an owned habit and its check-ins with expectedVersion. Archive instead when you want to retain history.', { habitId: id, ...versionInput.shape }, async ({ habitId, expectedVersion }) => { await deleteHabit(db, userId, habitId, { expectedVersion }); return { id: habitId, deleted: true }; });
}
