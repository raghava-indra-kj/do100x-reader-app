import type { CurrentUser } from '@domain/auth/models/current-user';
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

    constructor() {
        this._currentUser = null;
        makeObservable<AuthStore, "_currentUser">(this, {
            _currentUser: observable,
            optCurrentUser: computed,
            currentUser: computed,
            isAuthenticated: computed,
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

    setCurrentUser(user: CurrentUser) {
        runInAction(() => {
            this._currentUser = user;
        });
    }

    logout() {
        runInAction(() => {
            this._currentUser = null;
        });
    }
}