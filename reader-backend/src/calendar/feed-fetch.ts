import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
import { CalendarError } from './calendar-service';

export function publicAddress(address: string) {
  try { const parsed = ipaddr.process(address); return parsed.range() === 'unicast'; } catch { return false; }
}
export function feedUrl(raw: string) {
  let url: URL; try { url = new URL(raw.replace(/^webcal:/i, 'https:')); } catch { throw new CalendarError(400, 'Enter a valid HTTPS calendar URL.'); }
  if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || url.hash || url.href.length > 4000) throw new CalendarError(400, 'Use an HTTPS calendar URL without a username, password or fragment.');
  return url;
}
export type FeedResponse = { content?: string; etag: string | null; lastModified: string | null };
/** Pin the validated public address to the TLS connection, including every redirect. */
export async function fetchCalendarFeed(raw: string, etag?: string | null, lastModified?: string | null): Promise<FeedResponse> {
  const deadline = Date.now() + 12000;
  async function get(raw: string, redirects: number): Promise<FeedResponse> {
    const url = feedUrl(raw);
    if (redirects > 3 || Date.now() >= deadline) throw new CalendarError(400, 'The calendar server took too long or redirected too many times.');
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    let lookupTimer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([lookup(hostname, { all: true }), new Promise<never>((_, reject) => { lookupTimer = setTimeout(() => reject(new CalendarError(400, 'The calendar server could not be reached.')), Math.max(1, deadline - Date.now())); lookupTimer.unref(); })]).finally(() => clearTimeout(lookupTimer));
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new CalendarError(400, 'Calendar subscriptions must use a public internet address.');
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = { Accept: 'text/calendar', 'Accept-Encoding': 'identity', 'User-Agent': 'do100x-calendar/1.0' };
      if (etag && !/[\r\n]/.test(etag)) headers['If-None-Match'] = etag;
      if (lastModified && !/[\r\n]/.test(lastModified)) headers['If-Modified-Since'] = lastModified;
      const connection = request(url, { method: 'GET', headers, agent: false, family: addresses[0].family, lookup: (_name, _options, callback) => callback(null, addresses[0].address, addresses[0].family) }, response => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
          response.resume(); let target: string; try { target = new URL(response.headers.location, url).href; } catch { reject(new CalendarError(400, 'The calendar server returned an invalid redirect.')); return; }
          void get(target, redirects + 1).then(resolve, reject); return;
        }
        const textHeader = (value: string | string[] | undefined) => typeof value === 'string' && value.length <= 1000 ? value : null;
        const meta = { etag: textHeader(response.headers.etag), lastModified: textHeader(response.headers['last-modified']) };
        if (response.statusCode === 304) { response.resume(); resolve(meta); return; }
        if (response.statusCode !== 200 || response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.resume(); reject(new CalendarError(400, 'The URL did not return an accessible, uncompressed calendar. Check its private calendar link.')); return; }
        const chunks: Buffer[] = []; let length = 0;
        response.on('data', chunk => { length += chunk.length; if (length > 1024 * 1024) connection.destroy(new Error('size')); else chunks.push(Buffer.from(chunk)); });
        response.once('end', () => resolve({ ...meta, content: Buffer.concat(chunks).toString('utf8') }));
        response.once('error', () => reject(new CalendarError(400, 'Couldn’t download the complete calendar. The previous copy is kept.')));
      });
      const timer = setTimeout(() => connection.destroy(new Error('timeout')), Math.max(1, deadline - Date.now()));
      connection.once('close', () => clearTimeout(timer));
      connection.once('error', () => reject(new CalendarError(400, 'Couldn’t download the calendar within 12 seconds and 1 MB. Check the calendar URL.')));
      connection.end();
    });
  }
  return get(raw, 0);
}
