import type { CurrentUser } from '@domain/auth/models/current-user';
import { CurrentUser as CurrentUserClass } from '@domain/auth/models/current-user';
import { computed, makeObservable, observable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';

const AUTH_STORAGE_KEY = 'current_user';

function loadStoredUser(): CurrentUser | null {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return new CurrentUserClass(data);
    } catch {
        return null;
    }
}

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
        this._currentUser = loadStoredUser();
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
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        });
    }

    logout() {
        runInAction(() => {
            this._currentUser = null;
            localStorage.removeItem(AUTH_STORAGE_KEY);
        });
    }
}
