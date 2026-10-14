import type { CalendarEvent, Occurrence } from '@reader/calendar-core';
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (value: string) => value.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
function fold(line: string) {
  const parts: string[] = []; let part = '', size = 0;
  for (const char of line) { const bytes = Buffer.byteLength(char); if (size + bytes > 75) { parts.push(part); part = ' '; size = 1; } part += char; size += bytes; }
  parts.push(part); return parts.join('\r\n');
}
/** A portable snapshot of the chosen range, with stable IDs and no invitation fields. */
export function exportIcal(events: CalendarEvent[], occurrences: Occurrence[]) {
  const byId = new Map(events.map(event => [event.id, event]));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//do100x//Calendar//EN', 'CALSCALE:GREGORIAN'];
  for (const occurrence of occurrences.filter(item => !item.cancelled)) {
    const event = byId.get(occurrence.eventId); if (!event) continue;
    lines.push('BEGIN:VEVENT', `UID:${event.id}-${occurrence.date}@do100x`, `DTSTAMP:${stamp(new Date().toISOString())}`, `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.description)}`, `LOCATION:${escape(event.location)}`);
    if (occurrence.allDay) lines.push(`DTSTART;VALUE=DATE:${occurrence.start.slice(0, 10).replace(/-/g, '')}`, `DTEND;VALUE=DATE:${occurrence.end.slice(0, 10).replace(/-/g, '')}`);
    else lines.push(`DTSTART:${stamp(occurrence.startInstant)}`, `DTEND:${stamp(occurrence.endInstant)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.map(fold).join('\r\n') + '\r\n';
}
