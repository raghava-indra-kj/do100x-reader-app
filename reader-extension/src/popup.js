const status = document.querySelector('#status');
async function run(message) {
    document.querySelectorAll('button').forEach(button => { button.disabled = true; });
    status.textContent = 'Opening Reader…'; status.dataset.error = 'false';
    try {
        const response = await chrome.runtime.sendMessage(message);
        if (!response?.ok) throw new Error(response?.error || 'Couldn’t open Reader. Try again.');
        status.textContent = 'Opened in do100x. Sign in there if needed.';
    } catch (error) { status.textContent = error.message; status.dataset.error = 'true'; }
    finally { document.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
}
document.querySelector('#article').addEventListener('click', () => void run({ type: 'capture.start', mode: 'article' }));
document.querySelector('#selection').addEventListener('click', () => void run({ type: 'capture.start', mode: 'selection' }));
document.querySelector('#paste').addEventListener('click', () => void run({ type: 'capture.paste', title: document.querySelector('#title').value, content: document.querySelector('#content').value }));
document.querySelector('#inbox').addEventListener('click', () => void run({ type: 'capture.inbox' }));
document.querySelector('#retry').addEventListener('click', () => void run({ type: 'capture.retry' }));
chrome.storage.session.get('lastError').then(({ lastError }) => { if (lastError) { status.textContent = lastError; status.dataset.error = 'true'; } });
