import { z } from 'zod';
import { readJson } from './test-support/read-json';
import express from 'express';
import type { Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { issueSession, attachSession } from './session';

type TestParent = { id: string; userId: string; title: string; parentId: string | null; isPublic: boolean; deletedAt?: Date; captureExpiresAt?: Date };
const state = vi.hoisted(() => ({ row: null as any, parents: [] as TestParent[] }));
vi.mock('./prisma', () => ({ prisma: { $queryRaw: async () => [], comment: { findMany: async () => [], updateMany: async () => ({ count: 0 }) }, auth_identity: { findUnique: vi.fn(async ({ where }: any) => ({ userId: where.userId_provider.userId })) }, page: {
    findFirst: vi.fn(async ({ where }: any) => {
        const row = state.row?.id === where.id ? state.row : state.parents.find(p => p.id === where.id);
        if (!row || row.deletedAt || row.id !== where.id || (where.userId && row.userId !== where.userId)
            || (where.captureExpiresAt === null && row.captureExpiresAt)) return null;
        return { ...row };
    }),
    findMany: vi.fn(async ({ where }: any) => [state.row, ...state.parents].filter(row => row &&
        (typeof where.parentId === 'string' ? row.parentId === where.parentId : where.parentId.in.includes(row.parentId)) &&
        row.userId === where.userId && !row.deletedAt && !(where.captureExpiresAt === null && row.captureExpiresAt)
    ).map(row => ({ ...row, childrenCount: row.childrenCount ?? 0 }))),
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
    beforeEach(() => { state.parents = []; });
    const snapshot = () => readJson(fetch(`${base}/pages/page/edit-targets`, { headers: { cookie } }), z.object({ contentVersion: z.number(), sections: z.array(z.object({ target: z.unknown(), expectedBodyHash: z.string() })) }));
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
        const page = await readJson(fetch(`${base}/pages/page`, { headers: { cookie: otherCookie } }), z.object({ isOwner: z.boolean() }));
        expect(page.isOwner).toBe(false);
        expect((await fetch(`${base}/pages/page/edit-targets`, { headers: { cookie: otherCookie } })).status).toBe(404);
    });

    const pathSchema = z.object({ ancestors: z.array(z.object({ id: z.string(), title: z.string() })), parentPageId: z.string().nullable() });
    const readPath = (owner: boolean) => readJson(fetch(`${base}/pages/page`, { headers: owner ? { cookie } : {} }), pathSchema);

    it('returns the complete owner path and only the shared subtree to a visitor', async () => {
        state.parents = [
            { id: 'home', parentId: null, userId: 'owner', title: 'Home', isPublic: false },
            { id: 'shared', parentId: 'home', userId: 'owner', title: 'Shared book', isPublic: true },
            { id: 'chapter', parentId: 'shared', userId: 'owner', title: 'Chapter', isPublic: false },
        ];
        state.row.parentId = 'chapter';
        state.row.isPublic = false;
        const path = state.parents.map(({ id, title }) => ({ id, title }));
        expect(await readPath(true)).toEqual({ ancestors: path, parentPageId: 'chapter' });
        expect(await readPath(false)).toEqual({ ancestors: path.slice(1), parentPageId: 'chapter' });
        state.parents[1].isPublic = false;
        expect((await fetch(`${base}/pages/page`)).status).toBe(404);
        state.row.isPublic = true;
        expect(await readPath(false)).toEqual({ ancestors: [], parentPageId: null });
    });

    it('stops a malformed cycle and ignores deleted or cross-account parents', async () => {
        state.row.parentId = 'parent';
        const parent: TestParent = { id: 'parent', userId: 'owner', parentId: 'page', title: 'Parent', isPublic: false };
        state.parents = [parent];
        expect((await readPath(true)).ancestors).toEqual([{ id: 'parent', title: 'Parent' }]);
        parent.userId = 'other';
        expect(await readPath(true)).toEqual({ ancestors: [], parentPageId: null });
        parent.userId = 'owner';
        parent.deletedAt = new Date();
        expect(await readPath(true)).toEqual({ ancestors: [], parentPageId: null });
    });
    it('browses the visible path, siblings and subpages without crossing the shared boundary', async () => {
        const node = (id: string, parentId: string | null, isPublic = false): TestParent => ({ id, title: id, parentId, userId: 'owner', isPublic });
        state.parents = [node('home', null), node('shared', 'home', true), node('chapter', 'shared'), node('sibling', 'shared'),
            node('private', 'home'), node('appendix', 'page'), node('lazy', 'sibling'),
            { ...node('foreign', 'shared'), userId: 'other' }, { ...node('capture', 'shared'), captureExpiresAt: new Date() }];
        state.row.parentId = 'chapter';
        state.row.isPublic = false;
        const schema = z.object({ path: z.array(z.object({ id: z.string() })), children: z.array(z.object({ id: z.string(), parentPageId: z.string() })) });
        const visitor = await readJson(fetch(`${base}/pages/page/navigation`), schema);
        expect(visitor.path.map(p => p.id)).toEqual(['shared', 'chapter', 'page']);
        expect(visitor.children.map(p => p.id).sort()).toEqual(['appendix', 'chapter', 'page', 'sibling']);
        const owner = await readJson(fetch(`${base}/pages/page/navigation`, { headers: { cookie } }), schema);
        expect(owner.path.map(p => p.id)).toEqual(['home', 'shared', 'chapter', 'page']);
        expect(owner.children.map(p => p.id).sort()).toEqual(['appendix', 'chapter', 'page', 'private', 'shared', 'sibling']);
        const childList = z.array(z.object({ id: z.string() }));
        expect((await readJson(fetch(`${base}/pages?parentPageId=shared`), childList)).map(p => p.id)).toEqual(['chapter', 'sibling']);
        expect((await readJson(fetch(`${base}/pages?parentPageId=sibling`), childList)).map(p => p.id)).toEqual(['lazy']);
        expect((await fetch(`${base}/pages/private/navigation`)).status).toBe(404);
        expect((await fetch(`${base}/pages?parentPageId=private`)).status).toBe(404);
        expect((await fetch(`${base}/pages/capture/navigation`, { headers: { cookie } })).status).toBe(404);
        state.parents[1].isPublic = false;
        state.row.isPublic = true;
        const direct = await readJson(fetch(`${base}/pages/page/navigation`), schema);
        expect(direct.path.map(p => p.id)).toEqual(['page']);
        expect(direct.children.map(p => p.id)).toEqual(['appendix']);
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
