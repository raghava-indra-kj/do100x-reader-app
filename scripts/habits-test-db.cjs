'use strict';
// Dedicated disposable MySQL database. Never applies migrations to .env's database.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { parseEnv } = require('node:util');
const { randomBytes, randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const { root, backend } = require('./environment.cjs');
const { run, runPrisma, runNpm } = require('./commands.cjs');
const requireBackend = createRequire(path.join(backend, 'package.json'));
const { PrismaClient } = requireBackend('@prisma/client');

async function main() {
  const values = parseEnv(fs.readFileSync(path.join(backend, '.env'), 'utf8'));
  const source = new URL(values.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('Habit database checks only run against a local MySQL server.');
  const name = `do100x_habits_test_${randomBytes(6).toString('hex')}`;
  const admin = new PrismaClient({ datasourceUrl: source.href });
  let created = false, fixtureDb, migrationStage;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    source.pathname = `/${name}`;
    const env = { ...process.env, DATABASE_URL: source.href, NODE_ENV: 'test', HABITS_DATABASE_TEST: '1', APP_ORIGINS: 'http://127.0.0.1:5183', GOOGLE_CLIENT_ID: 'habits-test.apps.googleusercontent.com', SESSION_SECRET: randomBytes(48).toString('hex') };
    console.log(`Isolated Habits database: ${name}`);
    // Install the previous release, put representative existing data in it, then upgrade.
    migrationStage = fs.mkdtempSync(path.join(os.tmpdir(), 'do100x-habits-migrations-'));
    fs.copyFileSync(path.join(backend, 'prisma/schema.prisma'), path.join(migrationStage, 'schema.prisma'));
    fs.mkdirSync(path.join(migrationStage, 'migrations'));
    for (const entry of ['migration_lock.toml', '20261004000000_initial_schema', '20261014000000_reader_captures']) fs.cpSync(path.join(backend, 'prisma/migrations', entry), path.join(migrationStage, 'migrations', entry), { recursive: true });
    run(process.execPath, [requireBackend.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(migrationStage, 'schema.prisma')], { env });
    fixtureDb = new PrismaClient({ datasourceUrl: source.href });
    const user = await fixtureDb.appuser.create({ data: { email: 'existing-data@example.test' } });
    const page = await fixtureDb.page.create({ data: { userId: user.id, title: 'Existing Reader page', content: '# Keep this content', sortOrder: 1, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() } });
    const task = await fixtureDb.task.create({ data: { userId: user.id, title: 'Existing task', totalTimeSeconds: 900, createdAt: new Date(), updatedAt: new Date() } });
    const book = await fixtureDb.finance_book.create({ data: { userId: user.id, name: 'Existing finances', currency: 'INR', currencyScale: 2, timezone: 'Asia/Kolkata', requestKey: randomUUID(), requestHash: 'a'.repeat(64) } });
    const account = await fixtureDb.finance_account.create({ data: { bookId: book.id, name: 'Existing account', requestKey: randomUUID(), requestHash: 'b'.repeat(64) } });
    const snapshot = async () => JSON.stringify(await Promise.all([fixtureDb.appuser.findUnique({ where: { id: user.id } }), fixtureDb.page.findUnique({ where: { id: page.id } }), fixtureDb.task.findUnique({ where: { id: task.id } }), fixtureDb.finance_book.findUnique({ where: { id: book.id } }), fixtureDb.finance_account.findUnique({ where: { id: account.id } })]));
    const before = await snapshot();
    runPrisma(['migrate', 'deploy'], env);
    assert.equal(await snapshot(), before, 'Existing app records must survive the Habits migration unchanged.');
    console.log('Upgrade preserved existing account, Reader, Finance and Tasks records.');
    if (process.argv.includes('--preview')) {
      if (process.argv.includes('--seed')) env.HABITS_PREVIEW_SEED = '1';
      await requireBackend('esbuild').build({ entryPoints: [path.join(backend, 'src/habits/dev-preview.ts')], outfile: path.join(backend, 'dist/habits-preview.js'), bundle: true, platform: 'node', target: 'node22', format: 'cjs', external: ['@prisma/client', 'express', 'dotenv/config', 'zod'] });
      const child = spawn(process.execPath, [path.join(backend, 'dist/habits-preview.js')], { cwd: root, env, stdio: 'inherit', windowsHide: true });
      const stop = () => child.kill();
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      await new Promise((resolve, reject) => { child.on('exit', code => code ? reject(new Error('Preview exited with an error.')) : resolve()); child.on('error', reject); });
      process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    } else {
      runNpm(['run', 'test', '--workspace=reader-backend', '--', 'src/habits/habit.database.test.ts'], env);
    }
    assert.equal(await snapshot(), before, 'Habits operations must not modify existing app records.');
  } finally {
    if (fixtureDb) await fixtureDb.$disconnect();
    if (created) {
      // The target is the exact random database successfully created above, never a configured database.
      if (!/^do100x_habits_test_[a-f0-9]{12}$/.test(name)) throw new Error('Unexpected test database name.');
      await admin.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
      console.log('Removed the disposable Habits database.');
    }
    await admin.$disconnect();
    if (migrationStage) {
      const resolved = fs.realpathSync(migrationStage), parent = fs.realpathSync(os.tmpdir());
      if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('do100x-habits-migrations-')) throw new Error('Refusing to remove an unexpected staging directory.');
      fs.rmSync(resolved, { recursive: true });
    }
  }
}
main().catch(error => { console.error(error.message.replace(/mysql:\/\/[^\s]+/g, '[database connection]')); process.exitCode = 1; });
