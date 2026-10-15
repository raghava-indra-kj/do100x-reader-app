'use strict';
// Public artifact: build from source, then archive only extension output.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { root } = require('./environment.cjs');
const { run, runNpm } = require('./commands.cjs');
const output = path.join(root, 'reader-extension/dist');
const downloads = path.join(root, 'reader-frontend/public/downloads');
runNpm(['run', 'build:extension'], { ...process.env, READER_APP_URL: 'https://www.do100x.com' });
function validate(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || entry.name.startsWith('.') || /(?:secret|backup|\.sql$)/i.test(entry.name)) throw new Error('Unexpected file in public extension build');
    if (entry.isDirectory()) validate(path.join(dir, entry.name));
    else if (!entry.isFile()) throw new Error('Unexpected extension asset');
  }
}
validate(output);
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
if (manifest.content_scripts[0].matches[0] !== 'https://www.do100x.com/*') throw new Error('Public extension must target production');
fs.mkdirSync(downloads, { recursive: true });
if (fs.realpathSync(downloads) !== downloads) throw new Error('Unsafe public download directory');
const filename = `do100x-reader-${manifest.version}.zip`;
const destination = path.join(downloads, filename);
if (fs.existsSync(destination)) fs.unlinkSync(destination);
if (process.platform === 'win32') run('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(root, 'scripts/archive.ps1'), '-SourceDirectory', output, '-DestinationZip', destination]);
else run('zip', ['-q', '-r', destination, '.'], { cwd: output });
const data = fs.readFileSync(destination);
fs.writeFileSync(path.join(downloads, 'extension-release.json'), JSON.stringify({ version: manifest.version, url: `/downloads/${filename}`, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }, null, 2));
console.log(`Public extension ready: ${filename} (${data.length} bytes)`);
