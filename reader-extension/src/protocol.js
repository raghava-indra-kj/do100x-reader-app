export const MAX_CAPTURE_BYTES = 512 * 1024;
export const PENDING_LIFETIME_MS = 30 * 60 * 1000;
export function validKey(key) { return typeof key === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key); }
export function normalizeSource(value) {
    if (!value) return null;
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Open a normal web page to capture content.');
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    return url.href;
}
export function validatePayload(value) {
    if (!value || !validKey(value.captureKey) || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 1000 || typeof value.content !== 'string' || !value.content.trim()) throw new Error('Select some text or open an article first.');
    if (new TextEncoder().encode(value.content).length > MAX_CAPTURE_BYTES) throw new Error('The capture is larger than 512 KB. Select a smaller section.');
    return { captureKey: value.captureKey, title: value.title.trim(), content: value.content, sourceUrl: normalizeSource(value.sourceUrl) };
}
export function isCaptureReceiver(sender, record, origin) {
    if (!record || record.expiresAt <= Date.now() || sender.frameId !== 0 || sender.tab?.id !== record.targetTabId) return false;
    try {
        const url = new URL(sender.url);
        return url.origin === origin && url.pathname === '/reader/capture' && new URLSearchParams(url.hash.slice(1)).get('capture') === record.payload.captureKey;
    } catch { return false; }
}
