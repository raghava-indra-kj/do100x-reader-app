import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, err } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { CurrentUser } from '@domain/auth/models/current-user';
const services = vi.hoisted(() => ({ restoreSession: vi.fn(), signOut: vi.fn() }));
vi.mock('@domain/auth/services/auth-service', () => services);
import { AuthStore } from './store';

const user = new CurrentUser({ id: 'a6749d7b-5edb-40f1-b8c5-bab2f10ed948', displayName: 'Reader', email: 'reader@example.com', avatarUrl: null });
beforeEach(() => { services.restoreSession.mockReset(); services.signOut.mockReset(); });
describe('server-restored Google session state', () => {
    it('does not claim authentication before the server confirms it', async () => {
        const store = new AuthStore();
        expect(store.status).toBe('loading'); expect(store.isAuthenticated).toBe(false);
        services.restoreSession.mockResolvedValue(ok(user));
        await store.bootstrap();
        expect(store.currentUser.email).toBe(user.email); expect(store.isAuthenticated).toBe(true);
    });
    it('treats absent sessions as anonymous and network failures as retryable errors', async () => {
        const store = new AuthStore();
        services.restoreSession.mockResolvedValue(ok(null)); await store.bootstrap();
        expect(store.status).toBe('anonymous');
        services.restoreSession.mockResolvedValue(err(new AppError({ message: 'Offline' }))); await store.bootstrap();
        expect(store.status).toBe('error'); expect(store.error).toBe('Offline');
    });
    it('deduplicates bootstrap requests', async () => {
        services.restoreSession.mockResolvedValue(ok(null));
        const store = new AuthStore();
        await Promise.all([store.bootstrap(), store.bootstrap()]);
        expect(services.restoreSession).toHaveBeenCalledTimes(1);
    });
    it('keeps authenticated screens mounted while refreshing or temporarily offline', async () => {
        const store = new AuthStore(); store.setCurrentUser(user);
        services.restoreSession.mockResolvedValue(err(new AppError({ message: 'Offline' })));
        const refreshing = store.bootstrap();
        expect(store.status).toBe('authenticated');
        await refreshing;
        expect(store.isAuthenticated).toBe(true); expect(store.error).toBe('Offline');
        services.restoreSession.mockResolvedValue(ok(null)); await store.bootstrap();
        expect(store.status).toBe('anonymous'); expect(store.optCurrentUser).toBeNull();
    });
    it('does not let an old bootstrap overwrite a completed sign-in', async () => {
        let resolve!: (value: ReturnType<typeof ok<null>>) => void;
        services.restoreSession.mockReturnValue(new Promise(value => { resolve = value; }));
        const store = new AuthStore(); const loading = store.bootstrap();
        store.setCurrentUser(user); resolve(ok(null)); await loading;
        expect(store.currentUser.id).toBe(user.id); expect(store.status).toBe('authenticated');
    });
    it('only signs out after the server clears its cookie successfully', async () => {
        const store = new AuthStore(); store.setCurrentUser(user);
        services.signOut.mockResolvedValue(err(new AppError({ message: 'Offline' })));
        expect(await store.logout()).toBe(false); expect(store.isAuthenticated).toBe(true);
        services.signOut.mockResolvedValue(ok(undefined));
        expect(await store.logout()).toBe(true); expect(store.status).toBe('anonymous'); expect(store.optCurrentUser).toBeNull();
    });
    it('clears the in-memory profile when a private API reports session expiry', () => {
        const store = new AuthStore(); store.setCurrentUser(user); store.expireSession();
        expect(store.status).toBe('anonymous'); expect(store.optCurrentUser).toBeNull();
    });
});
