import { MAX_CAPTURE_BYTES, PENDING_LIFETIME_MS, validKey, validatePayload } from './protocol.js';

export const LOCAL_PREFIX = 'local-reader:';
export const LOCAL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_BUDGET_BYTES = 7 * 1024 * 1024;

/** Shared across local reading and pending account transfers. Caller serializes mutations. */
export async function clearExpiredCaptures(storage, now = Date.now()) {
    const all = await storage.get(null);
    const keys = Object.entries(all).filter(([key, value]) =>
        (key.startsWith(LOCAL_PREFIX) || key.startsWith('capture:')) && (!Number.isFinite(value?.expiresAt) || value.expiresAt <= now)
    ).map(([key]) => key);
    if (keys.length) await storage.remove(keys);
}

export function assertCaptureCapacity(all, payload) {
    const records = Object.entries(all).filter(([key]) => key.startsWith(LOCAL_PREFIX) || key.startsWith('capture:'));
    if (records.length >= 20) throw new Error('Your temporary reader is full. Remove a local capture or finish an account transfer first.');
    // Session storage measures memory, not only encoded content. Leave room for overhead.
    const size = (JSON.stringify(records).length + JSON.stringify(payload).length) * 2;
    if (size > SESSION_BUDGET_BYTES) throw new Error('Temporary storage is full. Download or save a capture, then remove its local copy.');
}

export function isLocalReceiver(sender, record, runtime) {
    if (sender.id !== runtime.id || sender.frameId !== 0 || !record?.payload || !Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now() || sender.tab?.id !== record.targetTabId) return false;
    return sender.url === runtime.getURL(`reader.html#capture=${record.payload.captureKey}`);
}

/** Bind the nonce to a tab before navigating, so a fast page load cannot race setup. */
export async function createCapture(chrome, raw, destination, origin) {
    await clearExpiredCaptures(chrome.storage.session);
    const payload = validatePayload({ ...raw, captureKey: crypto.randomUUID() });
    const all = await chrome.storage.session.get(null);
    assertCaptureCapacity(all, payload);
    const local = destination === 'local';
    const key = (local ? LOCAL_PREFIX : 'capture:') + payload.captureKey;
    const record = { payload, expiresAt: Date.now() + (local ? LOCAL_LIFETIME_MS : PENDING_LIFETIME_MS), targetTabId: null };
    // Write before opening a tab: storage failures never leave an unusable Reader tab.
    await chrome.storage.session.set({ [key]: record });
    let tab;
    try {
        tab = await chrome.tabs.create({ url: 'about:blank' });
        if (!Number.isInteger(tab.id)) throw new Error('Couldn’t create a Reader tab.');
        record.targetTabId = tab.id;
        await chrome.storage.session.set({ [key]: record });
        const url = local ? chrome.runtime.getURL(`reader.html#capture=${payload.captureKey}`) : `${origin}/reader/capture#capture=${payload.captureKey}`;
        await chrome.tabs.update(tab.id, { url });
        await chrome.storage.session.set({ [local ? 'lastLocalKey' : 'lastPendingKey']: payload.captureKey, lastError: null });
    } catch (error) {
        await chrome.storage.session.remove(key);
        if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => undefined);
        throw error;
    }
    await chrome.action.setBadgeText({ text: '' }).catch(() => undefined);
    return { ok: true, destination };
}

/** Rebind a closed/navigated tab without losing the capture when navigation fails. */
export async function reopenCapture(chrome, key, record, url) {
    const existing = await chrome.tabs.get(record.targetTabId).catch(() => null);
    if (existing?.url === url) {
        await chrome.tabs.update(existing.id, { active: true });
        return;
    }
    let tab;
    try {
        tab = await chrome.tabs.create({ url: 'about:blank' });
        if (!Number.isInteger(tab.id)) throw new Error('Couldn’t create a Reader tab.');
        await chrome.storage.session.set({ [key]: { ...record, targetTabId: tab.id } });
        await chrome.tabs.update(tab.id, { url });
    } catch (error) {
        try { await chrome.storage.session.set({ [key]: record }); }
        finally { if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => undefined); }
        throw error;
    }
}

export async function localRecord(chrome, message, sender) {
    if (!validKey(message.captureKey)) throw new Error('This temporary capture is unavailable.');
    const key = LOCAL_PREFIX + message.captureKey;
    const record = (await chrome.storage.session.get(key))[key];
    if (!isLocalReceiver(sender, record, chrome.runtime)) throw new Error('This temporary capture expired or belongs to another tab. Open it again from the extension.');
    // Defense in depth for malformed storage and oversized messages.
    validatePayload(record.payload);
    return { key, record };
}

export { MAX_CAPTURE_BYTES };
