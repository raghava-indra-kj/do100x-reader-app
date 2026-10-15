// Disposable local database only. This entry point is not included in application builds.
import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma as db } from '../prisma';
import { attachSession, issueSession } from '../session';
import pagesRouter from '../pages';
import commentsRouter from '../comments';
import vocabularyRouter from '../vocabulary';
import { createQuizRouter } from '../quiz/quiz-router';
import { createReaderPreferencesRouter } from './reader-preferences';
import { createCapturesRouter } from './captures';

async function start() {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Reader preview requires a disposable local test database.');
    const user = await db.appuser.create({ data: { displayName: 'Reader preview', email: `reader-${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } });
    const page = await db.page.create({ data: { userId: user.id, sortOrder: 0, childrenCount: 0, title: 'Reading with durable notes', content: [
        '# Reading with durable notes',
        'A useful note follows the idea it belongs to. Select **this important sentence** and add your own explanation.',
        'The same words can appear again: **this important sentence**. Each occurrence has its own location.',
        '## Equations and examples',
        'Energy and mass are related by $E=mc^2$. We can comment on an equation as a whole.',
        '$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$',
        '| Operation | Expected result |\n| --- | --- |\n| Edit a word | Keep the note |\n| Remove the target | Preserve history |',
        '```ts\nconst note = { source: "stable", revision: 1 };\n```',
        '```d2\nRead -> Understand -> Remember\n```',
        '```mermaid\nflowchart LR\nRead --> Reflect --> Recall\n```',
    ].join('\n\n'), createdAt: new Date(), updatedAt: new Date() } });
    await db.comment.create({ data: { userId: user.id, pageId: page.id, pageTitle: page.title, selectedText: 'An older quotation', body: 'This legacy note remains available. Math works here too: $a^2+b^2=c^2$.', createdAt: new Date(), updatedAt: new Date() } });
    const app = express(); app.use(express.json({ limit: '10mb' }));
    app.get('/backend-api/auth/session', (_req, res) => { issueSession(res, user.id); res.json({ id: user.id, displayName: user.displayName, email: user.email, avatarUrl: null }); });
    app.get('/backend-api/user-preferences', (_req, res) => res.json({ motivationsEnabled: false }));
    app.use('/backend-api', attachSession(db));
    app.use('/backend-api/pages', pagesRouter); app.use('/backend-api/comments', commentsRouter);
    app.use('/backend-api/vocabulary', vocabularyRouter); app.use('/backend-api/quizzes', createQuizRouter(db));
    app.use('/backend-api/reader/captures', createCapturesRouter(db)); app.use('/backend-api/reader', createReaderPreferencesRouter());
    app.use('/backend-api', (_req, res) => res.status(404).json({ message: 'This service is unavailable in the local Reader preview.' }));
    app.use(express.static(path.resolve(process.cwd(), 'reader-frontend/dist')));
    app.get('*splat', (_req, res) => res.sendFile(path.resolve(process.cwd(), 'reader-frontend/dist/index.html')));
    const server = app.listen(5187, '127.0.0.1', () => console.log(`Reader database preview: http://127.0.0.1:5187/reader/pages/${page.id}`));
    const stop = () => server.close(() => { void db.$disconnect().then(() => process.exit(0)); });
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
void start().catch(error => { console.error('Reader preview failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
