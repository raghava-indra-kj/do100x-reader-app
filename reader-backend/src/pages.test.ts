import express from 'express';
import type { Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { issueSession, attachSession } from './session';

const state = vi.hoisted(() => ({ row: null as any }));
vi.mock('./prisma', () => ({ prisma: { auth_identity: { findUnique: vi.fn(async ({ where }: any) => ({ userId: where.userId_provider.userId })) }, page: {
    findFirst: vi.fn(async ({ where }: any) => {
        const row = state.row;
        if (!row || row.deletedAt || row.id !== where.id || (where.userId && row.userId !== where.userId)) return null;
        return { ...row };
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.contentVersion !== state.row.contentVersion || where.userId !== state.row.userId || state.row.deletedAt) return { count: 0 };
        state.row = { ...state.row, ...data, contentVersion: state.row.contentVersion + 1 };
        return { count: 1 };
    }),
} } }));
import pagesRouter from './pages';

describe('page editing HTTP contract', () => {
    let server: Server;
    let base: string;
    let cookie: string;
    beforeAll(async () => {
        const app = express(); app.use(express.json()); app.use(attachSession());
        app.post('/fixture-session/:id', (req, res) => { issueSession(res, req.params.id); res.sendStatus(204); });
        app.use('/pages', pagesRouter);
        server = await new Promise<Server>((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
        const address = server.address(); base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
        const response = await fetch(`${base}/fixture-session/owner`, { method: 'POST' }); cookie = response.headers.get('set-cookie')!.split(';')[0];
    });
    afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
    beforeEach(() => { state.row = { id: 'page', userId: 'owner', content: '## First\n\nold\n\n### Child\n\nchild\n\n## Next\n\nnext', contentVersion: 0, deletedAt: null, title: 'Keep title', category: 'Keep category', meaningSystemPrompt: 'Keep prompt', isPublic: true, parentId: null }; });
    const snapshot = async () => (await fetch(`${base}/pages/page/edit-targets`, { headers: { cookie } })).json();
    const save = async (body: any, headers: Record<string, string> = { cookie }) => fetch(`${base}/pages/page/section-body`, { method: 'PATCH', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...headers }, body: JSON.stringify(body) });

    it('requires a real signed session, not an asserted owner header', async () => {
        expect((await save({}, { 'x-user-id': 'owner' })).status).toBe(401);
        expect((await save({}, { cookie: 'reader_session=forged.payload' })).status).toBe(401);
    });
    it('rejects expired and tampered signed sessions', async () => {
        const [payload, signature] = cookie.slice('reader_session='.length).split('.');
        const modified = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), userId: 'visitor' })).toString('base64url');
        expect((await save({}, { cookie: `reader_session=${modified}.${signature}` })).status).toBe(401);
        const future = Date.now() + 8 * 24 * 60 * 60 * 1000;
        const clock = vi.spyOn(Date, 'now').mockReturnValue(future);
        try { expect((await save({}, { cookie })).status).toBe(401); } finally { clock.mockRestore(); }
    });
    it('keeps public visitors read-only even when logged in as a different user', async () => {
        const session = await fetch(`${base}/fixture-session/visitor`, { method: 'POST' });
        const otherCookie = session.headers.get('set-cookie')!.split(';')[0];
        const page = await (await fetch(`${base}/pages/page`, { headers: { cookie: otherCookie } })).json();
        expect(page.isOwner).toBe(false);
        expect((await fetch(`${base}/pages/page/edit-targets`, { headers: { cookie: otherCookie } })).status).toBe(404);
    });
    it('saves only the target body and retains all page metadata and child content', async () => {
        const s = await snapshot(); const target = s.sections[0];
        const response = await save({ contentVersion: s.contentVersion, target: target.target, expectedBodyHash: target.expectedBodyHash, newBody: 'new' });
        expect(response.status).toBe(200);
        expect(state.row.content).toBe('## First\n\nnew\n\n### Child\n\nchild\n\n## Next\n\nnext');
        expect(state.row.title).toBe('Keep title'); expect(state.row.category).toBe('Keep category'); expect(state.row.meaningSystemPrompt).toBe('Keep prompt');
    });
    it('reports conflicts rather than accepting a second save from an old snapshot', async () => {
        const s = await snapshot(); const body = { contentVersion: s.contentVersion, ...s.sections[0], newBody: 'new' };
        expect((await save(body)).status).toBe(200);
        expect((await save({ ...body, newBody: 'second' })).status).toBe(409);
        expect(state.row.content).toContain('\n\nnew\n\n');
    });
    it('blocks malformed requests and structure-changing Markdown', async () => {
        expect((await save({})).status).toBe(400);
        const s = await snapshot();
        expect((await save({ contentVersion: s.contentVersion, ...s.sections[0], newBody: '```\nunclosed' })).status).toBe(422);
        expect(state.row.contentVersion).toBe(0);
    });
    it('blocks cross-origin cookie writes', async () => {
        const s = await snapshot();
        expect((await save({ contentVersion: s.contentVersion, ...s.sections[0], newBody: 'new' }, { cookie, origin: 'https://unrelated.test' })).status).toBe(403);
    });
    it('full-page edits use the same version gate and reject stale overwrites', async () => {
        const s = await snapshot();
        await save({ contentVersion: s.contentVersion, ...s.sections[0], newBody: 'new' });
        const response = await fetch(`${base}/pages/page`, { method: 'PUT', headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Title', content: 'overwrite', contentVersion: 0, category: null }) });
        expect(response.status).toBe(409); expect(state.row.content).toContain('new');
    });
    it('full-page writes reject omitted content instead of accidentally clearing metadata', async () => {
        const response = await fetch(`${base}/pages/page`, { method: 'PUT', headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Title', contentVersion: 0 }) });
        expect(response.status).toBe(400); expect(state.row.title).toBe('Keep title'); expect(state.row.contentVersion).toBe(0);
    });
});
