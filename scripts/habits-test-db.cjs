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
  const calendar = process.argv.includes('--calendar');
  const markdown = process.argv.includes('--markdown');
  if (markdown && !calendar) throw new Error('--markdown requires --calendar for the complete application schema.');
  if (process.argv.includes('--mcp') && !calendar) throw new Error('--mcp requires --calendar so all three feature schemas are available.');
  const releaseIndex = process.argv.indexOf('--release-dir');
  const releaseDirectory = releaseIndex >= 0 ? process.argv[releaseIndex + 1] : null;
  if (releaseIndex >= 0 && (!calendar || !releaseDirectory || releaseDirectory.startsWith('--') || process.argv.includes('--preview'))) throw new Error('--release-dir needs a directory and --calendar, without --preview.');
  const feature = calendar ? 'calendar' : 'habits';
  const values = parseEnv(fs.readFileSync(path.join(backend, '.env'), 'utf8'));
  const source = new URL(values.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('Habit database checks only run against a local MySQL server.');
  const name = `do100x_${feature}_test_${randomBytes(6).toString('hex')}`;
  const admin = new PrismaClient({ datasourceUrl: source.href });
  let created = false, fixtureDb, migrationStage;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    source.pathname = `/${name}`;
    const env = { ...process.env, DATABASE_URL: source.href, NODE_ENV: 'test', HABITS_DATABASE_TEST: '1', CALENDAR_DATABASE_TEST: calendar ? '1' : '0', APP_ORIGINS: calendar ? 'http://127.0.0.1:5184' : 'http://127.0.0.1:5183', GOOGLE_CLIENT_ID: 'habits-test.apps.googleusercontent.com', SESSION_SECRET: randomBytes(48).toString('hex') };
    console.log(`Isolated ${feature} database: ${name}`);
    // Install the previous release, put representative existing data in it, then upgrade.
    migrationStage = fs.mkdtempSync(path.join(os.tmpdir(), 'do100x-habits-migrations-'));
    fs.copyFileSync(path.join(backend, 'prisma/schema.prisma'), path.join(migrationStage, 'schema.prisma'));
    fs.mkdirSync(path.join(migrationStage, 'migrations'));
    for (const entry of ['migration_lock.toml', '20261004000000_initial_schema', '20261014000000_reader_captures']) fs.cpSync(path.join(backend, 'prisma/migrations', entry), path.join(migrationStage, 'migrations', entry), { recursive: true });
    if (calendar) fs.cpSync(path.join(backend, 'prisma/migrations/20261015000000_habits'), path.join(migrationStage, 'migrations/20261015000000_habits'), { recursive: true });
    run(process.execPath, [requireBackend.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(migrationStage, 'schema.prisma')], { env });
    fixtureDb = new PrismaClient({ datasourceUrl: source.href });
    const user = await fixtureDb.appuser.create({ data: { email: 'existing-data@example.test' } });
    const page = { id: randomUUID() };
    // Prior-schema SQL remains valid when the generated client knows additive fields.
    await fixtureDb.$executeRaw`INSERT INTO page (id, userId, title, content, sortOrder, childrenCount, createdAt, updatedAt) VALUES (${page.id}, ${user.id}, 'Existing Reader page', '# Keep this content', 1, 0, NOW(6), NOW(6))`;
    const commentId = randomUUID();
    await fixtureDb.$executeRaw`INSERT INTO comment (id, userId, pageId, pageTitle, selectedText, body, createdAt, updatedAt) VALUES (${commentId}, ${user.id}, ${page.id}, 'Existing Reader page', 'Keep this content', 'Keep this note', NOW(6), NOW(6))`;
    const task = { id: randomUUID() };
    // Use the prior SQL contract: the generated client already knows newer columns.
    await fixtureDb.$executeRaw`INSERT INTO task (id, userId, title, totalTimeSeconds, createdAt, updatedAt) VALUES (${task.id}, ${user.id}, 'Existing task', 900, NOW(6), NOW(6))`;
    await fixtureDb.time_session.create({ data: { userId: user.id, taskId: task.id, startTime: new Date('2026-10-01T09:00:00Z'), endTime: new Date('2026-10-01T09:15:00Z'), durationSeconds: 900, notes: 'Keep focus history', createdAt: new Date(), updatedAt: new Date() } });
    const book = await fixtureDb.finance_book.create({ data: { userId: user.id, name: 'Existing finances', currency: 'INR', currencyScale: 2, timezone: 'Asia/Kolkata', requestKey: randomUUID(), requestHash: 'a'.repeat(64) } });
    const account = await fixtureDb.finance_account.create({ data: { bookId: book.id, name: 'Existing account', requestKey: randomUUID(), requestHash: 'b'.repeat(64) } });
    if (calendar) {
      const habit = await fixtureDb.habit.create({ data: { userId: user.id, requestKey: randomUUID(), requestHash: 'c'.repeat(64), name: 'Existing habit', description: 'Keep this habit', icon: 'book', color: 'orange', section: 'Learning', timezone: 'Asia/Kolkata', plans: [], pauses: [] } });
      await fixtureDb.habit_log.create({ data: { userId: user.id, habitId: habit.id, date: '2026-10-01', status: 'RECORDED', value: 2, note: 'Keep this reflection' } });
    }
    const oldTask = async () => (await fixtureDb.$queryRaw`SELECT id, userId, listId, parentId, title, description, status, priority, dueDate, dueTime, sortOrder, totalTimeSeconds, completedAt, createdAt, updatedAt, deletedAt FROM task WHERE id = ${task.id}`)[0];
    const oldPage = async () => (await fixtureDb.$queryRaw`SELECT id, userId, parentId, title, content, contentVersion, category, sortOrder, childrenCount, isPublic, createdAt, updatedAt, deletedAt, captureExpiresAt, captureKey, captureSourceUrl, meaningSystemPrompt, explanationSystemPrompt, doubtSystemPrompt FROM page WHERE id = ${page.id}`)[0];
    const oldComment = async () => (await fixtureDb.$queryRaw`SELECT id, userId, pageId, pageTitle, sectionTitle, selectedText, body, linkedPageId, isExplanation, createdAt, updatedAt FROM comment WHERE id = ${commentId}`)[0];
    const snapshot = async () => JSON.stringify(await Promise.all([fixtureDb.appuser.findUnique({ where: { id: user.id } }), oldPage(), oldComment(), oldTask(), fixtureDb.time_session.findMany({ where: { userId: user.id } }), fixtureDb.finance_book.findUnique({ where: { id: book.id } }), fixtureDb.finance_account.findUnique({ where: { id: account.id } }), ...(calendar ? [fixtureDb.habit.findMany({ where: { userId: user.id }, include: { logs: true } })] : [])]));
    const before = await snapshot();
    runPrisma(['migrate', 'deploy'], env);
    assert.equal(await snapshot(), before, 'Existing app records must survive the migration unchanged.');
    console.log('Upgrade preserved existing account, Reader, Finance, Tasks and focus records' + (calendar ? ', plus Habits and check-ins.' : '.'));
    if (calendar) await requireBackend('esbuild').build({ entryPoints: [path.join(backend, 'src/calendar/ical-worker.ts')], outfile: path.join(backend, 'dist/ical-worker.js'), bundle: true, platform: 'node', target: 'node22', format: 'cjs' });
    if (process.argv.includes('--preview')) {
      if (markdown) env.APP_ORIGINS = 'http://127.0.0.1:5187';
      if (process.argv.includes('--seed')) env.HABITS_PREVIEW_SEED = '1';
      const preview = markdown ? 'reader' : feature;
      await requireBackend('esbuild').build({ entryPoints: [path.join(backend, `src/${preview}/dev-preview.ts`)], outfile: path.join(backend, `dist/${preview}-preview.js`), bundle: true, platform: 'node', target: 'node22', format: 'cjs', external: ['@prisma/client', 'express', 'dotenv/config', 'zod'] });
      const child = spawn(process.execPath, [path.join(backend, `dist/${preview}-preview.js`)], { cwd: root, env, stdio: 'inherit', windowsHide: true });
      const stop = () => child.kill();
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      await new Promise((resolve, reject) => { child.on('exit', code => code ? reject(new Error('Preview exited with an error.')) : resolve()); child.on('error', reject); });
      process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    } else if (releaseDirectory) {
      await require('./verify-calendar-release.cjs').verifyCalendarRelease(releaseDirectory, env, fixtureDb);
    } else if (markdown) {
      runNpm(['run', 'test', '--workspace=reader-backend', '--', 'src/reader/annotations.database.test.ts', 'src/page-content.database.test.ts'], { ...env, RUN_DATABASE_TESTS: '1', MARKDOWN_DATABASE_TEST: '1', APP_ORIGINS: 'http://localhost:3000' });
    } else {
      runNpm(['run', 'test', '--workspace=reader-backend', '--', ...(calendar ? ['src/calendar/calendar.database.test.ts', 'src/timer.database.test.ts'] : ['src/habits/habit.database.test.ts']), ...(process.argv.includes('--mcp') ? ['src/mcp/tools/features.database.test.ts'] : [])], { ...env, MCP_FEATURE_DATABASE_TEST: calendar && process.argv.includes('--mcp') ? '1' : '0' });
      if (process.argv.includes('--contracts')) runNpm(['run', 'test', '--workspace=reader-backend', '--', 'src/auth/auth-router.database.test.ts', 'src/finance/adapters.database.test.ts', 'src/finance/import-service.database.test.ts', 'src/finance/ledger-service.database.test.ts', 'src/quiz/quiz-router.database.test.ts', 'src/mcp/tools/quizzes.database.test.ts'], { ...env, RUN_DATABASE_TESTS: '1', APP_ORIGINS: 'http://localhost:3000' });
    }
    assert.equal(await snapshot(), before, 'Feature operations must not modify the preserved existing app records.');
  } finally {
    if (fixtureDb) await fixtureDb.$disconnect();
    if (created) {
      // The target is the exact random database successfully created above, never a configured database.
      if (!/^do100x_(habits|calendar)_test_[a-f0-9]{12}$/.test(name)) throw new Error('Unexpected test database name.');
      await admin.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
      console.log(`Removed the disposable ${feature} database.`);
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
