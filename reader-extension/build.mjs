import { build } from 'esbuild';
import { mkdir, writeFile, copyFile, unlink, lstat, rm, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { extensionCsp, sandboxCsp } from './security.mjs';
import { d2SandboxPlugin } from './d2-sandbox-plugin.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
const require = createRequire(import.meta.url);
const app = new URL(process.env.READER_APP_URL || 'https://www.do100x.com');
if (app.pathname !== '/' || app.search || app.hash || app.username || app.password || (app.protocol !== 'https:' && !(app.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(app.hostname)))) throw new Error('READER_APP_URL must be an HTTPS origin, or localhost for development.');
try {
  const stat = await lstat(out);
  if (stat.isSymbolicLink() || await realpath(out) !== out) throw new Error('Unsafe extension output directory');
  await rm(out, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(out, { recursive: true });
// Only remove known build files inside this workspace's output directory.
for (const name of ['background.js', 'capture.js', 'bridge.js', 'popup.js', 'reader.js', 'reader-sandbox.js', 'reader-sandbox.css', 'manifest.json', 'popup.html', 'popup.css', 'reader.html', 'reader.css', 'reader-sandbox.html', 'icon.png']) {
  try { await unlink(path.join(out, name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const common = { bundle: true, platform: 'browser', target: 'chrome123', sourcemap: false, define: { __READER_ORIGIN__: JSON.stringify(app.origin), 'process.env.NODE_ENV': '"production"' } };
await build({ ...common, entryPoints: ['background', 'bridge', 'popup', 'reader'].map(name => path.join(root, `src/${name}.js`)), outdir: out, format: 'iife' });
await build({ ...common, entryPoints: [path.join(root, 'src/capture.js')], outfile: path.join(out, 'capture.js'), format: 'iife', globalName: 'Do100xCapture' });
await build({ ...common, entryPoints: [path.join(root, 'src/reader-sandbox.jsx')], outfile: path.join(out, 'reader-sandbox.js'), format: 'iife', jsx: 'automatic', minify: true, plugins:[d2SandboxPlugin], assetNames:'assets/[name]-[hash]', loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file' } });
await build({ entryPoints:[path.join(root,'src/ui.css')], outfile:path.join(out,'ui.css'), bundle:true, minify:true, assetNames:'assets/[name]-[hash]', loader:{ '.woff2':'file' } });
await mkdir(path.join(out,'licenses'), { recursive:true });
for (const font of ['lexend','merriweather','jetbrains-mono']) {
  await copyFile(require.resolve(`@fontsource-variable/${font}/LICENSE`),path.join(out,'licenses',`${font}.txt`));
}
await Promise.all(['popup.html', 'popup.css', 'reader.html', 'reader.css', 'reader-sandbox.html'].map(name => copyFile(path.join(root, 'src', name), path.join(out, name))));
await copyFile(path.join(root, '../reader-frontend/public/branding/do100x-wordmark.png'), path.join(out, 'icon.png'));
await writeFile(path.join(out, 'manifest.json'), JSON.stringify({
  manifest_version: 3, minimum_chrome_version: '123', name: 'do100x Reader', version: require('./package.json').version,
  description: 'Read selections, articles and Markdown locally, with diagrams and math. Send what matters to your do100x inbox.',
  permissions: ['activeTab', 'scripting', 'contextMenus', 'storage', 'alarms'],
  background: { service_worker: 'background.js' }, action: { default_popup: 'popup.html', default_title: 'Read with do100x', default_icon: 'icon.png' },
  icons: { 16: 'icon.png', 48: 'icon.png', 128: 'icon.png' },
  content_scripts: [{ matches: [`${app.origin}/*`], js: ['bridge.js'], run_at: 'document_start' }],
  sandbox: { pages: ['reader-sandbox.html'] },
  content_security_policy: { extension_pages: extensionCsp, sandbox: sandboxCsp },
}, null, 2));
console.log(`Chrome extension built in ${out} for ${app.origin}`);
