import { addDays, busyMinutes, datesBetween, diffDays, instantAt, nextPendingOccurrence, occurrenceAt, wallAt, weekStart, type CalendarEvent, type Occurrence } from '@reader/calendar-core';
import { dayStatus, localDate, scheduled, type Habit } from '@reader/habit-core';
import type { CalendarPreferences, CalendarRange, CalendarTask, CalendarView, EventDraft, ExternalOccurrence } from './api';

export const viewLabels = { day: 'Day', week: 'Week', month: 'Month', year: 'Year', agenda: 'Agenda' };
export const colors = { orange: '#ea580c', green: '#168454', blue: '#2563eb', violet: '#7c3aed', rose: '#db2777', teal: '#0d9488' };
export const defaultPreferences = (timeZone: string): CalendarPreferences => ({ timeZone, firstDay: 1, defaultView: 'week', workStart: 8, workEnd: 20, workDays: [1, 2, 3, 4, 5], defaultMinutes: 30, showHabits: true, showFocus: false, showCompleted: true, colorBy: 'event' });
export const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export function movePeriod(date: string, view: CalendarView, direction: number) {
  if (view === 'day') return addDays(date, direction);
  if (view === 'week' || view === 'agenda') return addDays(date, direction * (view === 'week' ? 7 : 30));
  const target = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
  target.setUTCMonth(target.getUTCMonth() + direction * (view === 'year' ? 12 : 1));
  return target.toISOString().slice(0, 10);
}
export function viewRange(date: string, view: CalendarView, firstDay: number) {
  if (view === 'day') return { from: date, to: addDays(date, 1) };
  if (view === 'week') { const from = weekStart(date, firstDay); return { from, to: addDays(from, 7) }; }
  if (view === 'month') { const from = weekStart(`${date.slice(0, 7)}-01`, firstDay); return { from, to: addDays(from, 42) }; }
  if (view === 'year') return { from: `${date.slice(0, 4)}-01-01`, to: `${Number(date.slice(0, 4)) + 1}-01-01` };
  return { from: date, to: addDays(date, 30) };
}
export type CalendarItem = { key: string; kind: 'event' | 'task' | 'habit' | 'focus'; title: string; start: string; end: string; allDay: boolean; completed: boolean; color: string; listId: string | null; event?: CalendarEvent; occurrence?: Occurrence; task?: CalendarTask; habit?: Habit; habitDate?: string; notes?: string; durationSeconds?: number; external?: ExternalOccurrence };
export function calendarItems(data: CalendarRange, preferences: CalendarPreferences, now = new Date()): CalendarItem[] {
  const tasks = new Map(data.tasks.map(task => [task.id, task])), events = new Map(data.events.map(event => [event.id, event]));
  const habits = new Map(data.habits.map(habit => [habit.id, habit]));
  const result: CalendarItem[] = data.occurrences.filter(occ => !occ.cancelled).flatMap(occurrence => {
    const event = events.get(occurrence.eventId); if (!event) return [];
    const task = event.taskId ? tasks.get(event.taskId) : undefined, habit = event.habitId ? habits.get(event.habitId) : undefined;
    const kind = habit ? 'habit' : task ? 'task' : 'event';
    const color = preferences.colorBy === 'list' && task?.listId ? data.lists.find(list => list.id === task.listId)?.color : preferences.colorBy === 'priority' && task ? ['#dc2626', '#d97706', '#2563eb', '#64748b'][task.priority - 1] : undefined;
    return [{ key: occurrence.key, kind, title: event.title, start: occurrence.allDay ? occurrence.start : wallAt(occurrence.startInstant, preferences.timeZone), end: occurrence.allDay ? occurrence.end : wallAt(occurrence.endInstant, preferences.timeZone), allDay: occurrence.allDay, completed: habit ? dayStatus(habit, occurrence.start.slice(0, 10), localDate(habit.timezone, now)) === 'done' : occurrence.completed, color: color || colors[event.color as keyof typeof colors] || colors.blue, listId: task?.listId ?? null, event, occurrence, task, habit, habitDate: habit ? occurrence.start.slice(0, 10) : undefined } satisfies CalendarItem];
  });
  const scheduledTasks = new Set(data.events.map(event => event.taskId));
  for (const task of data.tasks) {
    if (!task.dueDate || scheduledTasks.has(task.id) || task.status === 'cancelled') continue;
    // A task deadline is a point in time, not an invented duration or busy block.
    const date = task.dueDate.slice(0, 10), start = `${date}T${task.dueTime || '00:00'}`;
    result.push({ key: `task/${task.id}`, kind: 'task', title: task.title, start, end: task.dueTime ? start : `${addDays(date, 1)}T00:00`, allDay: !task.dueTime, completed: task.status === 'done', color: preferences.colorBy === 'priority' ? ['#dc2626', '#d97706', '#2563eb', '#64748b'][task.priority - 1] : data.lists.find(list => list.id === task.listId)?.color || colors.blue, listId: task.listId, task });
  }
  const reservedHabits = new Set(result.filter(item => item.habit).map(item => `${item.habit!.id}/${item.habitDate}`));
  const dates = datesBetween(data.from, addDays(data.to, -1));
  for (const habit of data.habits) for (const date of dates) {
    if (!scheduled(habit, date) || reservedHabits.has(`${habit.id}/${date}`)) continue;
    result.push({ key: `habit/${habit.id}/${date}`, kind: 'habit', title: habit.name, start: `${date}T00:00`, end: `${addDays(date, 1)}T00:00`, allDay: true, completed: dayStatus(habit, date, localDate(habit.timezone, now)) === 'done', color: colors.green, listId: null, habit, habitDate: date });
  }
  for (const session of data.focus) result.push({ key: `focus/${session.id}`, kind: 'focus', title: session.title, start: wallAt(session.start, preferences.timeZone), end: wallAt(session.end, preferences.timeZone), allDay: false, completed: true, color: colors.violet, listId: session.listId, notes: session.notes ?? '', durationSeconds: session.durationSeconds });
  for (const external of data.external ?? []) result.push({ key: `external/${external.key}`, kind: 'event', title: external.title, start: external.start, end: external.end, allDay: external.allDay, completed: false, color: colors[external.color as keyof typeof colors] || colors.teal, listId: null, external });
  return result.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
export function itemsOn(items: CalendarItem[], date: string) { return items.filter(item => item.start < `${addDays(date, 1)}T00:00` && (item.end > `${date}T00:00` || item.start === item.end && item.start.startsWith(date))); }
export function segmentsOn(items: CalendarItem[], date: string) {
  return itemsOn(items, date).filter(item => !item.allDay).map(item => {
    const startMinute = Math.max(0, (Date.parse(`${item.start}:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 60000);
    const endMinute = Math.min(1440, Math.max(startMinute, (Date.parse(`${item.end}:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 60000));
    return { item, startMinute, endMinute };
  });
}
export function plannedMinutes(items: CalendarItem[], date: string, preferences: CalendarPreferences) {
  return busyMinutes(segmentsOn(items, date).filter(segment => (segment.item.event || segment.item.external) && !segment.item.completed), preferences.workStart * 60, preferences.workEnd * 60);
}
/** Give short blocks readable hit targets without extending past midnight. Real times stay on the item. */
export function displaySegmentsOn(items: CalendarItem[], date: string) {
  return segmentsOn(items, date).map(segment => {
    const startMinute = Math.min(segment.startMinute, 1410);
    return { ...segment, startMinute, endMinute: Math.min(1440, Math.max(startMinute + 30, segment.endMinute)) };
  });
}
/** Open pending work first; otherwise show its actual completed occurrence, including moves. */
export function taskScheduleTarget(events: CalendarEvent[]) {
  const pending = events.flatMap(event => {
    const occurrence = nextPendingOccurrence(event);
    return occurrence ? [{ event, occurrence }] : [];
  }).sort((a, b) => a.occurrence.startInstant.localeCompare(b.occurrence.startInstant));
  if (pending[0]) return pending[0];
  const completed = events.flatMap(event => event.exceptions.filter(exception => exception.completed && !exception.cancelled).flatMap(exception => {
    const occurrence = occurrenceAt(event, exception.date);
    return occurrence ? [{ event, occurrence }] : [];
  })).sort((a, b) => b.occurrence.startInstant.localeCompare(a.occurrence.startInstant));
  return completed[0] ?? (events[0] ? { event: events[0], occurrence: null } : null);
}
export function eventDraft(start: string, preferences: CalendarPreferences, task?: CalendarTask, habit?: Habit): EventDraft {
  const zone = habit?.timezone ?? preferences.timeZone;
  const instant = instantAt(start, preferences.timeZone);
  const localStart = instant && habit ? wallAt(instant, zone) : start;
  const end = new Date(Date.parse(`${localStart}:00Z`) + preferences.defaultMinutes * 60000).toISOString().slice(0, 16);
  return { title: task?.title ?? habit?.name ?? '', description: '', location: '', start: localStart, end, timeZone: zone, allDay: false, repeat: null, taskId: task?.id ?? null, habitId: habit?.id ?? null, color: habit ? 'green' : task ? 'blue' : 'orange', reminders: [] };
}
export function daysSpanned(item: CalendarItem) { return Math.max(1, diffDays(item.start.slice(0, 10), item.end.slice(0, 10))); }
