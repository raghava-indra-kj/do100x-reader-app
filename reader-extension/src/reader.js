import { validKey, MAX_CAPTURE_BYTES } from './protocol.js';
import { LOCAL_PREFIX } from './local-captures.js';
import { hydrateIcons, iconMarkup } from './icons.js';
hydrateIcons();

const frame = document.querySelector('#reader-frame');
const status = document.querySelector('#status');
const key = new URLSearchParams(location.hash.slice(1)).get('capture');
let payload = null, expiresAt = 0, ready = false, sourceVisible = false, fontSize = 19;
let dark = matchMedia('(prefers-color-scheme: dark)').matches, readingFont = 'lexend';
const channel = crypto.randomUUID();

function report(message, error = false) { status.textContent = message; status.dataset.error = String(error); }
function unavailable(message) {
    payload = null; frame.hidden = true; frame.src = 'about:blank';
    document.querySelector('#markdown-source').textContent = '';
    document.querySelector('#markdown-source').hidden = true;
    document.querySelector('#empty').hidden = false;
    document.querySelector('#empty-message').textContent = message;
    document.querySelector('#lifetime').textContent = 'Temporary capture closed';
    document.querySelectorAll('nav button,nav input').forEach(button => button.disabled = true);
}
async function send(type) {
    const response = await chrome.runtime.sendMessage({ type, captureKey: key });
    if (!response?.ok) throw new Error(response?.error || 'The action could not be completed. Try again.');
    return response;
}
function updateAppearance() {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const themeButton = document.querySelector('#theme');
    themeButton.innerHTML = iconMarkup(dark ? 'sun' : 'moon');
    themeButton.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme');
    themeButton.dataset.tooltip = dark ? 'Light theme' : 'Dark theme';
    document.querySelector('#font-size').textContent = String(fontSize);
    document.querySelector(`input[name="reading-font"][value="${readingFont}"]`).checked = true;
    document.querySelector('#smaller').disabled = fontSize <= 14;
    document.querySelector('#larger').disabled = fontSize >= 32;
    if (ready && payload) frame.contentWindow.postMessage({ type: 'reader.appearance', channel, dark, fontSize, readingFont }, '*');
}
function saveAppearance() { updateAppearance(); void chrome.storage.local.set({ readerAppearance:{ dark, fontSize, readingFont } }).catch(() => undefined); }
function render() {
    if (!ready || !payload) return;
    frame.contentWindow.postMessage({ type: 'reader.render', channel, payload, dark, fontSize, readingFont }, '*');
}
// Cover both cached iframe loads and a host script that starts after the child.
const connect = () => frame.contentWindow?.postMessage({ type:'reader.connect', channel }, '*');
frame.addEventListener('load', connect);
connect();
// The opaque sandbox cannot access storage or the extension API. Its only inbound
// bridge actions are bounded clipboard writes and explicitly clicked safe links.
window.addEventListener('message', async event => {
    if (event.source !== frame.contentWindow || event.origin !== 'null') return;
    if (event.data?.type === 'reader.ready') { ready = true; render(); return; }
    if (!payload || event.data?.channel !== channel) return;
    if (event.data.type === 'reader.link' && typeof event.data.href === 'string') {
        try {
            const url = new URL(event.data.href);
            if (!['https:', 'http:', 'mailto:'].includes(url.protocol) || url.username || url.password) return;
            await chrome.tabs.create({ url: url.href });
        } catch { report('This link could not be opened.', true); }
    }
    if (event.data.type === 'reader.copy' && typeof event.data.text === 'string' && event.data.text.length <= MAX_CAPTURE_BYTES) {
        let ok = false;
        try { await navigator.clipboard.writeText(event.data.text); ok = true; } catch { /* Report to the source control. */ }
        frame.contentWindow.postMessage({ type: 'reader.copied', channel, requestId: event.data.requestId, ok }, '*');
    }
});

