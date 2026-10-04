import { expect, it, vi } from 'vitest';
import { PageRepoApi } from './page-repo-api';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../core/api/api-client', () => ({ apiClient: { get }, getApiErrorMessage: (_cause: unknown, fallback: string) => fallback }));
it('sends a bounded query and cancellation signal without an owner identity', async () => {
    get.mockResolvedValueOnce({ data: { items: [], hasMore: false } });
    const controller = new AbortController();
    const result = await new PageRepoApi().searchPages({ q: 'Python', signal: controller.signal });
    expect(get).toHaveBeenLastCalledWith('/pages/search', { params: { q: 'Python', limit: 20 }, signal: controller.signal });
    expect(result.ok).toBe(true);
});
it('rejects malformed result contracts', async () => {
    get.mockResolvedValueOnce({ data: { items: [{ id: 'bad' }], hasMore: false } });
    expect((await new PageRepoApi().searchPages({ q: '' })).ok).toBe(false);
});
