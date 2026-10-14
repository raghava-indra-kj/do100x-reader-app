/** Scheduling uses local wall-clock values plus an explicit IANA zone. */
export type RepeatRule = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  weekdays: number[];
  monthlyMode: 'DATE' | 'WEEKDAY';
  count: number | null;
  until: string | null;
};
export type Schedule = { start: string; end: string; allDay: boolean; timeZone: string; repeat: RepeatRule | null };
export type CalendarException = { date: string; start: string | null; end: string | null; allDay?: boolean | null; cancelled: boolean; completed: boolean; version: number };
export type CalendarEvent = Schedule & {
  id: string; title: string; description: string; location: string; color: string;
  taskId: string | null; habitId: string | null; reminders: number[];
  version: number; exceptions: CalendarException[]; createdAt: string; updatedAt: string;
};
export type Occurrence = {
  key: string; eventId: string; date: string; start: string; end: string;
  startInstant: string; endInstant: string; allDay: boolean; timeZone: string;
  cancelled: boolean; completed: boolean; exceptionVersion: number;
};
const DAY = 86_400_000;
const formats = new Map<string, Intl.DateTimeFormat>();
const knownZones = new Map<string, boolean>();
export const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
export const validWall = (wall: string) => /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(wall) && validDate(wall.slice(0, 10));
export const validZone = (zone: string) => {
  const cached = knownZones.get(zone); if (cached !== undefined) return cached;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); knownZones.set(zone, !!zone); return !!zone; }
  catch { return false; }
};
export const addDays = (date: string, count: number) => new Date(Date.parse(`${date}T00:00:00Z`) + count * DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const weekStart = (date: string, first = 1) => addDays(date, -((weekday(date) - first + 7) % 7));
export function datesBetween(from: string, to: string) {
  const count = diffDays(from, to) + 1;
  if (!Number.isFinite(count) || count < 0 || count > 36_600) throw new Error('Choose a supported date range.');
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}
export function wallAt(instant: Date | string, timeZone: string): string {
  let format = formats.get(timeZone);
  if (!format) { format = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); formats.set(timeZone, format); }
  const parts = format.formatToParts(typeof instant === 'string' ? new Date(instant) : instant);
  const p = (type: string) => parts.find(part => part.type === type)!.value;
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`;
}
/** Folds use the earlier occurrence; gaps return null rather than inventing a time. */
export function instantAt(wall: string, timeZone: string): Date | null {
  if (!validWall(wall) || !validZone(timeZone)) return null;
  const guess = Date.parse(`${wall}:00Z`), candidates = new Set<number>();
  for (const shift of [-2 * DAY, -DAY, 0, DAY, 2 * DAY]) {
    const probe = guess + shift;
    const offset = Date.parse(`${wallAt(new Date(probe), timeZone)}:00Z`) - probe;
    const candidate = guess - offset;
    if (wallAt(new Date(candidate), timeZone) === wall) candidates.add(candidate);
  }
  return candidates.size ? new Date(Math.min(...candidates)) : null;
}
export const addWallMinutes = (wall: string, minutes: number) => new Date(Date.parse(`${wall}:00Z`) + minutes * 60_000).toISOString().slice(0, 16);
export const wallMinutes = (from: string, to: string) => (Date.parse(`${to}:00Z`) - Date.parse(`${from}:00Z`)) / 60_000;
export function scheduleError(schedule: Schedule): string | null {
  if (!validWall(schedule.start) || !validWall(schedule.end) || !validZone(schedule.timeZone)) return 'Choose valid dates, times and a timezone.';
  if (schedule.start < '1900' || schedule.end >= '9999') return 'Choose dates between 1900 and 9998.';
  if (schedule.end <= schedule.start) return 'End must be after start.';
  if (wallMinutes(schedule.start, schedule.end) > 366 * 1440) return 'An event can span at most one year.';
  if (schedule.allDay && (!schedule.start.endsWith('T00:00') || !schedule.end.endsWith('T00:00'))) return 'All-day events use whole calendar days.';
  if (!instantAt(schedule.start, schedule.timeZone) || !instantAt(schedule.end, schedule.timeZone)) return 'That local time does not exist because the clocks change. Choose another time.';
  const rule = schedule.repeat;
  if (!rule) return null;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rule.frequency) || !Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365) return 'Choose a valid repeat interval.';
  if (rule.frequency === 'WEEKLY' && !rule.weekdays.length) return 'Choose at least one weekday.';
  if (rule.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6) || new Set(rule.weekdays).size !== rule.weekdays.length) return 'Choose unique weekdays.';
  if (rule.count !== null && (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > 10_000)) return 'Choose between 1 and 10,000 occurrences.';
  if (rule.until !== null && (!validDate(rule.until) || rule.until < schedule.start.slice(0, 10))) return 'Repeat end must follow the first date.';
  return null;
}
function matchesDate(seed: string, date: string, repeat: RepeatRule) {
  const [sy, sm, sd] = seed.split('-').map(Number), [y, m, d] = date.split('-').map(Number);
  if (repeat.frequency === 'DAILY') return diffDays(seed, date) % repeat.interval === 0;
  if (repeat.frequency === 'WEEKLY') return diffDays(weekStart(seed), weekStart(date)) / 7 % repeat.interval === 0 && repeat.weekdays.includes(weekday(date));
  if (repeat.frequency === 'YEARLY') return (y - sy) % repeat.interval === 0 && m === sm && d === sd;
  if (((y - sy) * 12 + m - sm) % repeat.interval) return false;
  if (repeat.monthlyMode === 'DATE') return d === sd;
  const seedLast = addDays(seed, 7).slice(0, 7) !== seed.slice(0, 7);
  return weekday(seed) === weekday(date) && (seedLast ? addDays(date, 7).slice(0, 7) !== date.slice(0, 7) : Math.floor((d - 1) / 7) === Math.floor((sd - 1) / 7));
}
/** Generate only candidate dates, rather than walking every day of a long series. */
function* candidateDates(event: Schedule, from: string, to: string): Generator<string> {
  const seed = event.start.slice(0, 10), rule = event.repeat;
  if (!rule) { if (seed >= from && seed <= to) yield seed; return; }
  const end = rule.until && rule.until < to ? rule.until : to;
  if (from > end) return;
  if (rule.frequency === 'DAILY') {
    let date = addDays(seed, Math.max(0, Math.ceil(diffDays(seed, from) / rule.interval)) * rule.interval);
    while (date <= end) { yield date; if (diffDays(date, '9998-12-31') < rule.interval) return; date = addDays(date, rule.interval); }
    return;
  }
  if (rule.frequency === 'WEEKLY') {
    const startWeek = weekStart(seed), first = weekStart(from);
    const offset = Math.max(0, Math.floor(diffDays(startWeek, first) / (7 * rule.interval)));
    let week = addDays(startWeek, offset * 7 * rule.interval);
    const days = [...rule.weekdays].sort((a, b) => (a + 6) % 7 - (b + 6) % 7);
    while (week <= end) {
      for (const day of days) { const date = addDays(week, (day + 6) % 7); if (date >= seed && date >= from && date <= end) yield date; }
      if (diffDays(week, '9998-12-24') < 7 * rule.interval) return;
      week = addDays(week, 7 * rule.interval);
    }
    return;
  }
  const [sy, sm, sd] = seed.split('-').map(Number), [fy, fm] = from.split('-').map(Number);
  const step = rule.frequency === 'YEARLY' ? rule.interval * 12 : rule.interval;
  const startMonth = sy * 12 + sm - 1;
  let month = startMonth + Math.max(0, Math.floor(((fy * 12 + fm - 1) - startMonth) / step)) * step;
  while (month < 9999 * 12) {
    const prefix = `${String(Math.floor(month / 12)).padStart(4, '0')}-${String(month % 12 + 1).padStart(2, '0')}`;
    if (`${prefix}-01` > end) return;
    if (rule.frequency === 'YEARLY' || rule.monthlyMode === 'DATE') {
      const date = `${prefix}-${String(sd).padStart(2, '0')}`;
      if (date >= from && date <= end && validDate(date)) yield date;
    } else {
      for (let day = 1; day <= 31; day++) {
        const date = `${prefix}-${String(day).padStart(2, '0')}`;
        if (date >= seed && date >= from && date <= end && validDate(date) && matchesDate(seed, date, rule)) yield date;
      }
    }
    month += step;
  }
}
/** Resolve a known occurrence date, applying any persisted override. */
export function occurrenceAt(event: Pick<CalendarEvent, 'id' | 'exceptions'> & Schedule, date: string): Occurrence | null {
  const override = event.exceptions.find(item => item.date === date);
  const start = override?.start ?? `${date}${event.start.slice(10)}`, end = override?.end ?? addWallMinutes(start, wallMinutes(event.start, event.end));
  const a = instantAt(start, event.timeZone), b = instantAt(end, event.timeZone);
  if (!a || !b || b <= a) return null;
  return { key: `${event.id}/${date}`, eventId: event.id, date, start, end, startInstant: a.toISOString(), endInstant: b.toISOString(), allDay: override?.allDay ?? event.allDay, timeZone: event.timeZone, cancelled: override?.cancelled ?? false, completed: override?.completed ?? false, exceptionVersion: override?.version ?? 0 };
}
/** COUNT for a split series excludes preceding valid instances, including skipped/completed ones. */
export function remainingOccurrenceCount(schedule: Schedule, fromDate: string): number | null {
  if (!schedule.repeat?.count) return null;
  let preceding = 0;
  const duration = wallMinutes(schedule.start, schedule.end);
  for (const date of candidateDates(schedule, schedule.start.slice(0, 10), fromDate)) {
    if (date >= fromDate) break;
    const start = `${date}${schedule.start.slice(10)}`;
    if (instantAt(start, schedule.timeZone) && instantAt(addWallMinutes(start, duration), schedule.timeZone)) preceding++;
    if (preceding >= schedule.repeat.count) return 0;
  }
  return schedule.repeat.count - preceding;
}
/** Resolve membership in the current rule, without retained or moved exceptions. */
export function scheduledOccurrenceAt(event: Pick<CalendarEvent, 'id'> & Schedule, date: string): Occurrence | null {
  if (!validDate(date) || date < event.start.slice(0, 10) || date >= '9999') return null;
  if (candidateDates(event, date, date).next().value !== date || remainingOccurrenceCount(event, date) === 0) return null;
  return occurrenceAt({ ...event, exceptions: [] }, date);
}
/** Oldest unfinished instance, including overdue work and moved exceptions. No arbitrary future horizon. */
export function nextPendingOccurrence(event: Pick<CalendarEvent, 'id' | 'exceptions'> & Schedule): Occurrence | null {
  let best: Occurrence | null = null;
  for (const exception of event.exceptions) {
    if (exception.cancelled || exception.completed || !exception.start) continue;
    const item = occurrenceAt(event, exception.date);
    if (item && (!best || item.startInstant < best.startInstant)) best = item;
  }
  const exceptions = new Map(event.exceptions.map(item => [item.date, item]));
  let count = 0;
  for (const date of candidateDates(event, event.start.slice(0, 10), '9998-12-31')) {
    const original = occurrenceAt({ ...event, exceptions: [] }, date);
    if (!original) continue;
    if (event.repeat?.count && ++count > event.repeat.count) break;
    if (best && original.startInstant >= best.startInstant) break;
    const override = exceptions.get(date);
    if (override?.cancelled || override?.completed || override?.start) continue;
    best = original; break;
  }
  return best;
}
/** Query boundaries are instants; occurrence IDs retain their original local date after moving. */
export function expandSchedule(event: Pick<CalendarEvent, 'id' | 'exceptions'> & Schedule, from: string, to: string, includeCancelled = false): Occurrence[] {
  if (Date.parse(to) <= Date.parse(from)) return [];
  const seed = event.start.slice(0, 10), wallDuration = wallMinutes(event.start, event.end);
  const endDay = wallAt(to, event.timeZone).slice(0, 10);
  const exceptions = new Map(event.exceptions.map(item => [item.date, item]));
  const candidateEnd = event.repeat ? (event.repeat.until && event.repeat.until < endDay ? event.repeat.until : endDay) : seed;
  const nearby = addDays(wallAt(from, event.timeZone).slice(0, 10), -Math.ceil(wallDuration / 1440) - 1);
  const candidateStart = event.repeat && !event.repeat.count && nearby > seed ? nearby : seed;
  const candidates = candidateDates(event, candidateStart, candidateEnd);
  let count = 0;
  const originalDates = new Set<string>();
  const result: Occurrence[] = [];
  function append(date: string) {
    const override = exceptions.get(date), start = override?.start ?? `${date}${event.start.slice(10)}`;
    const end = override?.end ?? addWallMinutes(start, wallDuration);
    const a = instantAt(start, event.timeZone), b = instantAt(end, event.timeZone);
    if (!a || !b || b <= a || b.getTime() <= Date.parse(from) || a.getTime() >= Date.parse(to) || (override?.cancelled && !includeCancelled)) return;
    result.push({ key: `${event.id}/${date}`, eventId: event.id, date, start, end, startInstant: a.toISOString(), endInstant: b.toISOString(), allDay: override?.allDay ?? event.allDay, timeZone: event.timeZone, cancelled: override?.cancelled ?? false, completed: override?.completed ?? false, exceptionVersion: override?.version ?? 0 });
  }
  for (const date of candidates) {
    if (event.repeat && !matchesDate(seed, date, event.repeat)) continue;
    // A recurrence in a DST gap is omitted, including from COUNT.
    const start = `${date}${event.start.slice(10)}`;
    if (!instantAt(start, event.timeZone) || !instantAt(addWallMinutes(start, wallDuration), event.timeZone)) continue;
    if (event.repeat?.count && ++count > event.repeat.count) break;
    originalDates.add(date); append(date);
  }
  // A moved occurrence may have its original date outside the requested window.
  for (const exception of event.exceptions) if (!originalDates.has(exception.date) && exception.start) append(exception.date);
  return result.sort((a, b) => a.startInstant.localeCompare(b.startInstant) || a.key.localeCompare(b.key));
}
export type PositionedEvent<T> = { event: T; column: number; columns: number };
/** Half-open intervals let adjacent blocks share a column. Connected overlaps share widths. */
export function arrangeOverlaps<T extends { startMinute: number; endMinute: number }>(events: T[]): PositionedEvent<T>[] {
  const sorted = [...events].sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
  const output: PositionedEvent<T>[] = [], ends: number[] = [];
  let group: PositionedEvent<T>[] = [], groupEnd = -Infinity;
  const flush = () => { for (const item of group) item.columns = ends.length; output.push(...group); group = []; ends.length = 0; };
  for (const event of sorted) {
    if (event.startMinute >= groupEnd) flush();
    let column = ends.findIndex(end => end <= event.startMinute);
    if (column < 0) column = ends.length;
    ends[column] = event.endMinute; groupEnd = Math.max(groupEnd, event.endMinute);
    group.push({ event, column, columns: 1 });
  }
  flush(); return output;
}
export function busyMinutes(events: { startMinute: number; endMinute: number }[], from = 0, to = 1440) {
  let total = 0, end = from;
  for (const event of [...events].sort((a, b) => a.startMinute - b.startMinute)) {
    const start = Math.max(from, event.startMinute, end), finish = Math.min(to, event.endMinute);
    if (finish > start) total += finish - start;
    end = Math.max(end, finish);
  }
  return total;
}
