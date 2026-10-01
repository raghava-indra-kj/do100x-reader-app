// Disposable local browser-verification server. Never points the app at the configured DB.
const { randomBytes, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const Module = require('node:module');
const path = require('node:path');
const express = require('express');
require('dotenv').config({ quiet: true });

const originalUrl = process.env.DATABASE_URL;
if (!originalUrl) throw new Error('DATABASE_URL is required');
const parsed = new URL(originalUrl);
if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) throw new Error('Browser fixture requires local MySQL');
const name = `reader_quiz_browser_${randomBytes(8).toString('hex')}`;
if (!/^reader_quiz_browser_[a-f0-9]{16}$/.test(name)) throw new Error('Unsafe fixture database name');
parsed.pathname = `/${name}`;
const disposableUrl = parsed.toString();
const AdminClient = require('@prisma/client').PrismaClient;
const admin = new AdminClient();
const isolatedClient = require(process.env.QUIZ_TEST_CLIENT_MODULE || '@prisma/client');
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@prisma/client') return isolatedClient;
  return load.call(this, request, parent, isMain);
};
require('ts-node/register/transpile-only');
let appDb;
let server;
let created = false;
let cleaning = false;

async function clean() {
  if (cleaning) return;
  cleaning = true;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (appDb) await appDb.$disconnect();
  if (created) {
    await admin.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
    console.log(`Removed disposable browser database ${name}`);
  }
  await admin.$disconnect();
}
async function main() {
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  const result = spawnSync(process.execPath, [require.resolve('prisma'), 'db', 'push', '--skip-generate', '--schema', 'prisma/schema.prisma'], {
    cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: disposableUrl }, encoding: 'utf8', timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Prisma setup failed');
  process.env.DATABASE_URL = disposableUrl;
  appDb = new isolatedClient.PrismaClient({ datasources: { db: { url: disposableUrl } } });
  const owner = await appDb.appuser.create({ data: { id: randomUUID(), username: `q${randomBytes(6).toString('hex')}`, password: '0000' } });
  const page = await appDb.page.create({ data: { id: randomUUID(), userId: owner.id, title: 'Quiz browser fixture', content: '## Reader page\n\nA disposable quiz testing page.', childrenCount: 0, sortOrder: 0, isPublic: true, createdAt: new Date(), updatedAt: new Date() } });
  const { issueSession } = require('../src/session');
  const { createQuizRouter } = require('../src/quiz/quiz-router');
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.get('/__verify/login', (_req, res) => {
    issueSession(res, owner.id);
    res.type('html').send(`<script>localStorage.setItem('current_user', ${JSON.stringify(JSON.stringify({ id: owner.id, username: owner.username, password: '0000', homepageId: page.id }))}); location.replace('/pages/${page.id}');</script>`);
  });
  app.post('/__verify/stop', (_req, res) => { res.json({ stopped: true }); setImmediate(() => clean().catch((error) => { console.error(error); process.exitCode = 1; })); });
  app.get('/__verify/state', async (_req, res) => res.json({ pageId: page.id, quizzes: await appDb.quiz.count(), attempts: await appDb.quiz_attempt.count() }));
  app.get('/backend-api/pages/:id', (req, res) => {
    if (req.params.id !== page.id) { res.status(404).json({ message: 'Page not found' }); return; }
    res.json({ id: page.id, userId: owner.id, parentPageId: null, title: page.title, content: page.content, contentVersion: 0, category: null, sortOrder: 0, childrenCount: 0, isPublic: true, isPubliclyAccessible: true, isOwner: true, createdAt: page.createdAt, updatedAt: page.updatedAt, meaningSystemPrompt: null, explanationSystemPrompt: null, doubtSystemPrompt: null });
  });
  app.get('/backend-api/pages', (_req, res) => res.json([]));
  app.get('/backend-api/comments', (_req, res) => res.json([]));
  app.get('/backend-api/vocabulary', (_req, res) => res.json([]));
  app.get('/backend-api/user-preferences', (_req, res) => res.json({}));
  app.use('/backend-api/quizzes', createQuizRouter(appDb));
  const frontend = path.resolve(__dirname, '../../reader-frontend/dist');
  app.use(express.static(frontend));
  app.get('*splat', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
  server = app.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(JSON.stringify({ url: `http://127.0.0.1:${port}/__verify/login`, pageId: page.id, database: name }));
  });
}
process.on('SIGINT', () => { clean().then(() => process.exit(0)).catch(() => process.exit(1)); });
main().catch(async (error) => { console.error(error); await clean(); process.exitCode = 1; });
