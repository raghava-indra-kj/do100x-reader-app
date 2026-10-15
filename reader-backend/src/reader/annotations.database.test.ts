import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import { z } from 'zod';
import { readJson } from '../test-support/read-json';
import type { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createTextAnchor, validateAnchor, documentFromMetadata } from '@reader/md-ast';
import { prisma as db } from '../prisma';
import { pageDocument, savePageContent } from '../page-content';
import { createPageComment, updatePageComment } from './capture-comment-access';
import { createCapture, getCapture, keepCapture } from './captures';
import { registerPageTools } from '../mcp/tools/pages';
import { registerCommentTools } from '../mcp/tools/comments';
import { attachSession, issueSession } from '../session';
import pagesRouter from '../pages';
import commentsRouter from '../comments';

const original = '# Heading\n\nKeep this sentence.\n\n## Later\n\nSecond paragraph.\n';
describe.skipIf(process.env.MARKDOWN_DATABASE_TEST !== '1')('durable annotations on isolated local MySQL', () => {
  let owner: string, visitor: string, pageId: string, client: Client, mcp: McpServer, http: Server, base: string, cookie: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/do100x_calendar_test_[a-f0-9]{12}$/.test(url.pathname)) throw new Error('Annotation tests require the disposable local database.');
    const user = async () => (await db.appuser.create({ data: { email: `${randomUUID()}@example.test`, identities: { create: { provider: 'GOOGLE', providerSubject: randomUUID() } } } })).id;
    owner = await user(); visitor = await user();
    mcp = new McpServer({ name: 'annotation-integration', version: '1' });
    registerPageTools(mcp, owner); registerCommentTools(mcp, owner);
    client = new Client({ name: 'annotation-test', version: '1' });
    const [a, b] = InMemoryTransport.createLinkedPair(); await mcp.connect(a); await client.connect(b);
    const app = express(); app.use(express.json()); app.use(attachSession());
    app.post('/session', (_req, res) => { issueSession(res, owner); res.sendStatus(204); });
    app.use('/pages', pagesRouter); app.use('/comments', commentsRouter);
    http = await new Promise<Server>(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
    const address = http.address(); base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
    cookie = (await fetch(`${base}/session`, { method: 'POST' })).headers.get('set-cookie')!.split(';')[0];
  });
  afterAll(async () => { if (client) await client.close(); if (mcp) await mcp.close(); if (http) await new Promise<void>(resolve => http.close(() => resolve())); await db.$disconnect(); });
  beforeEach(async () => {
    pageId = (await db.page.create({ data: { userId: owner, title: 'Annotation fixture', content: original, sortOrder: 1, childrenCount: 0, createdAt: new Date(), updatedAt: new Date() } })).id;
  });
  const page = () => db.page.findFirstOrThrow({ where: { id: pageId } });
  const anchor = async () => {
    const row = await page(), document = pageDocument(row), start = document.source.indexOf('Keep this sentence.');
    return createTextAnchor(document, { start, end: start + 'Keep this sentence.'.length });
  };
  const note = async (userId = owner) => createPageComment(db, { userId, pageId, pageTitle: 'Fixture', selectedText: 'Keep this sentence.', body: 'Why does $x^2$ apply?', createdAt: new Date(), updatedAt: new Date() }, false, { anchor: await anchor(), contentVersion: 0 });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: { pageId, ...args } });
    expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
    return JSON.parse((result.content as { text: string }[])[0].text);
  };
  const request = (path: string, method = 'GET', body?: unknown) => fetch(`${base}${path}`, { method, headers: { cookie, origin: 'http://localhost:3000', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

  it('exposes stable legacy identities on HTTP and MCP without writing on read', async () => {
    const before = await page();
    const first = await readJson(request(`/pages/${pageId}`), z.object({ documentMetadata: z.unknown() }));
    const second = await call('reader_get_page');
    expect(first.documentMetadata).toEqual(second.documentMetadata);
    expect(documentFromMetadata(original, first.documentMetadata).blocks.length).toBe(4);
    expect(await page()).toEqual(before);
  });
  it('saves and reloads precise HTTP comments; rejects stale or fabricated targets', async () => {
    const target = await anchor();
    const body = { pageId, selectedText: target.quote, body: 'Explain $x^2$.', anchor: target, contentVersion: 0 };
    const created = await request('/comments', 'POST', body); expect(created.status).toBe(201);
    const id = await created.json();
    await savePageContent(db, owner, pageId, 0, original.replace('this sentence', 'this useful sentence'));
    const rows = await readJson(request(`/comments?pageId=${pageId}`), z.array(z.unknown()));
    expect(rows[0]).toMatchObject({ id, anchorRevision: 1, anchor: { status: 'changed', quote: target.quote }, body: body.body });
    expect((await request('/comments', 'POST', body)).status).toBe(409);
    expect((await request('/comments', 'POST', { ...body, contentVersion: 1, anchor: { ...target, segments: [{ blockId: 'forged', start: 0, end: 1 }] } })).status).toBe(409);
  });
  it('keeps comment history when content is deleted and permits explicit MCP reattachment', async () => {
    const created = await call('reader_create_comment', { selectedText: 'Keep this sentence.', body: 'Remember', anchor: await anchor(), contentVersion: 0 });
    await savePageContent(db, owner, pageId, 0, '');
    const removed = await db.comment.findUniqueOrThrow({ where: { id: created.commentId } });
    expect(removed.anchor).toMatchObject({ status: 'source-removed', segments: [] });
    await call('reader_update_comment', { commentId: created.commentId, resolved: true });
    const saved = await savePageContent(db, owner, pageId, 1, original);
    const doc = pageDocument(saved), start = original.indexOf('Keep this sentence.');
    await call('reader_update_comment', { commentId: created.commentId, resolved: false, contentVersion: 2, anchor: createTextAnchor(doc, { start, end: start + 19 }) });
    const restored = await db.comment.findUniqueOrThrow({ where: { id: created.commentId } });
    expect(restored).toMatchObject({ anchorRevision: 2, resolvedAt: null, body: 'Remember' });
    expect(restored.anchor).toMatchObject({ status: 'attached' });
  });
  it('remaps other users’ private comments without exposing their notes', async () => {
    await db.page.update({ where: { id: pageId }, data: { isPublic: true } });
    const privateNote = await note(visitor);
    expect(privateNote).not.toBeNull();
    const response = await request(`/pages/${pageId}`, 'PUT', { title: 'Edited', content: '# Intro\n\n' + original, contentVersion: 0 });
    expect(response.status).toBe(204);
    expect((await db.comment.findUniqueOrThrow({ where: { id: privateNote!.id } })).anchorRevision).toBe(1);
    expect(await (await request(`/comments?pageId=${pageId}`)).json()).toEqual([]);
    expect(await updatePageComment(db, owner, privateNote!.id, { body: 'Cannot edit someone else’s note' })).toBeNull();
  });
  it('serializes comment creation against a simultaneous content edit', async () => {
    const results = await Promise.allSettled([note(), savePageContent(db, owner, pageId, 0, '# Intro\n\n' + original)]);
    expect(results[1].status).toBe('fulfilled');
    const saved = await page(), rows = await db.comment.findMany({ where: { pageId } });
    for (const row of rows) { expect(row.anchorRevision).toBe(1); expect(() => validateAnchor(pageDocument(saved), row.anchor)).not.toThrow(); }
    if (results[0].status === 'rejected') expect(results[0].reason).toMatchObject({ status: 409 });
  });
  it('allows one concurrent save and rolls content and anchors back together', async () => {
    const created = await note();
    const results = await Promise.allSettled([savePageContent(db, owner, pageId, 0, 'Intro.\n\n' + original), savePageContent(db, owner, pageId, 0, 'Other.\n\n' + original)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const before = await page(), oldComment = await db.comment.findUniqueOrThrow({ where: { id: created!.id } });
    await expect(db.$transaction(async tx => { await savePageContent(tx, owner, pageId, 1, ''); throw new Error('forced rollback'); })).rejects.toThrow('forced rollback');
    expect(await page()).toEqual(before);
    expect(await db.comment.findUniqueOrThrow({ where: { id: created!.id } })).toEqual(oldComment);
  });
  it('keeps old quote-only notes usable and rejects direct source writes', async () => {
    const legacy = await createPageComment(db, { userId: owner, pageId, pageTitle: 'Fixture', selectedText: 'Keep this sentence.', body: 'Old note', createdAt: new Date(), updatedAt: new Date() });
    await savePageContent(db, owner, pageId, 0, original.replace('this', 'a'));
    expect(await db.comment.findUniqueOrThrow({ where: { id: legacy!.id } })).toMatchObject({ body: 'Old note', anchor: null, anchorRevision: null });
    await expect(db.page.update({ where: { id: pageId, contentVersion: 1 }, data: { content: 'Unsafe' } })).rejects.toThrow('savePageContent');
    await expect(savePageContent(db, visitor, pageId, 1, 'Denied')).rejects.toMatchObject({ status: 404 });
  });
  it('preserves capture attachments when kept and refuses expired capture writes', async () => {
    const destination = pageId;
    const capture = await createCapture(db, owner, { title: 'Temporary', captureKey: randomUUID(), content: original, sourceUrl: null });
    pageId = capture.id;
    const created = await note();
    const before = await getCapture(db, owner, pageId);
    await keepCapture(db, owner, pageId, destination);
    expect((await page()).documentMetadata).toEqual(before.documentMetadata);
    expect((await db.comment.findUniqueOrThrow({ where: { id: created!.id } })).anchorRevision).toBe(0);
    const expired = await createCapture(db, owner, { title: 'Expired', captureKey: randomUUID(), content: original, sourceUrl: null });
    await db.page.update({ where: { id: expired.id }, data: { captureExpiresAt: new Date(0) } });
    await expect(savePageContent(db, owner, expired.id, 0, 'Changed')).rejects.toMatchObject({ status: 404 });
  });

  const writers: [string, Record<string, unknown>][] = [
    ['reader_update_page', { contentVersion: 0, content: '# Intro\n\n' + original }],
    ['reader_update_section', { sectionIndex: 0, contentVersion: 0, newContent: 'Keep this useful sentence.' }],
    ['reader_update_section', { sectionIndex: 0, contentVersion: 0, preserveHeading: false, newContent: '# Renamed\n\nKeep this sentence.' }],
    ['reader_replace_lines', { contentVersion: 0, startLine: 3, endLine: 3, expectedContent: 'Keep this sentence.', replacementContent: 'Keep this useful sentence.' }],
    ['reader_insert_section', { contentVersion: 0, afterSectionIndex: -1, heading: '# Intro', content: 'New introduction.' }],
    ['reader_append_content', { content: 'Appended.' }],
    ['reader_append_content', { contentVersion: 0, sectionIndex: 0, content: 'Additional detail.' }],
    ['reader_find_and_replace', { find: 'Keep this', replace: 'Retain this' }],
  ];
  it.each(writers)('updates attachments through %s %j', async (name, args) => {
    const created = await note();
    await call(name, args);
    const saved = await page(), comment = await db.comment.findUniqueOrThrow({ where: { id: created!.id } });
    expect(saved.contentVersion).toBe(1);
    expect(comment.anchorRevision).toBe(1);
    const attached = validateAnchor(pageDocument(saved), comment.anchor);
    expect(['attached', 'changed']).toContain(attached.status);
    expect(attached.segments.map(s => pageDocument(saved).blocks.find(b => b.id === s.blockId)!.source.slice(s.start, s.end)).join('')).toContain('sentence');
  });
  it('updates attachments through lint fixes and leaves metadata-only edits at the same revision', async () => {
    await savePageContent(db, owner, pageId, 0, original + '\n<callout>Extra</callout>');
    const row = await page(), doc = pageDocument(row), start = row.content!.indexOf('Keep this sentence.');
    const created = await createPageComment(db, { userId: owner, pageId, pageTitle: 'Fixture', selectedText: 'Keep this sentence.', body: 'Test', createdAt: new Date(), updatedAt: new Date() }, false, { anchor: createTextAnchor(doc, { start, end: start + 19 }), contentVersion: 1 });
    await call('reader_lint_format_page', { autoFix: true });
    expect((await page()).contentVersion).toBe(2);
    expect((await db.comment.findUniqueOrThrow({ where: { id: created!.id } })).anchorRevision).toBe(2);
    await call('reader_update_page', { title: 'Metadata only' });
    expect((await page()).contentVersion).toBe(2);
  });
});