document.querySelector('#smaller').onclick = () => { fontSize = Math.max(14, fontSize - 2); saveAppearance(); };
document.querySelector('#larger').onclick = () => { fontSize = Math.min(32, fontSize + 2); saveAppearance(); };
document.querySelector('#theme').onclick = () => { dark = !dark; saveAppearance(); };
const fontMenu = document.querySelector('#font-menu');
document.querySelectorAll('input[name="reading-font"]').forEach(input => input.addEventListener('change', () => { readingFont = input.value; saveAppearance(); fontMenu.open = false; fontMenu.querySelector('summary').focus(); }));
document.addEventListener('pointerdown', event => { if (!fontMenu.contains(event.target)) fontMenu.open = false; });
window.addEventListener('blur', () => { fontMenu.open = false; });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && fontMenu.open) { fontMenu.open = false; fontMenu.querySelector('summary').focus(); } });
document.querySelector('#source').onclick = () => {
    if (!payload) return;
    sourceVisible = !sourceVisible;
    frame.hidden = sourceVisible;
    document.querySelector('#markdown-source').hidden = !sourceVisible;
    document.querySelector('#source').setAttribute('aria-pressed', String(sourceVisible));
};
document.querySelector('#copy').onclick = async () => {
    if (!payload) return;
    try { await navigator.clipboard.writeText(payload.content); report('Markdown copied.'); }
    catch { report('Couldn’t copy. Open Source to select the Markdown, or download it.', true); }
};
document.querySelector('#download').onclick = () => {
    if (!payload) return;
    const url = URL.createObjectURL(new Blob([payload.content], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `${payload.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'capture'}.md`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.querySelector('#save').onclick = async event => {
    event.currentTarget.disabled = true;
    try { await send('local.save'); report('Opened your account Reader. Sign in there to save this capture for 7 days, then choose Keep to make it permanent.'); }
    catch (error) { report(error.message, true); document.querySelector('#save').disabled = false; }
};
document.querySelector('#remove').onclick = async () => {
    try { await send('local.remove'); unavailable('The local copy was removed. Any copy already saved to your account is kept separately.'); }
    catch (error) { report(error.message, true); }
};
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes[LOCAL_PREFIX + key] && !changes[LOCAL_PREFIX + key].newValue) unavailable('This local capture was removed or expired.');
});
setInterval(() => { if (payload && expiresAt <= Date.now()) unavailable('This local capture expired.'); }, 30_000);

async function start() {
    try {
        try {
            const { readerAppearance } = await chrome.storage.local.get('readerAppearance');
            if (readerAppearance) {
                if (typeof readerAppearance.dark === 'boolean') dark = readerAppearance.dark;
                if (Number.isFinite(readerAppearance.fontSize)) fontSize = Math.max(14, Math.min(32, readerAppearance.fontSize));
                if (['lexend', 'merriweather'].includes(readerAppearance.readingFont)) readingFont = readerAppearance.readingFont;
            }
        } catch { /* Reading works even if preferences cannot be loaded. */ }
        if (!validKey(key)) throw new Error('The capture link is invalid.');
        const result = await send('local.get'); payload = result.payload; expiresAt = result.expiresAt;
        document.title = `${payload.title} · Temporary Reader`;
        document.querySelector('#capture-name').textContent = payload.title;
        document.querySelector('#markdown-source').textContent = payload.content;
        document.querySelector('#lifetime').textContent = 'Local copy · clears on restart or after 7 days';
        if (payload.sourceUrl) { const link = document.querySelector('#source-link'); link.href = payload.sourceUrl; link.hidden = false; document.querySelector('#source-label').textContent = new URL(payload.sourceUrl).hostname.replace(/^www\./, ''); link.setAttribute('aria-label', 'Open original page'); }
        updateAppearance(); render();
    } catch (error) { unavailable(error.message); }
}
updateAppearance(); void start();
