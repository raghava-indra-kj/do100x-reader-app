import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { locateSections, sectionBodyTarget } from '@reader/md-ast';
import { prisma } from './prisma';
import { contentHash, editSectionBody } from './page-content';

// Opt-in real MySQL check. The entire fixture is rolled back, never persisted.
it.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('applies a precise patch and version CAS using real MySQL, rolling back the fixture', async () => {
    const rollback = new Error('verification rollback');
    try {
        await prisma.$transaction(async (tx) => {
            const content = '## 😀 Same\r\n\r\nold\r\n\r\n### Child\r\n\r\nkeep  \r\n\r\n## Same\r\n\r\nlast\r\n';
            const page = await tx.page.create({ data: { id: randomUUID(), userId: randomUUID(), title: 'Temporary verification fixture', content, childrenCount: 0, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() } });
            const target = sectionBodyTarget(content, locateSections(content)[0]);
            const request = { contentVersion: page.contentVersion, target, expectedBodyHash: contentHash(target.expectedBody), newBody: 'new\nline' };
            const result = await editSectionBody(tx, page.userId, page.id, request);
            const saved = await tx.page.findUniqueOrThrow({ where: { id: page.id } });
            expect(saved.contentVersion).toBe(1);
            expect(saved.content).toBe(result.content);
            expect(saved.content!.endsWith(content.slice(locateSections(content)[0].bodyEnd))).toBe(true);
            await expect(editSectionBody(tx, page.userId, page.id, request)).rejects.toMatchObject({ status: 409 });
            throw rollback;
        });
    } catch (error) { if (error !== rollback) throw error; }
});
