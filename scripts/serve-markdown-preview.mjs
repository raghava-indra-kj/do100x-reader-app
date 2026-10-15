import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await readFile(path.join(root, 'releases/markdown-package-verification.json'), 'utf8'));
const consumer = await realpath(report.consumer);
const temporaryRoot = await realpath(tmpdir());
const isolatedConsumer = path.dirname(consumer) === temporaryRoot && /^reader-md-react(?:18|19)-[A-Za-z0-9]+$/.test(path.basename(consumer));
if (!isolatedConsumer && !consumer.startsWith(path.join(root, 'releases') + path.sep)) throw new Error('Unexpected preview directory.');
const directory = path.join(consumer, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(directory, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403); response.end(); return; }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(5186, '127.0.0.1', () => console.log('Standalone Markdown preview: http://127.0.0.1:5186/'));
