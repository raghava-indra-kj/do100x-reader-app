import { hydrateIcons, iconMarkup } from './icons.js';
hydrateIcons();
document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
void chrome.storage.local.get('readerAppearance').then(({ readerAppearance }) => {
    if (typeof readerAppearance?.dark === 'boolean') document.documentElement.dataset.theme = readerAppearance.dark ? 'dark' : 'light';
}).catch(() => undefined);
const status = document.querySelector('#status');
const destination = () => document.querySelector('input[name="destination"]:checked').value;
const content = document.querySelector('#content');
const updatePaste = () => { document.querySelector('#paste').disabled = !content.value.trim(); };
content.addEventListener('input', updatePaste);
document.querySelectorAll('input[name="destination"]').forEach(input => input.addEventListener('change', () => {
    document.querySelector('#destination-hint').textContent = destination() === 'local' ? 'No sign-in · stays in this browser session' : 'Sign in to do100x · keep within 7 days';
}));
async function run(message) {
    document.querySelectorAll('button').forEach(button => { button.disabled = true; });
    status.textContent = 'Opening Reader…'; status.dataset.error = 'false';
    try {
        const response = await chrome.runtime.sendMessage(message);
        if (!response?.ok) throw new Error(response?.error || 'Couldn’t open Reader. Try again.');
        status.textContent = response.destination === 'local' ? 'Opened locally. No content was sent to your account.' : 'Opened in do100x. Sign in there if needed.';
    } catch (error) { status.textContent = error.message; status.dataset.error = 'true'; }
    finally { document.querySelectorAll('button').forEach(button => { button.disabled = false; }); updatePaste(); void loadLocalCaptures(); }
}
async function loadLocalCaptures() {
    const result = await chrome.runtime.sendMessage({ type:'local.list' }).catch(() => null);
    if (!result?.ok) return;
    document.querySelector('#local-captures').hidden = !result.captures.length;
    const list = document.querySelector('#capture-list'); list.replaceChildren();
    for (const capture of result.captures) {
        const row = document.createElement('div'); row.className = 'capture-row';
        const open = document.createElement('button'); open.className = 'capture-open'; open.innerHTML = iconMarkup('file');
        const label = document.createElement('span'); label.className = 'capture-label'; label.textContent = capture.title; open.append(label);
        open.onclick = () => void run({ type:'local.reopen', captureKey:capture.captureKey });
        const remove = document.createElement('button'); remove.className = 'icon-button tooltip-end'; remove.innerHTML = iconMarkup('close'); remove.dataset.tooltip = 'Remove local copy'; remove.setAttribute('aria-label', `Remove local capture: ${capture.title}`);
        remove.onclick = async () => {
            remove.disabled = true;
            try {
                const response = await chrome.runtime.sendMessage({ type:'local.forget', captureKey:capture.captureKey });
                if (!response?.ok) throw new Error(response?.error || 'Couldn’t remove this local capture. Try again.');
                status.textContent = 'Local capture removed.'; status.dataset.error = 'false';
                await loadLocalCaptures();
            } catch (error) { status.textContent = error.message; status.dataset.error = 'true'; }
            finally { remove.disabled = false; }
        };
        row.append(open, remove); list.append(row);
    }
}
void loadLocalCaptures();
document.querySelector('#article').addEventListener('click', () => void run({ type: 'capture.start', mode: 'article', destination: destination() }));
document.querySelector('#selection').addEventListener('click', () => void run({ type: 'capture.start', mode: 'selection', destination: destination() }));
document.querySelector('#paste').addEventListener('click', () => void run({ type: 'capture.paste', title: document.querySelector('#title').value.trim() || 'Copied text', content: content.value, destination: destination() }));
document.querySelector('#inbox').addEventListener('click', () => void run({ type: 'capture.inbox' }));
document.querySelector('#retry').addEventListener('click', () => void run({ type: 'capture.retry' }));
document.querySelector('#import-file').addEventListener('click', () => document.querySelector('#file').click());
document.querySelector('#file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) { status.textContent = 'Choose a file smaller than 512 KB.'; status.dataset.error = 'true'; return; }
    try { document.querySelector('#title').value = file.name.replace(/\.(md|markdown|txt)$/i, ''); content.value = await file.text(); document.querySelector('#paste-panel').open = true; updatePaste(); content.focus(); status.textContent = 'File ready. Choose Open in Reader.'; status.dataset.error = 'false'; }
    catch { status.textContent = 'Couldn’t read this file.'; status.dataset.error = 'true'; }
});
chrome.storage.session.get('lastError').then(({ lastError }) => { if (lastError) { status.textContent = lastError; status.dataset.error = 'true'; } });
