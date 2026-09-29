import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@core/api/api-client';
import { canShowMotivations, MotivationPreferencesStore } from './motivation-preferences';

vi.mock('@core/api/api-client', () => ({
    apiClient: { get: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => {
    vi.resetAllMocks();
});

describe('motivation availability', () => {
    it('is off by default and for anonymous visitors', () => {
        expect(canShowMotivations(true, false)).toBe(false);
        expect(canShowMotivations(false, true)).toBe(false);
    });

    it('allows an opted-in user on a private screen', () => {
        expect(canShowMotivations(true, true)).toBe(true);
        expect(canShowMotivations(true, true, false)).toBe(true);
    });

    it('never allows motivations on publicly accessible pages', () => {
        expect(canShowMotivations(true, true, true)).toBe(false);
    });
});

describe('motivation preferences', () => {
    it('loads disabled when no account preference has been enabled', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { motivationsEnabled: false } });
        const store = new MotivationPreferencesStore('user-a');
        await store.load();
        expect(store.isLoading).toBe(false);
        expect(store.motivationsEnabled).toBe(false);
    });

    it('fails closed if preferences cannot be loaded', async () => {
        vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
        const store = new MotivationPreferencesStore('user-a');
        await store.load();
        expect(store.motivationsEnabled).toBe(false);
    });

    it('changes only after the server confirms the update', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { motivationsEnabled: false } });
        vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ data: { motivationsEnabled: true } });
        const store = new MotivationPreferencesStore('user-a');
        await store.load();
        expect(await store.setMotivationsEnabled(true)).toBe(false);
        expect(store.motivationsEnabled).toBe(false);
        expect(await store.setMotivationsEnabled(true)).toBe(true);
        expect(store.motivationsEnabled).toBe(true);
    });

    it('never loads preferences for an anonymous visitor', async () => {
        const store = new MotivationPreferencesStore(null);
        await store.load();
        expect(apiClient.get).not.toHaveBeenCalled();
        expect(store.motivationsEnabled).toBe(false);
    });
});
