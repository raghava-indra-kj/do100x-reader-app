import type { CurrentUser } from '@domain/auth/models/current-user';
import { restoreSession, signOut } from '@domain/auth/services/auth-service';
import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export class AuthStore {
    private _currentUser: CurrentUser | null = null;
    status: AuthStatus = 'loading';
    error: string | null = null;
    private bootstrapPromise: Promise<void> | null = null;
    private revision = 0;

    constructor() { makeAutoObservable<AuthStore, '_currentUser' | 'bootstrapPromise'>(this, { _currentUser: true, bootstrapPromise: false }); }
    get optCurrentUser(): CurrentUser | null { return this._currentUser; }
    get currentUser(): CurrentUser {
        if (!this._currentUser) throw new Error('Current user not available');
        return this._currentUser;
    }
    get isAuthenticated(): boolean { return this.status === 'authenticated' && this._currentUser !== null; }

    bootstrap(): Promise<void> {
        if (this.bootstrapPromise) return this.bootstrapPromise;
        // A background session check must not unmount an active editor or lose its draft.
        if (!this.isAuthenticated) this.status = 'loading';
        this.error = null;
        const revision = this.revision;
        this.bootstrapPromise = (async () => {
            const result = await restoreSession();
            runInAction(() => {
                if (revision !== this.revision) return;
                if (result.ok) {
                    this._currentUser = result.data;
                    this.status = result.data ? 'authenticated' : 'anonymous';
                } else {
                    this.status = this._currentUser ? 'authenticated' : 'error';
                    this.error = result.error.message;
                }
            });
        })().finally(() => { this.bootstrapPromise = null; });
        return this.bootstrapPromise;
    }

    setCurrentUser(user: CurrentUser) {
        this.revision++;
        this._currentUser = user;
        this.status = 'authenticated';
        this.error = null;
    }

    expireSession() {
        // The initial anonymous /session response must not invalidate its own bootstrap.
        if (this.status !== 'authenticated') return;
        this.revision++;
        this._currentUser = null;
        this.status = 'anonymous';
        this.error = null;
    }

    async logout(): Promise<boolean> {
        const result = await signOut();
        if (!result.ok) { runInAction(() => { this.error = result.error.message; }); return false; }
        runInAction(() => {
            this.revision++;
            this._currentUser = null;
            this.status = 'anonymous';
            this.error = null;
        });
        return true;
    }
}

export const AuthContext = createContext<AuthStore | null>(null);
export const useAuthStore = () => {
    const store = useContext(AuthContext);
    if (!store) throw new Error('useAuthStore must be used within an AuthProvider');
    return store;
};
