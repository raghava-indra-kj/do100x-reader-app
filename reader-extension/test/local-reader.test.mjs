import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearExpiredCaptures, LOCAL_PREFIX, LOCAL_LIFETIME_MS, createCapture, isLocalReceiver } from '../src/local-captures.js';
import { extensionCsp, sandboxCsp } from '../security.mjs';

const origin = 'https://www.do100x.com';
const raw = { title: 'Equation', content: '# Read\n\n$E=mc^2$\n\n```d2\na -> b\n```', sourceUrl: 'https://example.com/article' };
let data, tabs, listener, failNavigation, nextId;
const chrome = {
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, onMessage: { addListener: fn => { listener = fn; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: { session: {
        async get(key) { return key === null ? structuredClone(data) : { [key]: structuredClone(data[key]) }; },
        async set(values) { Object.assign(data, structuredClone(values)); },
        async remove(keys) { for (const key of [keys].flat()) delete data[key]; },
    } },
    tabs: {
        async create({ url }) { const tab = { id: nextId++, url }; tabs.set(tab.id, tab); return tab; },
        async update(id, values) {
            if (failNavigation) throw new Error('Navigation unavailable');
            const tab = tabs.get(id); if (!tab) throw new Error('Tab closed');
            // A destination can load immediately; assert the binding already exists.
            if (values.url?.includes('#capture=')) {
                const key = new URL(values.url).hash.slice('#capture='.length);
                assert.equal((data[LOCAL_PREFIX + key] || data['capture:' + key])?.targetTabId, id);
            }
            Object.assign(tab, values); return tab;
        },
        async get(id) { if (!tabs.has(id)) throw new Error('Tab closed'); return tabs.get(id); },
        async remove(id) { tabs.delete(id); },
        async query() { return [{ id: 90, url: 'https://example.com/article' }]; },
    },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    contextMenus: { onClicked: { addListener() {} } },
    alarms: { onAlarm: { addListener() {} } },
};
globalThis.chrome = chrome; globalThis.__READER_ORIGIN__ = origin;
await import('../src/background.js');
beforeEach(() => { data = {}; tabs = new Map(); nextId = 1; failNavigation = false; });
const popup = { id: chrome.runtime.id, url: chrome.runtime.getURL('popup.html') };
const message = (value, sender = popup) => new Promise(resolve => listener(value, sender, resolve));
function localSender() {
    const key = data.lastLocalKey;
    const record = data[LOCAL_PREFIX + key];
    return { id: chrome.runtime.id, frameId: 0, url: chrome.runtime.getURL(`reader.html#capture=${key}`), tab: { id: record.targetTabId } };
}

test('pasted Markdown opens locally, reloads exactly, then transfers only on an explicit action', async () => {
    assert.deepEqual(await message({ type: 'capture.paste', ...raw }), { ok: true, destination: 'local' });
    const key = data.lastLocalKey, sender = localSender();
    assert.equal(Object.keys(data).filter(key => key.startsWith('capture:')).length, 0);
    assert.ok(data[LOCAL_PREFIX + key].expiresAt <= Date.now() + LOCAL_LIFETIME_MS);
    const result = await message({ type: 'local.get', captureKey: key }, sender);
    assert.equal(result.payload.content, raw.content);
    assert.equal((await message({ type: 'local.save', captureKey: key }, sender)).destination, 'account');
    const cloudKey = data.lastPendingKey, transfer = data['capture:' + cloudKey];
    assert.equal(transfer.payload.content, raw.content);
    assert.equal(tabs.get(transfer.targetTabId).url, `${origin}/reader/capture#capture=${cloudKey}`);
    const receiver = { id: chrome.runtime.id, frameId: 0, tab: { id: transfer.targetTabId }, url: tabs.get(transfer.targetTabId).url };
    assert.equal((await message({ type: 'capture.retrieve', captureKey: cloudKey }, receiver)).payload.content, raw.content);
    await message({ type: 'capture.ack', captureKey: cloudKey }, receiver);
    assert.equal(data['capture:' + cloudKey], undefined);
    assert.ok(data[LOCAL_PREFIX + key]);
});

test('rejects foreign tabs, content scripts, nested frames, bad keys and expired local captures', async () => {
    await createCapture(chrome, raw, 'local', origin);
    const key = data.lastLocalKey, sender = localSender(), record = data[LOCAL_PREFIX + key];
    assert.equal(isLocalReceiver(sender, record, chrome.runtime), true);
    for (const changed of [{ ...sender, id: 'other' }, { ...sender, tab: { id: 99 } }, { ...sender, frameId: 1 }, { ...sender, url: 'https://example.com' }]) {
        assert.equal((await message({ type: 'local.get', captureKey: key }, changed)).ok, false);
        assert.equal((await message({ type: 'local.save', captureKey: key }, changed)).ok, false);
    }
    assert.equal((await message({ type:'local.get', captureKey:'bad' }, sender)).ok, false);
    record.expiresAt = 0;
    assert.equal((await message({ type:'local.get', captureKey:key }, sender)).ok, false);
    await clearExpiredCaptures(chrome.storage.session);
    assert.equal(data[LOCAL_PREFIX + key], undefined);
});

test('reopens a closed local tab safely and removes only the requested local copy', async () => {
    await message({ type: 'capture.paste', ...raw });
    const key = data.lastLocalKey, oldSender = localSender();
    tabs.delete(oldSender.tab.id);
    assert.equal((await message({ type: 'local.reopen' })).ok, true);
    const sender = localSender(); assert.notEqual(sender.tab.id, oldSender.tab.id);
    assert.equal((await message({ type: 'local.get', captureKey: key }, oldSender)).ok, false);
    await message({ type:'local.save', captureKey:key }, sender);
    await message({ type:'local.remove', captureKey:key }, sender);
    assert.equal(data[LOCAL_PREFIX + key], undefined);
    assert.ok(data['capture:' + data.lastPendingKey]);
});

test('bounds simultaneous captures and cleans failed navigation without losing earlier captures', async () => {
    const results = await Promise.all(Array.from({ length: 22 }, () => message({ type:'capture.paste', ...raw })));
    assert.equal(results.filter(result => result.ok).length, 20);
    assert.equal(Object.keys(data).filter(key => key.startsWith(LOCAL_PREFIX)).length, 20);
    data = {}; tabs.clear(); failNavigation = true;
    await assert.rejects(createCapture(chrome, raw, 'local', origin), /Navigation unavailable/);
    assert.equal(Object.keys(data).filter(key => key.startsWith(LOCAL_PREFIX)).length, 0);
    assert.equal(tabs.size, 0);
});

test('lets the popup manage older local captures without exposing them to content scripts', async () => {
    await message({ type:'capture.paste', ...raw, title:'First' });
    const first = data.lastLocalKey;
    await message({ type:'capture.paste', ...raw, title:'Second' });
    const captures = (await message({ type:'local.list' })).captures;
    assert.equal(captures.length, 2);
    assert.equal(captures[0].content, undefined);
    assert.equal((await message({ type:'local.list' }, localSender())).ok, false);
    assert.equal((await message({ type:'local.reopen', captureKey:first })).ok, true);
    await message({ type:'local.forget', captureKey:first });
    assert.equal(data[LOCAL_PREFIX + first], undefined);
    assert.equal((await message({ type:'local.list' })).captures.length, 1);
});

test('keeps captures and previous bindings when reopening or retrying navigation fails', async () => {
    for (const destination of ['local', 'account']) {
        await message({ type:'capture.paste', ...raw, destination });
        const captureKey = data[destination === 'local' ? 'lastLocalKey' : 'lastPendingKey'];
        const key = (destination === 'local' ? LOCAL_PREFIX : 'capture:') + captureKey;
        const record = structuredClone(data[key]);
        tabs.delete(record.targetTabId);
        failNavigation = true;
        assert.equal((await message({ type:destination === 'local' ? 'local.reopen' : 'capture.retry' })).ok, false);
        assert.deepEqual(data[key], record);
        assert.equal([...tabs.values()].filter(tab => tab.url === 'about:blank').length, 0);
        failNavigation = false;
        assert.equal((await message({ type:destination === 'local' ? 'local.reopen' : 'capture.retry' })).ok, true);
        assert.notEqual(data[key].targetTabId, record.targetTabId);
    }
});

test('a failed new capture does not replace the last usable local capture', async () => {
    await message({ type:'capture.paste', ...raw });
    const first = data.lastLocalKey;
    failNavigation = true;
    assert.equal((await message({ type:'capture.paste', ...raw })).ok, false);
    assert.equal(data.lastLocalKey, first);
    failNavigation = false;
    assert.equal((await message({ type:'local.reopen' })).ok, true);
    assert.equal(tabs.size, 1);
});

test('isolates D2 evaluation from privileged extension pages and does not allow remote scripts', () => {
    assert.ok(!extensionCsp.includes('unsafe-eval'));
    assert.match(sandboxCsp, /sandbox allow-scripts/);
    assert.ok(!sandboxCsp.includes('allow-same-origin'));
    assert.equal(sandboxCsp.split(';').find(part => part.trim().startsWith('script-src')).trim(), "script-src 'self' 'unsafe-eval'");
    assert.match(sandboxCsp, /worker-src blob:/);
});
