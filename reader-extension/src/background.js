import { isCaptureReceiver, normalizeSource, validKey } from './protocol.js';
import { createCapture, reopenCapture, clearExpiredCaptures, localRecord, LOCAL_PREFIX } from './local-captures.js';
const ORIGIN = __READER_ORIGIN__;
const prefix = 'capture:';

async function clearExpired() {
    await clearExpiredCaptures(chrome.storage.session);
}
async function install() {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: 'read-selection', title: 'Read selection in do100x', contexts: ['selection'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    chrome.contextMenus.create({ id: 'read-article', title: 'Read this page in do100x', contexts: ['page'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    chrome.contextMenus.create({ id: 'save-selection', title: 'Send selection to do100x inbox', contexts: ['selection'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    await chrome.alarms.create('clear-pending-captures', { periodInMinutes: 1 });
    await serialize(clearExpired);
}
chrome.runtime.onInstalled.addListener(() => void install());
chrome.runtime.onStartup.addListener(() => void install());
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'clear-pending-captures') void serialize(clearExpired); });

// Prevent concurrent context-menu/popup actions from exceeding the session quota.
let queue = Promise.resolve();
function serialize(work) { const result = queue.then(work); queue = result.catch(() => undefined); return result; }
function openCapture(raw, destination = 'local') { return serialize(() => createCapture(chrome, raw, destination, ORIGIN)); }
async function captureTab(tab, mode, info, destination = 'local') {
    if (!tab?.id) throw new Error('Open a web page first.');
    normalizeSource(info?.frameUrl || tab.url);
    if (info?.editable) throw new Error('Paste editable text into the extension instead.');
    const target = { tabId: tab.id, frameIds: [info?.frameId ?? 0] };
    let payload;
    try {
        await chrome.scripting.executeScript({ target, files: ['capture.js'] });
        const results = await chrome.scripting.executeScript({ target, func: value => globalThis.Do100xCapture.extract(value), args: [mode] });
        payload = results[0]?.result;
    } catch (error) {
        if (mode === 'selection' && info?.selectionText?.trim()) payload = { title: tab.title || 'Selected passage', content: info.selectionText, sourceUrl: info.frameUrl || tab.url };
        else throw new Error(error.message || 'Chrome does not allow reading this page. Paste the text into the extension instead.');
    }
    return openCapture(payload, destination);
}
async function showError(error) {
    await chrome.storage.session.set({ lastError: error.message || 'Capture failed. Open the extension to try again.' });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#b23a28' });
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!['read-selection', 'read-article', 'save-selection'].includes(info.menuItemId)) return;
    void captureTab(tab, info.menuItemId === 'read-article' ? 'article' : 'selection', info, info.menuItemId === 'save-selection' ? 'account' : 'local').catch(showError);
});
async function handle(message, sender) {
    if (sender.id !== chrome.runtime.id) throw new Error('Unsupported sender.');
    if (['local.get', 'local.remove', 'local.save'].includes(message?.type)) {
        const { key, record } = await localRecord(chrome, message, sender);
        if (message.type === 'local.get') return { ok: true, payload: record.payload, expiresAt: record.expiresAt };
        if (message.type === 'local.remove') return serialize(async () => { await chrome.storage.session.remove(key); return { ok: true }; });
        // The local copy remains available until explicitly removed or expired.
        return openCapture(record.payload, 'account');
    }
    if (['capture.retrieve', 'capture.ack'].includes(message?.type)) {
        const receive = async () => {
        if (!validKey(message.captureKey)) return { ok: false };
        const key = prefix + message.captureKey;
        const record = (await chrome.storage.session.get(key))[key];
        if (!isCaptureReceiver(sender, record, ORIGIN)) return { ok: false };
        if (message.type === 'capture.ack') { await chrome.storage.session.remove(key); return { ok: true }; }
        return { ok: true, payload: record.payload };
        };
        return message.type === 'capture.ack' ? serialize(receive) : receive();
    }
    if (sender.tab || sender.url !== chrome.runtime.getURL('popup.html')) throw new Error('Open the extension to use this action.');
    if (message?.type === 'local.list') {
        await serialize(clearExpired);
        const all = await chrome.storage.session.get(null);
        return { ok:true, captures:Object.entries(all).filter(([key]) => key.startsWith(LOCAL_PREFIX)).map(([, record]) => ({ captureKey:record.payload.captureKey, title:record.payload.title, expiresAt:record.expiresAt })).sort((a,b) => b.expiresAt - a.expiresAt) };
    }
    if (message?.type === 'local.forget') {
        if (!validKey(message.captureKey)) throw new Error('This capture is unavailable.');
        return serialize(async () => { await chrome.storage.session.remove(LOCAL_PREFIX + message.captureKey); return { ok:true }; });
    }
    if (message?.type === 'capture.start' && ['article', 'selection'].includes(message.mode)) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return captureTab(tab, message.mode, undefined, message.destination === 'account' ? 'account' : 'local');
    }
    if (message?.type === 'capture.paste') return openCapture({ title: message.title, content: message.content, sourceUrl: null }, message.destination === 'account' ? 'account' : 'local');
    if (message?.type === 'capture.inbox') { await chrome.tabs.create({ url: `${ORIGIN}/reader/captures` }); return { ok: true }; }
    if (message?.type === 'local.reopen') {
        return serialize(async () => {
            const { lastLocalKey } = await chrome.storage.session.get('lastLocalKey');
            const captureKey = message.captureKey ?? lastLocalKey;
            const key = LOCAL_PREFIX + captureKey;
            const record = (await chrome.storage.session.get(key))[key];
            if (!validKey(captureKey) || !record || record.expiresAt <= Date.now()) throw new Error('No local capture is available. Read a page or paste some Markdown first.');
            await reopenCapture(chrome, key, record, chrome.runtime.getURL(`reader.html#capture=${captureKey}`));
            await chrome.storage.session.set({ lastLocalKey: captureKey });
            return { ok: true, destination: 'local' };
        });
    }
    if (message?.type === 'capture.retry') {
        return serialize(async () => {
        const { lastPendingKey } = await chrome.storage.session.get('lastPendingKey');
        if (!validKey(lastPendingKey)) throw new Error('No pending capture. Capture the page again.');
        const key = prefix + lastPendingKey;
        const record = (await chrome.storage.session.get(key))[key];
        if (!record || record.expiresAt <= Date.now()) throw new Error('The pending capture expired. Capture the page again.');
        await reopenCapture(chrome, key, record, `${ORIGIN}/reader/capture#capture=${lastPendingKey}`);
        return { ok: true, destination: 'account' };
        });
    }
    throw new Error('Unsupported extension action.');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    handle(message, sender).then(respond).catch(error => respond({ ok: false, error: error.message }));
    return true;
});
