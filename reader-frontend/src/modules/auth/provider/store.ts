import type { CurrentUser } from '@domain/auth/models/current-user';
import { createMcpAccessToken, getCurrentUser, logout as endSession, signInWithGoogle } from '@domain/auth/services/auth-service';
import { computed, makeObservable, observable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';

export const AuthContext = createContext<AuthStore | null>(null);
export const useAuthStore = () => {
    const store = useContext(AuthContext);
    if (!store) {
        throw new Error('useAuthStore must be used within an AuthProvider');
    }
    return store;
};

export class AuthStore {
    private _currentUser: CurrentUser | null;
    private _initializing: boolean;

    constructor() {
        this._currentUser = null;
        this._initializing = true;
        makeObservable<AuthStore, "_currentUser" | "_initializing">(this, {
            _currentUser: observable,
            _initializing: observable,
            optCurrentUser: computed,
            currentUser: computed,
            isAuthenticated: computed,
            isInitializing: computed,
        });
    }

    get optCurrentUser(): CurrentUser | null {
        return this._currentUser;
    }

    get currentUser(): CurrentUser {
        if (!this._currentUser) {
            throw new Error('Current user not available');
        }
        return this._currentUser;
    }

    get isAuthenticated(): boolean {
        return this._currentUser !== null;
    }

    get isInitializing(): boolean {
        return this._initializing;
    }

    setCurrentUser(user: CurrentUser) {
        runInAction(() => {
            this._currentUser = user;
        });
    }

    async initialize() {
        const result = await getCurrentUser();
        runInAction(() => {
            this._currentUser = result.ok ? result.data : null;
            this._initializing = false;
        });
    }

    async signInWithGoogle(idToken: string) {
        const result = await signInWithGoogle({ idToken });
        if (result.ok) this.setCurrentUser(result.data);
        return result;
    }

    async logout() {
        await endSession();
        runInAction(() => {
            this._currentUser = null;
        });
    }

    async createMcpAccessToken() {
        return createMcpAccessToken();
    }
}
