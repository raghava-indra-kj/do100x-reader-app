/** Tests the packaged UI and its opaque sandbox over localhost. Chrome APIs are
 * deliberately simulated here; background protocol tests cover the real handlers.
 * This is not an installed-extension or account-integration verification. */
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const key = '11111111-1111-4111-8111-111111111111';
const content = [
    '# Reading with understanding', '', 'A reusable reader should preserve **every important idea**, while making the structure easy to follow.', '',
    '## Equations', '', 'Energy and mass are related by $E=mc^2$.', '', '$$\\int_0^1 x^2\\,dx=\\frac{1}{3}$$', '',
    '## Learning flow', '', '```d2', 'Read -> Understand -> Remember', '```', '',
    '```mermaid', 'flowchart LR', '  Read --> Reflect --> Recall', '```', '',
    '## Keep the source', '', '```typescript', 'const note = { source: "unchanged", revision: 1 };', '```', '',
    '| Action | Result |', '| --- | --- |', '| Read locally | No account needed |', '| Send to Reader | Continue with your saved tools |', '',
    '[Jump to equations](#equations)', '', '[Reference](https://example.com/reference)', '',
].join('\n');
const payload = { captureKey:key, title:'A calmer place to read', content, sourceUrl:'https://example.com/reading' };
const bootstrap = `
const listeners = [];
window.chrome = { runtime: { async sendMessage(message) {
  if (message.type === 'local.get') return { ok:true, payload:${JSON.stringify(payload)}, expiresAt:Date.now()+604800000 };
  if (message.type === 'local.list') return { ok:true, captures:[{ captureKey:'${key}', title:'A calmer place to read' }, { captureKey:'22222222-2222-4222-8222-222222222222', title:'Notes on learning and remembering' }] };
  if (message.type === 'local.reopen' || message.type === 'capture.start' || message.type === 'capture.paste') {
    if (message.destination === 'account') return { ok:false, error:'Preview only: account transfer is tested separately.' };
    if (message.type === 'capture.paste' && !message.content?.trim()) return { ok:false, error:'Paste some content first.' };
    window.open('/reader.html#capture=${key}', '_blank', 'noopener'); return { ok:true, destination:'local' };
  }
  if (message.type === 'local.remove') return { ok:true };
  return { ok:false, error:'Preview only: account transfer is tested separately.' };
} }, storage:{ session:{async get() { return {}; }}, local:{async get() { return JSON.parse(localStorage.getItem('preview-preferences') || '{}'); }, async set(values) { localStorage.setItem('preview-preferences',JSON.stringify(values)); }}, onChanged:{ addListener(fn) { listeners.push(fn); } } }, tabs:{ async create({url}) { window.open(url,'_blank','noopener'); } } };
`;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        const file = path.resolve(directory, '.' + pathname);
        if (!file.startsWith(directory + path.sep)) { response.writeHead(403); response.end(); return; }
        let body = pathname === '/preview-bootstrap.js' ? bootstrap : await readFile(file);
        if (pathname === '/reader.html') body = body.toString().replace('<script src="reader.js">', '<script src="preview-bootstrap.js"></script><script src="reader.js">');
        if (pathname === '/popup.html') body = body.toString().replace('<script src="popup.js">', '<script src="preview-bootstrap.js"></script><script src="popup.js">');
        const { content_security_policy: policy } = JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
        response.writeHead(200, {
            'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store',
            'Access-Control-Allow-Origin':'*', 'X-Content-Type-Options':'nosniff',
            'Content-Security-Policy': pathname === '/reader-sandbox.html' ? policy.sandbox : policy.extension_pages,
        });
        response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
}).listen(5188, '127.0.0.1', () => console.log(`Packaged extension UI preview (Chrome API fixture): http://127.0.0.1:5188/reader.html#capture=${key}`));
