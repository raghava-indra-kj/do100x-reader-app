import { describe, expect, it } from 'vitest';
import { expandSchedule, type CalendarEvent } from '@reader/calendar-core';
import { parseIcal } from './ical-parser';
import { exportIcal } from './ical-export';
const calendar = (...events: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
const event = (body: string) => `BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`;
const read = (content: string, options = {}) => parseIcal({ content, from: '2026-10-01', to: '2026-11-15', timeZone: 'Asia/Kolkata', ...options });
describe('iCalendar import and export', () => {
  it('honors named IANA zones across DST without requiring embedded VTIMEZONE', () => {
    const result = read(calendar(event('UID:weekly\r\nSUMMARY:Stand-up\r\nDTSTART;TZID=America/New_York:20261026T090000\r\nDTEND;TZID=America/New_York:20261026T093000\r\nRRULE:FREQ=WEEKLY;COUNT=3')));
    expect(result.map(item => item.start)).toEqual(['2026-10-26T18:30', '2026-11-02T19:30', '2026-11-09T19:30']);
  });
  it('honors embedded custom zones without leaking their definition to another file', () => {
    const zone = 'BEGIN:VTIMEZONE\r\nTZID:Custom/PlusTwo\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0200\r\nEND:STANDARD\r\nEND:VTIMEZONE';
    const item = event('UID:custom\r\nDTSTART;TZID=Custom/PlusTwo:20261015T090000\r\nDURATION:PT1H');
    expect(read(calendar(zone, item))[0].startInstant).toBe('2026-10-15T07:00:00.000Z');
    expect(() => read(calendar(item))).toThrow(/timezone is unknown/);
  });
  it('preserves floating dates, all-day exclusive ends and unfolded escaped text', () => {
    const result = read(calendar(event('UID:all\r\nSUMMARY:A very long\r\n  title\\, with punctuation\\; and\\nline\r\nDTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261017'), event('UID:floating\r\nDTSTART:20261015T100000\r\nDURATION:PT45M')));
    expect(result[0]).toMatchObject({ allDay: true, start: '2026-10-15T00:00', end: '2026-10-17T00:00', title: 'A very long title, with punctuation; and\nline' });
    expect(result[1]).toMatchObject({ start: '2026-10-15T10:00', end: '2026-10-15T10:45', startInstant: '2026-10-15T04:30:00.000Z' });
  });
  it('applies exclusions, cancellations and moved occurrence metadata exactly once', () => {
    const result = read(calendar(event('UID:series\r\nSUMMARY:Original\r\nDTSTART:20261010T090000Z\r\nDTEND:20261010T100000Z\r\nRRULE:FREQ=DAILY;COUNT=4\r\nEXDATE:20261011T090000Z'), event('UID:series\r\nRECURRENCE-ID:20261012T090000Z\r\nDTSTART:20261015T110000Z\r\nDTEND:20261015T120000Z\r\nSUMMARY:Moved'), event('UID:series\r\nRECURRENCE-ID:20261013T090000Z\r\nDTSTART:20261013T090000Z\r\nDTEND:20261013T100000Z\r\nSTATUS:CANCELLED')));
    expect(result.map(item => [item.title, item.start])).toEqual([['Original', '2026-10-10T14:30'], ['Moved', '2026-10-15T16:30']]);
    const movedOnly = read(calendar(event('UID:outside\r\nDTSTART:20261201T090000Z\r\nDTEND:20261201T100000Z\r\nRRULE:FREQ=DAILY;COUNT=2'), event('UID:outside\r\nRECURRENCE-ID:20261202T090000Z\r\nDTSTART:20261015T090000Z\r\nDTEND:20261015T100000Z')));
    expect(movedOnly).toHaveLength(1);
  });
  it('supports BYSETPOS month rules and RDATE additions', () => {
    const result = read(calendar(event('UID:monthly\r\nDTSTART:20261030T090000Z\r\nDTEND:20261030T100000Z\r\nRRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1;COUNT=2\r\nRDATE:20261105T090000Z')));
    expect(result.map(item => item.start.slice(0, 10))).toEqual(['2026-10-30', '2026-11-05']);
  });
  it('includes this-and-future shifts from beyond the original view range', () => {
    const content = calendar(event('UID:future\r\nSUMMARY:Original\r\nDTSTART:20261201T090000Z\r\nDTEND:20261201T100000Z\r\nRRULE:FREQ=DAILY;COUNT=5'), event('UID:future\r\nRECURRENCE-ID;RANGE=THISANDFUTURE:20261202T090000Z\r\nDTSTART:20261015T090000Z\r\nDTEND:20261015T103000Z\r\nSUMMARY:Earlier series'));
    const result = read(content, { to: '2026-10-18' });
    expect(result.map(item => [item.title, item.start, item.end])).toEqual([
      ['Earlier series', '2026-10-15T14:30', '2026-10-15T16:00'],
      ['Earlier series', '2026-10-16T14:30', '2026-10-16T16:00'],
      ['Earlier series', '2026-10-17T14:30', '2026-10-17T16:00'],
    ]);
  });
  it('rejects ambiguous duplicate exceptions and expansion that amplifies large descriptions', () => {
    const master = event('UID:x\r\nDTSTART:20261001T090000Z\r\nRRULE:FREQ=DAILY;COUNT=2');
    const changed = event('UID:x\r\nRECURRENCE-ID:20261002T090000Z\r\nDTSTART:20261003T090000Z');
    expect(() => read(calendar(master, changed, changed))).toThrow(/duplicate changes/);
    const large = event(`UID:large\r\nDTSTART:20261001T090000Z\r\nRRULE:FREQ=DAILY;COUNT=1000\r\nDESCRIPTION:${'A'.repeat(15000)}`);
    expect(() => read(calendar(large), { to: '2029-10-01' })).toThrow(/Expanded calendar content/);
  });
  it('rejects malformed input, orphan changes and excessively frequent repeats', () => {
    expect(() => read('<html>Sign in</html>')).toThrow();
    expect(() => read(calendar(event('UID:x\r\nDTSTART:20261015T090000Z\r\nRRULE:FREQ=SECONDLY')))).toThrow(/daily/);
    expect(() => read(calendar(event('UID:x\r\nRECURRENCE-ID:20261015T090000Z\r\nDTSTART:20261015T090000Z')))).toThrow(/missing its original/);
    expect(() => read('x'.repeat(1024 * 1024 + 1))).toThrow(/1 MB/);
  });
  it('exports portable Unicode, moved dates and all-day snapshots without invitations', () => {
    const source: CalendarEvent = { id: 'event-one', title: 'Reading, writing; 漢字 '.repeat(8), description: 'First\nSecond\\third', location: 'Home', color: 'blue', start: '2026-10-15T09:00', end: '2026-10-15T10:00', timeZone: 'Asia/Kolkata', allDay: false, repeat: null, taskId: null, habitId: null, reminders: [], exceptions: [], version: 1, createdAt: '', updatedAt: '' };
    const items = expandSchedule(source, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
    const text = exportIcal([source], items), imported = read(text);
    expect(imported[0]).toMatchObject({ title: source.title, description: source.description, start: source.start, end: source.end });
    expect(text.split('\r\n').every(line => Buffer.byteLength(line) <= 75)).toBe(true);
    expect(text).not.toMatch(/ATTENDEE|ORGANIZER|METHOD:REQUEST/);
  });
});
