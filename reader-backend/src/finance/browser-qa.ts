import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { attachSession, clearSession, issueSession, readSession, requireTrustedOrigin } from '../session';
import { createFinanceRouter } from './finance-router';

/** Local browser tests use a rolled-back Google identity fixture, never real finances. */
async function main() {
  if (process.env.RUN_FINANCE_BROWSER_QA !== '1' || process.env.NODE_ENV === 'production') throw new Error('Finance QA is disabled');
  const port = Number(process.env.FINANCE_QA_PORT ?? '4318');
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid QA port');
  process.env.NODE_ENV = 'test'; process.env.APP_ORIGINS = `http://127.0.0.1:${port}`;
  process.env.SESSION_SECRET = randomBytes(48).toString('base64url');
  const db = new PrismaClient(), rollback = new Error('QA fixture rollback');
  try { await db.$transaction(async tx => {
    const user = await tx.appuser.create({ data: { email: `browser-qa-${randomUUID()}@example.com`, displayName: 'Finance QA (temporary)', identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
    const app = express(); app.use(express.json({ limit: '10mb' })); app.use(attachSession(tx));
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    app.get('/__qa/start', (_req, res) => { issueSession(res, user.id); res.redirect('/finance'); });
    app.post('/__qa/end', requireTrustedOrigin, (_req, res) => { res.json({ rollback: true }); finish(); });
    app.get('/backend-api/auth/session', (req, res) => { if (readSession(req) !== user.id) { res.status(401).json({ message: 'Not signed in' }); return; } res.json({ id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl }); });
    app.post('/backend-api/auth/logout', requireTrustedOrigin, (_req, res) => { clearSession(res); res.sendStatus(204); });
    app.get('/backend-api/user-preferences', (req, res) => { if (!readSession(req)) { res.sendStatus(401); return; } res.json({ motivationsEnabled: false }); });
    app.use('/backend-api/finance', createFinanceRouter(tx));
    app.use('/backend-api', (_req, res) => res.status(404).json({ message: 'Not mounted in isolated Finance QA' }));
    const dist = path.resolve(__dirname, '../../reader-frontend/dist');
    app.use(express.static(dist)); app.get('*splat', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    const server = app.listen(port, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    console.log(`Finance browser QA: http://127.0.0.1:${port}/__qa/start (rolled-back fixture)`);
    const shutdown = () => finish(); process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
    const timeout = setTimeout(finish, 25 * 60 * 1000);
    try { await finished; } finally { clearTimeout(timeout); process.off('SIGINT', shutdown); process.off('SIGTERM', shutdown); await new Promise<void>(resolve => server.close(() => resolve())); }
    throw rollback;
  }, { timeout: 30 * 60 * 1000 }); } catch (cause) { if (cause !== rollback) throw cause; } finally { await db.$disconnect(); }
  console.log('Finance browser QA stopped; all fixture data rolled back.');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
