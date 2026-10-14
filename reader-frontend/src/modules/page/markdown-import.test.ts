import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import {
    canImportMarkdownItem,
    importMarkdownFiles,
    markdownImportFailure,
    markdownImportRequestBytes,
    readMarkdownFile,
    MARKDOWN_IMPORT_REQUEST_LIMIT,
    type MarkdownImportItem,
    type MarkdownImportPayload,
} from './markdown-import';

const parentPageId = 'a8d7cfba-4854-4347-a0d0-589bb772c80a';
const savedPageId = '8882f619-384c-4aac-90c1-d04dc9f8d5e2';

function file(name: string, content: string) {
    const bytes = new TextEncoder().encode(content);
    return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
}

function item(id: string, changes: Partial<MarkdownImportItem> = {}): MarkdownImportItem {
    return { id, name: `${id}.md`, size: 10, title: id, content: '# Original\r\n', status: 'ready', error: null, needsReview: false, pageId: null, ...changes };
}

describe('reading Markdown files', () => {
    it('uses the frontmatter title without modifying BOM, line endings or source', async () => {
        const content = '\uFEFF---\r\ntitle: Learning notes\r\n---\r\n\r\n# A heading\r\n```ts\r\nconst value = "你好";\r\n```\r\n';
        const result = await readMarkdownFile(file('notes.md', content));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.title).toBe('Learning notes');
            expect(result.data.content).toBe(content);
        }
    });

    it('uses filenames for plain Markdown and malformed metadata', async () => {
        for (const source of ['# A heading\nText', '---\ntitle: [broken\n---\nText']) {
            const result = await readMarkdownFile(file('My Notes.MARKDOWN', source));
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data.title).toBe('My Notes');
                expect(result.data.content).toBe(source);
            }
        }
    });

    it('rejects empty, unsupported, oversized, unreadable and non-UTF-8 files', async () => {
        const read = vi.fn(async () => new ArrayBuffer(0));
        const cases = [
            file('empty.md', ' \r\n'),
            { name: 'notes.txt', size: 0, arrayBuffer: read },
            { name: 'large.md', size: MARKDOWN_IMPORT_REQUEST_LIMIT, arrayBuffer: read },
            { name: 'broken.md', size: 1, arrayBuffer: async () => { throw new Error('Unreadable'); } },
            { name: 'encoded.md', size: 2, arrayBuffer: async () => new Uint8Array([0xff, 0xfe]).buffer },
        ];
        for (const candidate of cases) expect((await readMarkdownFile(candidate)).ok).toBe(false);
        expect(read).not.toHaveBeenCalled();
    });
});

