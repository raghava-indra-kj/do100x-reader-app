import { describe, expect, it } from 'vitest';
import { locateSections, sectionBodyTarget } from '@reader/md-ast';
import { contentHash, editSectionBody, type PageContentStorage } from './page-content';

function fixture() {
    const row = { id: 'page', userId: 'owner', content: '## First\n\nold\n\n### Child\n\nchild\n\n## Last\n\nlast', contentVersion: 4, deletedAt: null };
    const range = locateSections(row.content)[0];
    const target = sectionBodyTarget(row.content, range);
    const request = { contentVersion: 4, target, expectedBodyHash: contentHash(target.expectedBody), newBody: 'changed' };
    let calls = 0;
    const storage: PageContentStorage = { page: {
        async findFirst({ where }) { return where.userId === row.userId && !row.deletedAt ? { ...row } : null; },
        async updateMany({ where, data }) {
            calls++;
            if (where.contentVersion !== row.contentVersion || where.userId !== row.userId || row.deletedAt) return { count: 0 };
            row.content = data.content;
            row.contentVersion++;
            return { count: 1 };
        },
    } };
    return { row, storage, request, calls: () => calls };
}

describe('atomic owner-scoped section save', () => {
    it('updates only the section and advances its page content version', async () => {
        const { storage, request, row } = fixture();
        const result = await editSectionBody(storage, 'owner', 'page', request);
        expect(result.contentVersion).toBe(5);
        expect(row.content).toBe('## First\n\nchanged\n\n### Child\n\nchild\n\n## Last\n\nlast');
    });
    it('allows only one of two simultaneous edits from the same snapshot', async () => {
        const { storage, request, row } = fixture();
        const results = await Promise.allSettled([editSectionBody(storage, 'owner', 'page', request), editSectionBody(storage, 'owner', 'page', { ...request, newBody: 'second' })]);
        expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
        expect(row.contentVersion).toBe(5);
    });
    it('rejects nonowners and deleted pages', async () => {
        const { storage, request, row } = fixture();
        await expect(editSectionBody(storage, 'visitor', 'page', request)).rejects.toMatchObject({ status: 404 });
        row.deletedAt = new Date() as never;
        await expect(editSectionBody(storage, 'owner', 'page', request)).rejects.toMatchObject({ status: 404 });
    });
    it('rejects stale page versions without writing', async () => {
        const f = fixture(); f.row.contentVersion++;
        await expect(editSectionBody(f.storage, 'owner', 'page', f.request)).rejects.toMatchObject({ status: 409 });
        expect(f.calls()).toBe(0);
    });
    it('rejects wrong hashes and raw expected text', async () => {
        const f = fixture();
        await expect(editSectionBody(f.storage, 'owner', 'page', { ...f.request, expectedBodyHash: '0'.repeat(64) })).rejects.toMatchObject({ status: 409 });
        await expect(editSectionBody(f.storage, 'owner', 'page', { ...f.request, target: { ...f.request.target, expectedBody: 'wrong' } })).rejects.toMatchObject({ status: 422 });
        expect(f.calls()).toBe(0);
    });
    it('does not write or bump versions for unchanged drafts', async () => {
        const f = fixture();
        const result = await editSectionBody(f.storage, 'owner', 'page', { ...f.request, newBody: 'old' });
        expect(result.contentVersion).toBe(4); expect(f.calls()).toBe(0);
    });
    it('does not write structural edits', async () => {
        const f = fixture();
        await expect(editSectionBody(f.storage, 'owner', 'page', { ...f.request, newBody: '## New' })).rejects.toMatchObject({ status: 422 });
        expect(f.calls()).toBe(0);
    });
});
