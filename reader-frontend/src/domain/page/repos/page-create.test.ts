import { describe, expect, it, vi } from 'vitest';
import { PageRepoApi } from './page-repo-api';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../core/api/api-client', () => ({ apiClient: { post }, getApiErrorMessage: (_cause: unknown, fallback: string) => fallback }));

const params = { parentPageId: 'a8d7cfba-4854-4347-a0d0-589bb772c80a', title: 'Imported', content: '# Markdown\r\n', category: null };

describe('page creation response', () => {
    it('accepts the JSON page ID returned by the backend', async () => {
        const id = '8882f619-384c-4aac-90c1-d04dc9f8d5e2';
        post.mockResolvedValueOnce({ data: id });
        const result = await new PageRepoApi().createPage(params);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data).toBe(id);
        expect(post).toHaveBeenLastCalledWith('/pages', params);
    });

    it('does not count an HTML page or malformed response as a successful import', async () => {
        for (const data of ['<!doctype html><html>Proxy error</html>', { id: 'unexpected shape' }, undefined]) {
            post.mockResolvedValueOnce({ data });
            const result = await new PageRepoApi().createPage(params);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.error.errorCode).toBe('PAGE_CREATE_UNEXPECTED_RESPONSE');
        }
    });
});
