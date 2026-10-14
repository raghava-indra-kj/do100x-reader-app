import { build } from 'esbuild';
import { mkdir, writeFile, copyFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
const app = new URL(process.env.READER_APP_URL || 'https://www.do100x.com');
if (app.pathname !== '/' || app.search || app.hash || app.username || app.password || (app.protocol !== 'https:' && !(app.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(app.hostname)))) throw new Error('READER_APP_URL must be an HTTPS origin, or localhost for development.');
await mkdir(out, { recursive: true });
// Only remove known build files inside this workspace's output directory.
for (const name of ['background.js', 'capture.js', 'bridge.js', 'popup.js', 'manifest.json', 'popup.html', 'popup.css', 'icon.png']) {
  try { await unlink(path.join(out, name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const common = { bundle: true, platform: 'browser', target: 'chrome123', sourcemap: false, define: { __READER_ORIGIN__: JSON.stringify(app.origin) } };
await build({ ...common, entryPoints: ['background', 'bridge', 'popup'].map(name => path.join(root, `src/${name}.js`)), outdir: out, format: 'iife' });
await build({ ...common, entryPoints: [path.join(root, 'src/capture.js')], outfile: path.join(out, 'capture.js'), format: 'iife', globalName: 'Do100xCapture' });
await Promise.all(['popup.html', 'popup.css'].map(name => copyFile(path.join(root, 'src', name), path.join(out, name))));
await copyFile(path.join(root, '../reader-frontend/public/branding/do100x-wordmark.png'), path.join(out, 'icon.png'));
await writeFile(path.join(out, 'manifest.json'), JSON.stringify({
  manifest_version: 3, minimum_chrome_version: '123', name: 'do100x Reader', version: '0.1.0',
  description: 'Read a selected passage or article in your do100x temporary inbox. Keep what matters before it expires.',
  permissions: ['activeTab', 'scripting', 'contextMenus', 'storage', 'alarms'],
  background: { service_worker: 'background.js' }, action: { default_popup: 'popup.html', default_title: 'Read with do100x', default_icon: 'icon.png' },
  icons: { 16: 'icon.png', 48: 'icon.png', 128: 'icon.png' },
  content_scripts: [{ matches: [`${app.origin}/*`], js: ['bridge.js'], run_at: 'document_start' }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'" },
}, null, 2));
console.log(`Chrome extension built in ${out} for ${app.origin}`);
