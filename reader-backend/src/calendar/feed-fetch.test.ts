import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:https', () => ({ request: mocks.request }));
import { feedUrl, fetchCalendarFeed, publicAddress } from './feed-fetch';
function respond(statusCode: number, headers: Record<string, string> = {}, body = '') {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error: Error) => void };
    req.destroy = error => { req.emit('error', error); req.emit('close'); };
    req.end = () => { const response = Object.assign(new PassThrough(), { statusCode, headers }); callback(response); response.end(body); response.once('end', () => req.emit('close')); };
    return req;
  });
}
describe('calendar feed transport boundaries', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]); });
  it('allows public unicast and rejects private, mapped, link-local and metadata IPs', () => {
    for (const address of ['127.0.0.1', '10.2.3.4', '172.16.1.2', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1']) expect(publicAddress(address), address).toBe(false);
    expect(publicAddress('93.184.216.34')).toBe(true);
  });
  it('accepts webcal as HTTPS but rejects credentials, insecure protocols and unusual ports', () => {
    expect(feedUrl('webcal://example.com/feed.ics').protocol).toBe('https:');
    for (const url of ['http://example.com/a', 'file:///etc/passwd', 'https://user:secret@example.com/a', 'https://example.com:444/a', 'https://example.com/a#token']) expect(() => feedUrl(url)).toThrow();
  });
  it('pins the resolved address, uses conditional requests and never sends cookies', async () => {
    respond(200, { etag: '"new"' }, 'calendar content');
    await expect(fetchCalendarFeed('https://example.com/private?token=secret', '"old"')).resolves.toMatchObject({ content: 'calendar content', etag: '"new"' });
    const options = mocks.request.mock.calls[0][1], callback = vi.fn();
    options.lookup('example.com', {}, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(options.headers['If-None-Match']).toBe('"old"'); expect(options.headers.Cookie).toBeUndefined(); expect(options.agent).toBe(false);
  });
  it('rejects a mixed public/private DNS response and a redirect into the local network', async () => {
    mocks.lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]);
    await expect(fetchCalendarFeed('https://example.com/feed')).rejects.toMatchObject({ status: 400 }); expect(mocks.request).not.toHaveBeenCalled();
    respond(302, { location: 'https://127.0.0.1/private' });
    mocks.lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    await expect(fetchCalendarFeed('https://example.com/feed')).rejects.toThrow(/public internet/);
  });
  it('handles unchanged responses and rejects oversized bodies and server errors', async () => {
    respond(304); await expect(fetchCalendarFeed('https://example.com/feed')).resolves.toEqual({ etag: null, lastModified: null });
    respond(200, {}, 'x'.repeat(1024 * 1024 + 1)); await expect(fetchCalendarFeed('https://example.com/feed')).rejects.toThrow(/1 MB/);
    respond(403); await expect(fetchCalendarFeed('https://example.com/feed')).rejects.toThrow(/accessible/);
  });
});
