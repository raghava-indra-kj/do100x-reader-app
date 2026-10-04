'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { root, readProfile } = require('./environment.cjs');
const { run, runNpm, runPrisma } = require('./commands.cjs');

const releases = path.join(root, 'releases');
let staging, partial;

function copyFile(relative, destination = relative) {
  const source = path.join(root, relative);
  const stat = fs.lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${relative}`);
  const target = path.join(staging, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.copyFileSync(source, target);
}
function copyDirectory(relative) {
  const source = path.join(root, relative);
  if (!fs.lstatSync(source).isDirectory()) throw new Error(`Expected a directory: ${relative}`);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Deployment assets cannot contain symlinks: ${relative}/${entry.name}`);
    if (entry.name.startsWith('.env') || /^client_secret.*\.json$/i.test(entry.name)) throw new Error('Unexpected secret file in deployment assets.');
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) copyDirectory(child);
    else if (entry.isFile()) copyFile(child);
  }
}
function cleanStaging() {
  if (!staging || !fs.existsSync(staging)) return;
  const resolved = fs.realpathSync(staging);
  const base = fs.realpathSync(releases);
  if (path.dirname(resolved) !== base || !path.basename(resolved).startsWith('.package-')) {
    throw new Error('Refusing to clean an unexpected staging directory.');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  staging = undefined;
}

try {
  // Validate and capture the private configuration without passing it to builds.
  const production = readProfile('production');
  if (!fs.existsSync(path.join(root, 'package-lock.json'))) throw new Error('Install project dependencies with npm install first.');
  fs.mkdirSync(releases, { recursive: true, mode: 0o700 });
  if (path.dirname(fs.realpathSync(releases)) !== fs.realpathSync(root)) throw new Error('releases must be a directory directly inside the project, not an external symlink.');
  if (process.platform !== 'win32') {
    // Check the archive utility before spending time building.
    run('zip', ['-v'], { stdio: 'ignore' });
  }

  const buildEnv = {
    ...process.env,
    NODE_ENV: 'production',
    // Generation never opens a database connection. Do not supply production
    // credentials, and never run migrate/setup/prod from the packaging command.
    DATABASE_URL: 'mysql://build_only:unused@127.0.0.1:3306/build_only',
  };
  for (const key of ['SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'APP_ORIGINS', 'PORT', 'DOTENV_CONFIG_PATH', 'DOTENV_CONFIG_OVERRIDE']) delete buildEnv[key];
  console.log('Generating the local Prisma client (no database connection)…');
  runPrisma(['generate'], buildEnv);
  console.log('Building frontend and backend…');
  runNpm(['run', 'build'], buildEnv);

  staging = fs.mkdtempSync(path.join(releases, '.package-'));
  fs.chmodSync(staging, 0o700);
  copyFile('package-lock.json');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  // The ZIP is a runtime artifact, not a checkout with development/build tools.
  manifest.scripts = { start: 'bash start.sh' };
  fs.writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  copyFile('reader-backend/package.json');
  copyFile('reader-frontend/package.json');
  for (const entry of fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Workspace directories cannot be symlinks when packaging.');
    if (entry.isDirectory()) copyFile(path.join('packages', entry.name, 'package.json'));
  }
  copyFile('reader-backend/dist/index.js');
  copyFile('reader-backend/dist/index.js.map');
  copyDirectory('reader-frontend/dist');
  copyFile('reader-backend/prisma/schema.prisma');
  copyDirectory('reader-backend/prisma/migrations');
  for (const file of ['environment.cjs', 'commands.cjs', 'production-env.cjs', 'prepare-hosting.cjs']) copyFile(`scripts/${file}`);
  copyFile('docs/shared-hosting.md', 'DEPLOYMENT.md');
  const shell = fs.readFileSync(path.join(root, 'start.sh'), 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(path.join(staging, 'start.sh'), shell, { mode: 0o700 });
  fs.writeFileSync(path.join(staging, 'reader-backend', '.env.prod'), production.raw, { mode: 0o600 });
  const builtAt = new Date().toISOString();
  const name = `do100x-${builtAt.replace(/[-:.]/g, '')}-${randomUUID().slice(0, 8)}.zip`;
  const destination = path.join(releases, name);
  partial = path.join(releases, name.replace(/\.zip$/, '-partial.zip'));
  fs.writeFileSync(path.join(staging, 'release.json'), `${JSON.stringify({ name, builtAt, node: process.versions.node }, null, 2)}\n`);
  console.log('Creating private deployment ZIP…');
  if (process.platform === 'win32') {
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'archive.ps1'), '-SourceDirectory', staging, '-DestinationZip', partial]);
  } else {
    run('zip', ['-q', '-r', partial, '.'], { cwd: staging });
  }
  fs.chmodSync(partial, 0o600);
  // Remove the uncompressed secret before publishing the completed artifact.
  cleanStaging();
  fs.renameSync(partial, destination); partial = undefined;
  console.log(`Ready: releases/${name}`);
  console.log('This ZIP contains production credentials. Keep it private and outside the public web root.');
} catch (error) {
  console.error(`Packaging stopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  try { cleanStaging(); }
  catch { console.error('Could not remove private staging files. Remove the .package- directory inside releases before sharing anything.'); process.exitCode = 1; }
  if (partial && fs.existsSync(partial)) {
    const resolved = path.resolve(partial);
    if (path.dirname(resolved) === fs.realpathSync(releases) && path.basename(resolved).startsWith('do100x-') && resolved.endsWith('-partial.zip')) {
      try { fs.unlinkSync(resolved); } catch { console.error('A private partial ZIP remains in releases. Remove it before sharing anything.'); }
    }
  }
}
