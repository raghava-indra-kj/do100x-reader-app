import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosAdapter } from 'axios';
import { apiClient } from './api-client';

const rejected: AxiosAdapter = config => Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }));
afterEach(() => { vi.unstubAllGlobals(); });

describe('session expiry notification', () => {
    it('notifies the session store when a private API denies authentication', async () => {
        const dispatchEvent = vi.fn(); vi.stubGlobal('window', { dispatchEvent });
        await expect(apiClient.get('/tasks', { adapter: rejected })).rejects.toBeInstanceOf(AxiosError);
        expect(dispatchEvent).toHaveBeenCalledOnce();
        expect(dispatchEvent.mock.calls[0][0].type).toBe('reader:session-expired');
    });
    it.each(['/auth/session', '/auth/google'])('leaves %s results to the race-aware authentication flow', async path => {
        const dispatchEvent = vi.fn(); vi.stubGlobal('window', { dispatchEvent });
        await expect(apiClient.get(path, { adapter: rejected })).rejects.toBeInstanceOf(AxiosError);
        expect(dispatchEvent).not.toHaveBeenCalled();
    });
});
