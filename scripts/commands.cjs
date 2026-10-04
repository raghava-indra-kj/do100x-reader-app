'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { root, backend } = require('./environment.cjs');

function npmCommand(args) {
  // npm run supplies its CLI path. Shell invocation is only used for npm.cmd on
  // Windows; arguments here are fixed script-owned values, never configuration.
  if (process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args], shell: false };
  }
  return { command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args, shell: process.platform === 'win32' };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} failed; the operation has stopped.`);
}
function runNpm(args, env) {
  const invocation = npmCommand(args);
  run(invocation.command, invocation.args, { env, shell: invocation.shell });
}
function prismaCli() {
  const manifest = require.resolve('prisma/package.json', { paths: [backend] });
  return path.join(path.dirname(manifest), 'build', 'index.js');
}
function runPrisma(args, env) {
  run(process.execPath, [prismaCli(), ...args, '--schema', path.join(backend, 'prisma', 'schema.prisma')], { cwd: backend, env });
}
function spawnNpm(args, env) {
  const invocation = npmCommand(args);
  return spawn(invocation.command, invocation.args, {
    cwd: root, env, stdio: 'inherit', shell: invocation.shell,
    detached: process.platform !== 'win32', windowsHide: true,
  });
}
module.exports = { run, runNpm, runPrisma, spawnNpm };
