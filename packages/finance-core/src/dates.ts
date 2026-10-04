const DAY = 86400000;
export type Frequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface Recurrence {
  startDate: string;
  endDate?: string | null;
  frequency: Frequency;
  interval: number;
  monthEnd?: boolean;
}

/** A calendar date is not a server-local timestamp. UTC is used only for arithmetic. */
export function parseDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') throw new Error('Enter a valid date in YYYY-MM-DD format.');
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Enter a valid date.');
  return date;
}

export function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }

export function addDays(value: string, days: number): string {
  if (!Number.isSafeInteger(days)) throw new Error('Enter a valid day interval.');
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  const result = isoDate(date);
  parseDate(result);
  return result;
}

export function monthBounds(value: string): { from: string; to: string } {
  const date = parseDate(value);
  return { from: `${value.slice(0, 7)}-01`, to: isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))) };
}

/** Always anchor on the original date: Jan 31 -> Feb 28 -> Mar 31, not Mar 28. */
export function addMonths(value: string, months: number, monthEnd = false): string {
  if (!Number.isSafeInteger(months)) throw new Error('Enter a valid month interval.');
  const anchor = parseDate(value);
  const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(monthEnd ? lastDay : Math.min(anchor.getUTCDate(), lastDay));
  const result = isoDate(first);
  parseDate(result);
  return result;
}

export function dateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function validateTimezone(timezone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date(0)); return true; }
  catch { return false; }
}

export function occurrenceDates(schedule: Recurrence, from: string, to: string): string[] {
  const start = parseDate(schedule.startDate);
  const fromDate = parseDate(from);
  parseDate(to);
  if (from > to || !Number.isSafeInteger(schedule.interval) || schedule.interval < 1) throw new Error('Choose a valid date range for recurring plans.');
  if (schedule.endDate) parseDate(schedule.endDate);
  if (schedule.endDate && schedule.endDate < schedule.startDate) throw new Error('The end date must be on or after the start date.');
  if (schedule.frequency === 'ONCE') return schedule.startDate >= from && schedule.startDate <= to && (!schedule.endDate || schedule.startDate <= schedule.endDate) ? [schedule.startDate] : [];
  const dayStep = schedule.frequency === 'DAILY' ? schedule.interval : schedule.frequency === 'WEEKLY' ? schedule.interval * 7 : null;
  const monthStep = schedule.frequency === 'YEARLY' ? schedule.interval * 12 : schedule.interval;
  let index = Math.max(0, dayStep ? Math.floor((fromDate.getTime() - start.getTime()) / DAY / dayStep)
    : Math.floor(((fromDate.getUTCFullYear() - start.getUTCFullYear()) * 12 + fromDate.getUTCMonth() - start.getUTCMonth()) / monthStep));
  const dates: string[] = [];
  for (let attempts = 0; attempts < 10002; attempts++, index++) {
    let date: string;
    try { date = dayStep ? addDays(schedule.startDate, index * dayStep) : addMonths(schedule.startDate, index * monthStep, schedule.monthEnd); }
    catch { return dates; } // Date range ends at year 9999.
    if (date > to || (schedule.endDate && date > schedule.endDate)) return dates;
    if (date >= from && date >= schedule.startDate) dates.push(date);
  }
  throw new Error('Choose a smaller date range for recurring plans.');
}
