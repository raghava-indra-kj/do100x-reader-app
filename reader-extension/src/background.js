import { isCaptureReceiver, normalizeSource, PENDING_LIFETIME_MS, validKey, validatePayload } from './protocol.js';
const ORIGIN = __READER_ORIGIN__;
const prefix = 'capture:';

async function clearExpired() {
    const all = await chrome.storage.session.get(null);
    const expired = Object.entries(all).filter(([key, value]) => key.startsWith(prefix) && value.expiresAt <= Date.now()).map(([key]) => key);
    if (expired.length) await chrome.storage.session.remove(expired);
}
async function install() {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: 'read-selection', title: 'Read selection in do100x', contexts: ['selection'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    chrome.contextMenus.create({ id: 'read-article', title: 'Read this page in do100x', contexts: ['page'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
    await chrome.alarms.create('clear-pending-captures', { periodInMinutes: 1 });
    await clearExpired();
}
chrome.runtime.onInstalled.addListener(() => void install());
chrome.runtime.onStartup.addListener(() => void install());
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'clear-pending-captures') void clearExpired(); });

async function openCapture(raw) {
    await clearExpired();
    const all = await chrome.storage.session.get(null);
    if (Object.keys(all).filter(key => key.startsWith(prefix)).length >= 10) throw new Error('Finish or close your pending captures before adding more. Pending captures expire after 30 minutes.');
    const payload = validatePayload({ ...raw, captureKey: crypto.randomUUID() });
    const storageKey = prefix + payload.captureKey;
    const record = { payload, expiresAt: Date.now() + PENDING_LIFETIME_MS, targetTabId: null };
    await chrome.storage.session.set({ [storageKey]: record });
    const tab = await chrome.tabs.create({ url: `${ORIGIN}/reader/capture#capture=${payload.captureKey}` });
    await chrome.storage.session.set({ [storageKey]: { ...record, targetTabId: tab.id }, lastPendingKey: payload.captureKey, lastError: null });
    await chrome.action.setBadgeText({ text: '' });
    return { ok: true };
}
async function captureTab(tab, mode, info) {
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
    return openCapture(payload);
}
async function showError(error) {
    await chrome.storage.session.set({ lastError: error.message || 'Capture failed. Open the extension to try again.' });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#b23a28' });
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!['read-selection', 'read-article'].includes(info.menuItemId)) return;
    void captureTab(tab, info.menuItemId === 'read-selection' ? 'selection' : 'article', info).catch(showError);
});
async function handle(message, sender) {
    if (sender.id !== chrome.runtime.id) throw new Error('Unsupported sender.');
    if (['capture.retrieve', 'capture.ack'].includes(message?.type)) {
        if (!validKey(message.captureKey)) return { ok: false };
        const key = prefix + message.captureKey;
        const record = (await chrome.storage.session.get(key))[key];
        if (!isCaptureReceiver(sender, record, ORIGIN)) return { ok: false };
        if (message.type === 'capture.ack') { await chrome.storage.session.remove(key); return { ok: true }; }
        return { ok: true, payload: record.payload };
    }
    if (sender.tab || sender.url !== chrome.runtime.getURL('popup.html')) throw new Error('Open the extension to use this action.');
    if (message?.type === 'capture.start' && ['article', 'selection'].includes(message.mode)) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return captureTab(tab, message.mode);
    }
    if (message?.type === 'capture.paste') return openCapture({ title: message.title, content: message.content, sourceUrl: null });
    if (message?.type === 'capture.inbox') { await chrome.tabs.create({ url: `${ORIGIN}/reader/captures` }); return { ok: true }; }
    if (message?.type === 'capture.retry') {
        const { lastPendingKey } = await chrome.storage.session.get('lastPendingKey');
        if (!validKey(lastPendingKey)) throw new Error('No pending capture. Capture the page again.');
        const key = prefix + lastPendingKey;
        const record = (await chrome.storage.session.get(key))[key];
        if (!record || record.expiresAt <= Date.now()) throw new Error('The pending capture expired. Capture the page again.');
        const tab = await chrome.tabs.create({ url: `${ORIGIN}/reader/capture#capture=${lastPendingKey}` });
        await chrome.storage.session.set({ [key]: { ...record, targetTabId: tab.id } });
        return { ok: true };
    }
    throw new Error('Unsupported extension action.');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    handle(message, sender).then(respond).catch(error => respond({ ok: false, error: error.message }));
    return true;
});
