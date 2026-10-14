import ICAL from 'ical.js';
import { createHash } from 'node:crypto';
import { addDays, instantAt, validZone, wallAt } from '@reader/calendar-core';

export type ExternalOccurrence = { key: string; sourceId: string; sourceName: string; title: string; description: string; location: string; color: string; start: string; end: string; startInstant: string; endInstant: string; allDay: boolean };
export type IcalRequest = { content: string; from: string; to: string; timeZone: string; validateOnly?: boolean };
export const MAX_ICAL_BYTES = 1024 * 1024;
/** Runs in a resource-limited worker: no network, scripts, attachments or invitations. */
export function parseIcal({ content, from, to, timeZone, validateOnly }: IcalRequest): Omit<ExternalOccurrence, 'sourceId' | 'sourceName' | 'color'>[] {
  if (Buffer.byteLength(content) > MAX_ICAL_BYTES) throw new Error('Calendar files must be 1 MB or smaller.');
  if (!validZone(timeZone)) throw new Error('Choose a valid timezone for floating event times.');
  const component = new ICAL.Component(ICAL.parse(content));
  if (component.name !== 'vcalendar') throw new Error('Choose an iCalendar (.ics) file.');
  const components = component.getAllSubcomponents('vevent');
  if (components.length > 2000) throw new Error('A calendar can contain up to 2,000 event definitions.');
  if (!components.length) {
    if (component.getAllSubcomponents().some(child => child.name !== 'vtimezone')) throw new Error('This file has no supported calendar events.');
    return [];
  }
  const events = components.map(child => new ICAL.Event(child, { strictExceptions: true }));
  const masters = new Map<string, ICAL.Event>();
  const fallback = String(component.getFirstPropertyValue('x-wr-timezone') || timeZone);
  const zone = validZone(fallback) ? fallback : timeZone;
  const toInstant = (time: ICAL.Time, event: ICAL.Event, property: string) => {
    if (time.isDate) return `${time.toString()}T00:00:00.000Z`;
    if (time.zone.tzid !== 'floating') return time.toJSDate().toISOString();
    const tzid = event.component.getFirstProperty(property)?.getParameter('tzid') || event.component.getFirstProperty('dtstart')?.getParameter('tzid') || zone;
    if (typeof tzid !== 'string' || !validZone(tzid)) throw new Error('A calendar timezone is unknown. Include its VTIMEZONE definition or use an IANA timezone.');
    const instant = instantAt(time.toString().slice(0, 16), tzid);
    if (!instant) throw new Error('An event uses a nonexistent local time during a clock change.');
    return new Date(instant.getTime() + time.second * 1000).toISOString();
  };
  for (const event of events) {
    if (!event.uid || event.uid.length > 2000) throw new Error('Every calendar event must have a valid UID.');
    if (!event.startDate) throw new Error('Every calendar event must have a start date.');
    toInstant(event.startDate, event, 'dtstart'); toInstant(event.endDate, event, 'dtend');
    if (event.startDate.year < 1900 || event.endDate.year >= 9999) throw new Error('Calendar dates must be between 1900 and 9998.');
    for (const rule of event.component.getAllProperties('rrule')) {
      const value = rule.getFirstValue() as ICAL.Recur;
      if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value.freq)) throw new Error('Calendar repeats must be daily, weekly, monthly or yearly.');
    }
    if (!event.isRecurrenceException()) {
      if (masters.has(event.uid)) throw new Error('The calendar contains duplicate event definitions.');
      masters.set(event.uid, event);
    }
  }
  const exceptions = new Map<string, ICAL.Event[]>();
  const exceptionKeys = new Set<string>();
  for (const event of events.filter(event => event.isRecurrenceException())) {
    const master = masters.get(event.uid);
    if (!master) throw new Error('A changed occurrence is missing its original recurring event.');
    const identity = `${event.uid}\n${toInstant(event.recurrenceId, master, 'dtstart')}`;
    if (exceptionKeys.has(identity)) throw new Error('The calendar contains duplicate changes to the same occurrence.');
    exceptionKeys.add(identity);
    exceptions.set(event.uid, [...(exceptions.get(event.uid) ?? []), event]);
    master.relateException(event);
  }
  if (validateOnly) return [];
  const fromInstant = instantAt(`${from}T00:00`, timeZone)?.toISOString(), toInstantEnd = instantAt(`${to}T00:00`, timeZone)?.toISOString();
  if (!fromInstant || !toInstantEnd) throw new Error('Choose a range with valid local midnights.');
  const result = new Map<string, Omit<ExternalOccurrence, 'sourceId' | 'sourceName' | 'color'>>();
  const sizes = new Map<string, number>();
  let resultBytes = 0;
  let iterations = 0;
  function add(event: ICAL.Event, recurrence: ICAL.Time, startTime: ICAL.Time, endTime: ICAL.Time) {
    if (event.component.getFirstPropertyValue('status') === 'CANCELLED') return;
    const startInstant = toInstant(startTime, event, 'dtstart'), endInstant = toInstant(endTime, event, 'dtend');
    if (endInstant < startInstant) throw new Error('An event ends before it starts.');
    const allDay = startTime.isDate;
    const start = allDay ? `${startTime.toString()}T00:00` : wallAt(startInstant, timeZone);
    const end = allDay ? `${endTime.toString()}T00:00` : wallAt(endInstant, timeZone);
    const overlaps = allDay ? start < `${to}T00:00` && end > `${from}T00:00` : startInstant < toInstantEnd! && (endInstant > fromInstant! || startInstant === endInstant && startInstant >= fromInstant!);
    if (!overlaps) return;
    const key = createHash('sha256').update(`${event.uid}\n${recurrence.toString()}`).digest('hex');
    const item = { key, title: (event.summary || 'Untitled event').slice(0, 1000), description: (event.description || '').slice(0, 15000), location: (event.location || '').slice(0, 1000), start, end, startInstant, endInstant, allDay };
    const size = Buffer.byteLength(JSON.stringify(item));
    resultBytes += size - (sizes.get(key) ?? 0);
    if (resultBytes > 8 * 1024 * 1024) throw new Error('Expanded calendar content exceeds 8 MB. Choose a shorter view.');
    sizes.set(key, size);
    result.set(key, item);
    if (result.size > 5000) throw new Error('This calendar has more than 5,000 occurrences in this range. Choose a shorter view.');
  }
  for (const master of masters.values()) {
    if (master.component.getFirstPropertyValue('status') === 'CANCELLED') continue;
    if (!master.isRecurring()) { add(master, master.startDate, master.startDate, master.endDate); continue; }
    // Iterate from DTSTART to preserve COUNT semantics. The worker timeout also bounds
    // difficult BYSETPOS rules; no partial or silently truncated result is returned.
    const changed = exceptions.get(master.uid) ?? [];
    // RANGE=THISANDFUTURE can move later recurrence IDs into this earlier view.
    // Match ical.js's wall-time displacement and leave two days for timezone differences.
    const shiftBack = changed.filter(event => event.modifiesFuture()).reduce((days, event) => {
      const original = event.recurrenceId.clone(); original.zone = event.startDate.zone;
      return Math.max(days, Math.ceil(-event.startDate.subtractDate(original).toSeconds() / 86400));
    }, 0);
    const cutoff = addDays(to, shiftBack + 2);
    const iterator = master.iterator();
    for (let next = iterator.next(); next; next = iterator.next()) {
      if (++iterations > 250000) throw new Error('This calendar recurrence is too large to expand. Export a shorter calendar from its source.');
      if (next.toString().slice(0, 10) > cutoff) break;
      const detail = master.getOccurrenceDetails(next);
      add(detail.item, next, detail.startDate, detail.endDate);
    }
    // A moved exception can enter this view from outside the original recurrence range.
    for (const exception of changed.filter(event => !event.modifiesFuture())) add(exception, exception.recurrenceId, exception.startDate, exception.endDate);
  }
  return [...result.values()].sort((a, b) => a.start.localeCompare(b.start));
}
