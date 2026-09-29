/** Local-only browser verification harness. Fixtures have unique IDs and are cleaned up on exit. */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/prisma';
import { issueSession } from '../src/session';
import pagesRouter from '../src/pages';

async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.RUN_BROWSER_TESTS !== '1') {
        throw new Error('Browser fixtures require RUN_BROWSER_TESTS=1 in a nonproduction environment');
    }
    const userId = randomUUID();
    const pageId = randomUUID();
    const now = new Date();
    const content = '# Verification document\n\nParent body untouched.\n\n## Repeated\n\nFirst body to edit.\n\n### Child\n\nChild body must stay untouched.\n\n## Repeated\n\nSecond body untouched.\n\n```toml\nname = "keep"\n```\n';
    await prisma.$transaction([
        prisma.appuser.create({ data: { id: userId, username: `verify-${userId.slice(0, 7)}`, password: 'test', homepageId: pageId } }),
        prisma.page.create({ data: { id: pageId, userId, title: 'Section editing verification', content, childrenCount: 0, sortOrder: 1, createdAt: now, updatedAt: now } }),
    ]);
    const app = express();
    app.use(express.json());
    app.get('/__verify/start', (_req, res) => {
        issueSession(res, userId);
        const user = { id: userId, username: 'verification', password: 'test', homepageId: pageId };
        res.type('html').send(`<script>localStorage.setItem('current_user', ${JSON.stringify(JSON.stringify(user))});location.replace('/pages/${pageId}');</script>`);
    });
    app.get('/__verify/state', async (_req, res) => {
        const page = await prisma.page.findUniqueOrThrow({ where: { id: pageId } });
        res.json({ content: page.content, contentVersion: page.contentVersion, original: content, pageId });
    });
    app.post('/__verify/concurrent-edit', async (_req, res) => {
        const page = await prisma.page.findUniqueOrThrow({ where: { id: pageId } });
        await prisma.page.update({ where: { id: pageId, contentVersion: page.contentVersion }, data: { content: `${page.content}\nConcurrent external update.\n`, updatedAt: new Date() } });
        res.sendStatus(204);
    });
    app.use('/backend-api/pages', pagesRouter);
    app.get('/backend-api/user-preferences', (_req, res) => res.json({ motivationsEnabled: false }));
    app.get('/backend-api/comments', (_req, res) => res.json([]));
    app.get('/backend-api/vocabulary', (_req, res) => res.json([]));
    const frontend = path.resolve(__dirname, '../../reader-frontend/dist');
    app.use(express.static(frontend));
    app.get('*splat', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
    const server = app.listen(4317, '127.0.0.1', () => console.log('Browser verification: http://127.0.0.1:4317/__verify/start'));
    let cleaned = false;
    const cleanup = async () => {
        if (cleaned) return; cleaned = true;
        server.close();
        await prisma.page.deleteMany({ where: { id: pageId, userId } });
        await prisma.appuser.deleteMany({ where: { id: userId } });
        await prisma.$disconnect();
        console.log('Temporary verification account and page removed.');
    };
    app.post('/__verify/stop', async (_req, res) => { await cleanup(); res.sendStatus(204); });
    server.on('error', (error) => { console.error(error); void cleanup(); process.exitCode = 1; });
    process.on('SIGINT', () => { void cleanup(); });
    process.on('SIGTERM', () => { void cleanup(); });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
