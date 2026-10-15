import { createHash } from 'node:crypto';
import type { PrismaClient, calendar_source } from '@prisma/client';
import { z } from 'zod';
import { addDays, validZone, wallAt } from '@reader/calendar-core';
import { CalendarError, calendarTransaction } from './calendar-service';
import { readIcal } from './ical-runtime';
import { feedUrl, fetchCalendarFeed, type FeedResponse } from './feed-fetch';
import type { ExternalOccurrence } from './ical-parser';

const fields = z.object({ name: z.string().trim().min(1).max(100), color: z.enum(['orange', 'green', 'blue', 'violet', 'rose', 'teal']), timeZone: z.string().max(100).refine(validZone) });
export const createSourceInput = fields.extend({ url: z.string().max(4000).optional(), content: z.string().max(1024 * 1024).optional() }).strict().refine(value => Boolean(value.url) !== Boolean(value.content), 'Choose a calendar file or a subscription URL.');
export const updateSourceInput = fields.extend({ enabled: z.boolean(), expectedVersion: z.number().int().positive() }).strict();
const versionInput = z.object({ expectedVersion: z.number().int().positive() }).strict();
export const sourceDto = (row: calendar_source) => ({ id: row.id, name: row.name, color: row.color, timeZone: row.timeZone, enabled: row.enabled, version: row.version, kind: row.url ? 'subscription' : 'file', host: row.url ? new URL(row.url).hostname : null, lastCheckedAt: row.lastCheckedAt.toISOString(), lastSuccessAt: row.lastSuccessAt.toISOString(), error: row.error });
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const validationRange = (timeZone: string) => { const today = wallAt(new Date(), timeZone).slice(0, 10); return { from: addDays(today, -7), to: addDays(today, 31), timeZone }; };
async function ownSource(db: PrismaClient, userId: string, id: string) { const row = await db.calendar_source.findFirst({ where: { id, userId } }); if (!row) throw new CalendarError(404, 'Calendar source not found.'); return row; }
export async function listCalendarSources(db: PrismaClient, userId: string) { return (await db.calendar_source.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })).map(sourceDto); }
export async function addCalendarSource(db: PrismaClient, userId: string, raw: unknown) {
  const input = createSourceInput.parse(raw), url = input.url ? feedUrl(input.url).href : null;
  const sourceKey = digest(url ? `url:${url}` : `file:${input.content}`);
  const existing = await db.calendar_source.findUnique({ where: { userId_sourceKey: { userId, sourceKey } } });
  if (existing) return sourceDto(existing);
  if (await db.calendar_source.count({ where: { userId } }) >= 10) throw new CalendarError(400, 'You can keep up to 10 imported or subscribed calendars.');
  const feed = url ? await fetchCalendarFeed(url) : { content: input.content!, etag: null, lastModified: null };
  if (feed.content === undefined) throw new CalendarError(400, 'The calendar server returned no calendar.');
  await readIcal({ content: feed.content, ...validationRange(input.timeZone) });
  return calendarTransaction(db, userId, async tx => {
    const duplicate = await tx.calendar_source.findUnique({ where: { userId_sourceKey: { userId, sourceKey } } });
    if (duplicate) return sourceDto(duplicate);
    if (await tx.calendar_source.count({ where: { userId } }) >= 10) throw new CalendarError(400, 'You can keep up to 10 imported or subscribed calendars.');
    return sourceDto(await tx.calendar_source.create({ data: { userId, sourceKey, name: input.name, color: input.color, timeZone: input.timeZone, url, content: feed.content!, etag: feed.etag, lastModified: feed.lastModified, lastCheckedAt: new Date(), lastSuccessAt: new Date() } }));
  });
}
export async function updateCalendarSource(db: PrismaClient, userId: string, id: string, raw: unknown) {
  const { expectedVersion, ...changes } = updateSourceInput.parse(raw);
  const existing = await ownSource(db, userId, id);
  if (changes.timeZone !== existing.timeZone) await readIcal({ content: existing.content, ...validationRange(changes.timeZone) });
  return calendarTransaction(db, userId, async tx => {
    const result = await tx.calendar_source.updateMany({ where: { id, userId, version: expectedVersion }, data: { ...changes, version: { increment: 1 } } });
    if (!result.count) throw new CalendarError(409, 'This calendar changed in another tab. Reload before saving.');
    return sourceDto((await tx.calendar_source.findFirst({ where: { id, userId } }))!);
  });
}
export async function removeCalendarSource(db: PrismaClient, userId: string, id: string, raw: unknown) {
  const { expectedVersion } = versionInput.parse(raw);
  await ownSource(db, userId, id);
  return calendarTransaction(db, userId, async tx => {
    if (!(await tx.calendar_source.deleteMany({ where: { id, userId, version: expectedVersion } })).count) throw new CalendarError(409, 'This calendar changed in another tab. Reload before removing it.');
  });
}
export async function exportCalendarSource(db: PrismaClient, userId: string, id: string) { return (await ownSource(db, userId, id)).content; }
const refreshing = new Map<string, Promise<ReturnType<typeof sourceDto>>>();
export async function refreshCalendarSource(db: PrismaClient, userId: string, id: string, download: typeof fetchCalendarFeed = fetchCalendarFeed) {
  const key = `${userId}/${id}`, current = refreshing.get(key); if (current) return current;
  const work = (async () => {
    const row = await ownSource(db, userId, id);
    if (!row.url || Date.now() - row.lastCheckedAt.getTime() < 5 * 60000) return sourceDto(row);
    let feed: FeedResponse | undefined, error: string | null = null;
    try {
      feed = await download(row.url, row.etag, row.lastModified);
      if (feed.content !== undefined) await readIcal({ content: feed.content, ...validationRange(row.timeZone) });
    } catch (cause) { error = cause instanceof CalendarError ? cause.message : 'Couldn’t refresh this calendar. The previous copy is kept.'; }
    // Compare the version after network I/O: edits/removal during the request win.
    await db.calendar_source.updateMany({ where: { id, userId, version: row.version }, data: { lastCheckedAt: new Date(), error, ...(!error && feed ? { lastSuccessAt: new Date(), ...(feed.content !== undefined ? { content: feed.content, etag: feed.etag, lastModified: feed.lastModified } : {}) } : {}), version: { increment: 1 } } });
    return sourceDto(await ownSource(db, userId, id));
  })();
  refreshing.set(key, work);
  try { return await work; } finally { refreshing.delete(key); }
}
const cache = new Map<string, { entries: ExternalOccurrence[]; bytes: number }>();
const MAX_EXPANDED_BYTES = 16 * 1024 * 1024;
let cacheBytes = 0;
export async function sourceOccurrences(db: PrismaClient, userId: string, from: string, to: string, timeZone: string) {
  const sources = await db.calendar_source.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  const items: ExternalOccurrence[] = [], errors: string[] = [];
  let responseBytes = 0;
  // Sequential expansion limits memory even if every imported calendar is large.
  for (const source of sources.filter(source => source.enabled)) {
    const key = `${userId}/${source.id}/${source.version}/${from}/${to}/${timeZone}`;
    try {
      let cached = cache.get(key);
      if (!cached) {
        // Floating times use the source's configured zone; the worker returns instants.
        const expanded = await readIcal({ content: source.content, from: addDays(from, -2), to: addDays(to, 2), timeZone: source.timeZone });
        const entries = expanded.map(item => ({ ...item, key: `${source.id}/${item.key}`, sourceId: source.id, sourceName: source.name, color: source.color, start: item.allDay ? item.start : wallAt(item.startInstant, timeZone), end: item.allDay ? item.end : wallAt(item.endInstant, timeZone) })).filter(item => item.start < `${to}T00:00` && (item.end > `${from}T00:00` || item.start === item.end && item.start >= `${from}T00:00`));
        cached = { entries, bytes: Buffer.byteLength(JSON.stringify(entries)) };
        while (cache.size && (cache.size >= 16 || cacheBytes + cached.bytes > MAX_EXPANDED_BYTES)) {
          const oldest = cache.keys().next().value!;
          cacheBytes -= cache.get(oldest)!.bytes; cache.delete(oldest);
        }
        if (cached.bytes <= MAX_EXPANDED_BYTES) { cache.set(key, cached); cacheBytes += cached.bytes; }
      }
      if (responseBytes + cached.bytes > MAX_EXPANDED_BYTES || items.length + cached.entries.length > 20000) throw new CalendarError(400, 'Combined calendars exceed this view’s size limit. Choose a shorter view or hide a calendar.');
      responseBytes += cached.bytes;
      items.push(...cached.entries);
    } catch (cause) { errors.push(`${source.name}: ${cause instanceof CalendarError ? cause.message : 'Couldn’t read this calendar.'}`); }
  }
  return { sources: sources.map(sourceDto), external: items, sourceErrors: errors };
}
