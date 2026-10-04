'use strict';

const { spawnSync } = require('node:child_process');
const { profileEnvironment } = require('./environment.cjs');
const { runPrisma, spawnNpm } = require('./commands.cjs');

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* child already exited */ }
    }
  }
  const timer = setTimeout(() => {
    if (process.platform !== 'win32') for (const child of children) {
      if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ } }
    }
    process.exit(code);
  }, 3000);
  timer.unref();
  process.exitCode = code;
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

try {
  const env = profileEnvironment('development');
  // Vite's checked-in proxy targets port 3000; validate before touching the database.
  if (env.PORT !== '3000') throw new Error('Local development requires PORT=3000 to match the frontend proxy.');
  console.log('Preparing the database configured in reader-backend/.env…');
  runPrisma(['generate'], env);
  runPrisma(['migrate', 'deploy'], env);
  console.log('Starting development: http://localhost:5173 (backend: http://localhost:3000)');
  for (const workspace of ['reader-backend', 'reader-frontend']) {
    const child = spawnNpm(['run', 'dev', `--workspace=${workspace}`], env);
    children.push(child);
    child.on('error', () => { console.error(`Could not start ${workspace}. Install dependencies with npm install.`); stop(1); });
    child.on('exit', code => { if (!stopping) { console.error(`${workspace} stopped.`); stop(code || 1); } });
  }
} catch (error) { console.error(`Development stopped: ${error.message}`); stop(1); }
