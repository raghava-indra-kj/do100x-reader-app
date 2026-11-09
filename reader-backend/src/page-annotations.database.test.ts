import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma as db } from './prisma';
import { savePageContent } from './page-content';
import { attachSession, issueSession } from './session';
import pageAnnotationsRouter from './page-annotations';

const source = '# Guide\n\nIntro.\n\n## Joins\n\nAbout joins.\n\n### Inner\n\nInner joins.\n\n## Indexes\n\nAbout indexes.\n';
const JOINS = '2:0:joins';

describe.skipIf(process.env.MARKDOWN_DATABASE_TEST !== '1')('page annotations on isolated local MySQL', () => {
  let owner: string, visitor: string, http: Server, base: string, ownerCookie: string, visitorCookie: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Page annotation tests require the disposable local database.');
    const user = async () => (await db.appuser.create({ data: { email: `${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } })).id;
    owner = await user(); visitor = await user();
    const app = express(); app.use(express.json()); app.use(attachSession());
    app.post('/session/:who', (req, res) => { issueSession(res, req.params.who === 'owner' ? owner : visitor); res.sendStatus(204); });
    app.use('/page-annotations', pageAnnotationsRouter);
    http = await new Promise<Server>((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    const address = http.address();
    base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
    const login = async (who: string) => (await fetch(`${base}/session/${who}`, { method: 'POST', headers: { Origin: 'http://localhost:3000' } })).headers.get('set-cookie')!.split(';')[0];
    ownerCookie = await login('owner'); visitorCookie = await login('visitor');
  });
  afterAll(async () => { if (http) await new Promise<void>((resolve) => http.close(() => resolve())); await db.$disconnect(); });

  const newPage = async (content = source) => (await db.page.create({ data: { userId: owner, title: 'Fixture', content, sortOrder: 1, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() } })).id;
  const setContent = async (pageId: string, content: string) => {
    const { contentVersion } = await db.page.findFirstOrThrow({ where: { id: pageId }, select: { contentVersion: true } });
    await savePageContent(db, owner, pageId, contentVersion, content);
  };
  const call = (path: string, method = 'GET', body?: unknown, cookie: string | null = ownerCookie) => fetch(base + path, {
    method,
    headers: { Origin: 'http://localhost:3000', ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const create = async (pageId: string, items: Array<{ kind: string; title: string; content: string }>, extra: object = {}) =>
    call('/page-annotations', 'POST', { pageId, anchor: { type: 'heading', key: JOINS }, items, ...extra });
  const list = async (pageId: string, cookie: string | null = ownerCookie) => (await call(`/page-annotations?pageId=${pageId}`, 'GET', undefined, cookie)).json() as Promise<Array<{ id: string; kind: string; title: string; displayOrder: number; origin: string; stale: boolean; anchor: { type: string; key?: string; level?: number; titleSnapshot?: string } }>>;

  it('attaches items to a heading with a server-derived anchor, in order, and lists them fresh', async () => {
    const pageId = await newPage();
    const response = await create(pageId, [{ kind: 'summary', title: 'Gist', content: 'Joins combine rows.' }, { kind: 'key_takeaway', title: 'Keys', content: 'Join on keys.' }]);
    expect(response.status).toBe(201);
    const items = await list(pageId);
    expect(items.map((item) => [item.kind, item.displayOrder, item.stale])).toEqual([['summary', 0, false], ['key_takeaway', 1, false]]);
    expect(items[0].anchor).toEqual({ type: 'heading', key: JOINS, level: 2, titleSnapshot: 'Joins' });
  });

  it('marks items stale when the section changes or its heading is renamed', async () => {
    const pageId = await newPage();
    await create(pageId, [{ kind: 'summary', title: 'Gist', content: 'x' }]);
    await setContent(pageId, source.replace('Inner joins.', 'Inner joins, changed.'));
    expect((await list(pageId))[0].stale).toBe(true);
    await setContent(pageId, source.replace('## Joins', '## Merging'));
    expect((await list(pageId))[0].stale).toBe(true);
    await setContent(pageId, source);
    expect((await list(pageId))[0].stale).toBe(false);
  });

  it('rejects a heading that no longer exists and unknown kinds', async () => {
    const pageId = await newPage();
    expect((await call('/page-annotations', 'POST', { pageId, anchor: { type: 'heading', key: '2:0:gone' }, items: [{ kind: 'summary', title: 't', content: 'c' }] })).status).toBe(409);
    expect((await create(pageId, [{ kind: 'nonsense', title: 't', content: 'c' }])).status).toBe(400);
  });

  it('supports whole-page items and keeps them apart from heading items', async () => {
    const pageId = await newPage();
    await call('/page-annotations', 'POST', { pageId, anchor: { type: 'page' }, items: [{ kind: 'summary', title: 'Page gist', content: 'All of it.' }] });
    await create(pageId, [{ kind: 'summary', title: 'Joins gist', content: 'Just joins.' }]);
    const items = await list(pageId);
    expect(items.map((item) => item.anchor.type).sort()).toEqual(['heading', 'page']);
  });

  it('replaces only AI items of the regenerated kinds and keeps edited ones', async () => {
    const pageId = await newPage();
    await create(pageId, [{ kind: 'summary', title: 'Old gist', content: 'old' }, { kind: 'diagram', title: 'Flow', content: '```mermaid\nflowchart LR\nA-->B\n```' }, { kind: 'be_aware', title: 'Careful', content: 'careful' }]);
    const before = await list(pageId);
    const edited = before.find((item) => item.kind === 'be_aware')!;
    expect((await call(`/page-annotations/${edited.id}`, 'PATCH', { title: 'My caution' })).status).toBe(204);

    await create(pageId, [{ kind: 'summary', title: 'New gist', content: 'new' }, { kind: 'be_aware', title: 'Regenerated', content: 'again' }], { replace: true });
    const after = await list(pageId);
    expect(after.map((item) => item.title).sort()).toEqual(['Flow', 'My caution', 'New gist', 'Regenerated']);
    expect(after.find((item) => item.title === 'My caution')!.origin).toBe('manual');
  });

  it('reorders items and deletes them', async () => {
    const pageId = await newPage();
    await create(pageId, [{ kind: 'summary', title: 'A', content: 'a' }, { kind: 'key_takeaway', title: 'B', content: 'b' }, { kind: 'try_this', title: 'C', content: 'c' }]);
    const items = await list(pageId);
    const ids = items.map((item) => item.id);
    expect((await call('/page-annotations/reorder', 'POST', { pageId, ids: [ids[2], ids[0], ids[1]] })).status).toBe(204);
    expect((await list(pageId)).map((item) => item.title)).toEqual(['C', 'A', 'B']);
    expect((await call(`/page-annotations/${ids[0]}`, 'DELETE')).status).toBe(204);
    expect((await list(pageId)).map((item) => item.title)).toEqual(['C', 'B']);
  });

  it('keeps each reader\'s items private and requires a session to change them', async () => {
    const pageId = await newPage();
    await db.page.update({ where: { id: pageId }, data: { isPublic: true } });
    await create(pageId, [{ kind: 'summary', title: 'Mine', content: 'mine' }]);
    const [mine] = await list(pageId);
    expect(await list(pageId, visitorCookie)).toEqual([]);
    expect(await list(pageId, null)).toEqual([]);
    expect((await call(`/page-annotations/${mine.id}`, 'PATCH', { title: 'Hijacked' }, visitorCookie)).status).toBe(404);
    expect((await call(`/page-annotations/${mine.id}`, 'DELETE', undefined, visitorCookie)).status).toBe(404);
    expect((await call(`/page-annotations/${mine.id}`, 'DELETE', undefined, null)).status).toBe(401);
    expect((await list(pageId))[0].title).toBe('Mine');
  });

  it('does not let another reader attach items to a private page', async () => {
    const pageId = await newPage();
    expect((await call('/page-annotations', 'POST', { pageId, anchor: { type: 'page' }, items: [{ kind: 'summary', title: 't', content: 'c' }] }, visitorCookie)).status).toBe(404);
  });
});
