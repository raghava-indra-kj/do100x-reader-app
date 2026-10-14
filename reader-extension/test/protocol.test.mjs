import test from 'node:test';
import assert from 'node:assert/strict';
import { isCaptureReceiver, normalizeSource, validatePayload, MAX_CAPTURE_BYTES } from '../src/protocol.js';
const key = '11111111-1111-4111-8111-111111111111';
const origin = 'https://www.do100x.com';
const payload = { captureKey: key, title: 'A title', content: 'Some content', sourceUrl: 'https://example.com/a?token=x#b' };
test('normalizes metadata and never accepts active URL schemes or empty captures', () => {
    assert.equal(normalizeSource('https://user:password@example.com/a?secret=x#b'), 'https://example.com/a');
    assert.equal(validatePayload(payload).sourceUrl, 'https://example.com/a');
    assert.throws(() => validatePayload({ ...payload, sourceUrl: 'javascript:alert(1)' }));
    assert.throws(() => validatePayload({ ...payload, content: ' ' }));
    assert.throws(() => validatePayload({ ...payload, captureKey: 'other' }));
});
test('limits UTF-8 bytes rather than JavaScript string length', () => {
    assert.throws(() => validatePayload({ ...payload, content: '₹'.repeat(MAX_CAPTURE_BYTES / 2) }));
});
test('delivers only to the bound top-level destination tab and exact origin, route and nonce', () => {
    const record = { targetTabId: 7, expiresAt: Date.now() + 10000, payload };
    const sender = { frameId: 0, tab: { id: 7 }, url: `${origin}/reader/capture#capture=${key}` };
    assert.equal(isCaptureReceiver(sender, record, origin), true);
    for (const changed of [{ ...sender, tab: { id: 8 } }, { ...sender, frameId: 1 }, { ...sender, url: `https://evil.example/reader/capture#capture=${key}` }, { ...sender, url: `${origin}/reader/captures#capture=${key}` }, { ...sender, url: `${origin}/reader/capture#capture=wrong` }]) {
        assert.equal(isCaptureReceiver(changed, record, origin), false);
    }
    assert.equal(isCaptureReceiver(sender, { ...record, expiresAt: 0 }, origin), false);
});
