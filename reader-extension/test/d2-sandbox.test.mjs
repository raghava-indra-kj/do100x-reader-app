import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classicD2Worker } from '../d2-sandbox-plugin.mjs';

test('packages the installed D2 worker for opaque origins and fails closed on upstream changes', async () => {
    const source = await readFile(new URL('../../node_modules/@d2lang/d2/dist/browser/index.js', import.meta.url), 'utf8');
    const converted = classicD2Worker(source);
    assert.ok(converted.includes('function setupMessageHandler(isNode, port, initWasm) {'));
    assert.ok(!converted.includes('export function setupMessageHandler'));
    assert.ok(!converted.includes('export let BrotliDecode'));
    assert.ok(converted.includes('new Worker(URL.createObjectURL('));
    assert.ok(converted.endsWith(source.slice(-30))); // Retain the public module export.
    assert.throws(() => classicD2Worker(source.replace('export function setupMessageHandler', 'export function changedHandler')), /format changed/);
});
