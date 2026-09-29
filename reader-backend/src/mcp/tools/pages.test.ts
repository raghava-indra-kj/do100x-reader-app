import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const state = vi.hoisted(() => ({ row: null as any }));
vi.mock('../../prisma', () => ({ prisma: { page: {
    findFirst: vi.fn(async ({ where }: any) => {
        const row = state.row;
        return row && !row.deletedAt && row.id === where.id && row.userId === where.userId ? { ...row } : null;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.contentVersion !== state.row.contentVersion || where.userId !== state.row.userId || state.row.deletedAt) return { count: 0 };
        state.row = { ...state.row, ...data, contentVersion: state.row.contentVersion + 1 };
        return { count: 1 };
    }),
    update: vi.fn(async ({ where, data }: any) => {
        if (where.contentVersion !== state.row.contentVersion || where.userId !== state.row.userId || state.row.deletedAt) throw new Error('Write conflict');
        state.row = { ...state.row, ...data, contentVersion: state.row.contentVersion + 1 };
        return state.row;
    }),
} } }));
import { registerPageTools } from './pages';

describe('MCP editing shares the source and version contract', () => {
    let server: McpServer;
    let client: Client;
    beforeAll(async () => {
        server = new McpServer({ name: 'section-edit-test', version: '1' });
        registerPageTools(server, 'owner');
        client = new Client({ name: 'test-client', version: '1' });
        const [a, b] = InMemoryTransport.createLinkedPair();
        await server.connect(a); await client.connect(b);
    });
    afterAll(async () => { await client.close(); await server.close(); });
    beforeEach(() => {
        state.row = { id: 'page', userId: 'owner', content: '## Same\r\n\r\nfirst\r\n\r\n### Child\r\n\r\nkeep  \r\n\r\n## Same\r\n\r\nlast', contentVersion: 3, deletedAt: null };
    });
    const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: { pageId: 'page', ...args } });

    it('returns source-accurate indices and a version while ignoring fenced headings', async () => {
        state.row.content = '## Same\n\n```d2\n# comment\na -> b\n```\n\nTitle\n=====\n\nlast';
        const result = await call('reader_get_page_sections', {});
        const sections = JSON.parse((result.content as any[])[0].text);
        expect(sections.map((s: any) => [s.index, s.heading, s.contentVersion])).toEqual([[0, 'Same', 3], [1, 'Title', 3]]);
    });
    it('replaces only a body with default preserveHeading and retains CRLF and children', async () => {
        const result = await call('reader_update_section', { sectionIndex: 0, contentVersion: 3, newContent: 'changed' });
        expect(result.isError).not.toBe(true);
        expect(state.row.content).toBe('## Same\r\n\r\nchanged\r\n\r\n### Child\r\n\r\nkeep  \r\n\r\n## Same\r\n\r\nlast');
        expect(state.row.contentVersion).toBe(4);
    });
    it('rejects missing/stale versions and structure-changing bodies', async () => {
        expect((await call('reader_update_section', { sectionIndex: 0, newContent: 'wrong' })).isError).toBe(true);
        expect((await call('reader_update_section', { sectionIndex: 0, contentVersion: 2, newContent: 'wrong' })).isError).toBe(true);
        expect((await call('reader_update_section', { sectionIndex: 0, contentVersion: 3, newContent: '## Added' })).isError).toBe(true);
        expect(state.row.contentVersion).toBe(3);
    });
    it('does not address a new occupant of an old numeric index', async () => {
        await call('reader_update_section', { sectionIndex: 0, contentVersion: 3, newContent: 'first change' });
        const saved = state.row.content;
        expect((await call('reader_update_section', { sectionIndex: 0, contentVersion: 3, newContent: 'old snapshot' })).isError).toBe(true);
        expect(state.row.content).toBe(saved);
    });
    it('makes indexed append obey the same body-only protections', async () => {
        expect((await call('reader_append_content', { sectionIndex: 0, content: 'added' })).isError).toBe(true);
        expect((await call('reader_append_content', { sectionIndex: 0, contentVersion: 3, content: '## Added' })).isError).toBe(true);
        expect((await call('reader_append_content', { sectionIndex: 0, contentVersion: 3, content: 'added' })).isError).not.toBe(true);
        expect(state.row.content).toContain('first\r\n\r\nadded\r\n\r\n### Child\r\n\r\nkeep  ');
    });
    it('requires the caller snapshot for indexed insertion and full-content replacement', async () => {
        expect((await call('reader_insert_section', { afterSectionIndex: 0, heading: '## Inserted', content: 'new' })).isError).toBe(true);
        expect((await call('reader_update_page', { content: 'overwrite' })).isError).toBe(true);
        expect(state.row.contentVersion).toBe(3);
        expect((await call('reader_insert_section', { afterSectionIndex: 0, contentVersion: 3, heading: '## Inserted', content: 'new' })).isError).not.toBe(true);
        expect(state.row.contentVersion).toBe(4);
    });
    it('keeps exact line replacement context without normalizing the whole page', async () => {
        expect((await call('reader_replace_lines', { contentVersion: 3, startLine: 3, endLine: 3, expectedContent: 'first ', replacementContent: 'changed' })).isError).toBe(true);
        expect((await call('reader_replace_lines', { contentVersion: 3, startLine: 3, endLine: 3, expectedContent: 'first', replacementContent: 'changed' })).isError).not.toBe(true);
        expect(state.row.content).toContain('changed\r\n\r\n### Child\r\n\r\nkeep  \r\n');
    });
    it('cannot edit a page owned by another account', async () => {
        state.row.userId = 'visitor';
        expect((await call('reader_update_section', { sectionIndex: 0, contentVersion: 3, newContent: 'wrong' })).isError).toBe(true);
        expect(state.row.contentVersion).toBe(3);
    });
});