describe('batch import', () => {
    it('sends one create request at a time, using the reviewed title and exact source', async () => {
        let releaseFirst!: () => void;
        const gate = new Promise<void>(resolve => { releaseFirst = resolve; });
        let calls = 0;
        const createPage = vi.fn(async (_payload: MarkdownImportPayload) => {
            if (++calls === 1) await gate;
            return ok(savedPageId);
        });
        const onItemChange = vi.fn();
        const first = item('first', { title: ' Reviewed title ', content: '\n# Original\r\n' });
        const run = importMarkdownFiles({ items: [first, item('second')], parentPageId, createPage, onItemChange, isActive: () => true });
        expect(createPage).toHaveBeenCalledTimes(1);
        expect(createPage).toHaveBeenNthCalledWith(1, { parentPageId, title: 'Reviewed title', content: first.content, category: null });
        releaseFirst();
        expect(await run).toBe(2);
        expect(createPage).toHaveBeenCalledTimes(2);
        expect(onItemChange).toHaveBeenCalledWith('second', expect.objectContaining({ status: 'imported', pageId: savedPageId }));
    });

    it('continues after failure and retries only failed files, never successful or uncertain imports', async () => {
        const items = [item('failed'), item('success')];
        const createPage = vi.fn(async (payload: MarkdownImportPayload) => payload.title === 'failed'
            ? err(new AppError({ message: 'Rejected' })) : ok(savedPageId));
        const onItemChange = (id: string, changes: Partial<MarkdownImportItem>) => Object.assign(items.find(entry => entry.id === id)!, changes);
        expect(await importMarkdownFiles({ items, parentPageId, createPage, onItemChange, isActive: () => true })).toBe(1);
        expect(items[0].content).toBe('# Original\r\n');
        expect(items[0].error).toBe('Rejected');
        items.push(item('uncertain', { status: 'failed', needsReview: true }));
        createPage.mockClear();
        await importMarkdownFiles({ items, parentPageId, createPage, onItemChange, isActive: () => true });
        expect(createPage).toHaveBeenCalledTimes(1);
        expect(createPage.mock.calls[0][0].title).toBe('failed');
        expect(canImportMarkdownItem(items[1])).toBe(false);
        expect(canImportMarkdownItem(items[2])).toBe(false);
    });

    it('checks JSON request bytes, including escapes and Unicode, before sending', async () => {
        const payload: MarkdownImportPayload = { parentPageId, title: '你好', content: '"\\\n', category: null };
        expect(markdownImportRequestBytes(payload)).toBe(new TextEncoder().encode(JSON.stringify(payload)).byteLength);
        const content = '\n'.repeat(MARKDOWN_IMPORT_REQUEST_LIMIT / 2);
        expect(new TextEncoder().encode(content).byteLength).toBeLessThan(MARKDOWN_IMPORT_REQUEST_LIMIT);
        const createPage = vi.fn(async (_payload: MarkdownImportPayload) => ok(savedPageId));
        const onItemChange = vi.fn();
        await importMarkdownFiles({ items: [item('large', { content })], parentPageId, createPage, onItemChange, isActive: () => true });
        expect(createPage).not.toHaveBeenCalled();
        expect(onItemChange).toHaveBeenCalledWith('large', expect.objectContaining({ status: 'failed', error: expect.stringContaining('10 MiB') }));
    });

    it('rejects blank and overlong titles without a request', async () => {
        const createPage = vi.fn(async (_payload: MarkdownImportPayload) => ok(savedPageId));
        const onItemChange = vi.fn();
        await importMarkdownFiles({ items: [item('empty', { title: ' ' }), item('long', { title: 'a'.repeat(1001) })], parentPageId, createPage, onItemChange, isActive: () => true });
        expect(createPage).not.toHaveBeenCalled();
        expect(onItemChange).toHaveBeenCalledTimes(2);
    });

    it('stops sending more files after the import view is unmounted', async () => {
        let active = true;
        const createPage = vi.fn(async (_payload: MarkdownImportPayload) => { active = false; return ok(savedPageId); });
        const onItemChange = vi.fn();
        await importMarkdownFiles({ items: [item('one'), item('two')], parentPageId, createPage, onItemChange, isActive: () => active });
        expect(createPage).toHaveBeenCalledTimes(1);
        expect(onItemChange).toHaveBeenCalledTimes(1);
    });
});

describe('import errors', () => {
    function serverError(status: number) {
        return new AppError({ message: 'Couldn’t create the page.', cause: {
            isAxiosError: true,
            response: { status, headers: { 'content-type': 'text/html' }, data: '<html>Server error</html>' },
        } });
    }

    it('explains HTML and size errors without displaying server markup', () => {
        expect(markdownImportFailure(serverError(403))).toEqual({ message: expect.stringContaining('HTML error page (HTTP 403)'), needsReview: false });
        expect(markdownImportFailure(serverError(413))).toEqual({ message: expect.stringContaining('too large (HTTP 413)'), needsReview: false });
    });

    it('requires checking subpages before retrying an unconfirmed save', () => {
        expect(markdownImportFailure(serverError(502)).needsReview).toBe(true);
        expect(markdownImportFailure(new AppError({ message: 'Unexpected response', errorCode: 'PAGE_CREATE_UNEXPECTED_RESPONSE' })).needsReview).toBe(true);
        expect(markdownImportFailure(new AppError({ message: 'Disconnected', cause: { isAxiosError: true } })).needsReview).toBe(true);
    });
});
