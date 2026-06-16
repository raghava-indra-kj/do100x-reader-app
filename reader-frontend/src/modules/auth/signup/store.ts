import { pagesPageWithIdRouteValue } from '@boot/routes';
import { signup as signupService } from '@domain/auth/services/auth-service';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import type { NavigateFunction } from 'react-router-dom';
import type { AuthStore } from '../provider/store';

export class SignupStore {
    username: string;
    password: string;
    error: string | null;
    submitting: boolean;
    private navigate: NavigateFunction;
    private authStore: AuthStore;

    constructor({ navigate, authStore }: { navigate: NavigateFunction; authStore: AuthStore }) {
        this.username = '';
        this.password = '';
        this.error = null;
        this.submitting = false;
        this.navigate = navigate;
        this.authStore = authStore;
        makeObservable(this, {
            username: observable,
            password: observable,
            error: observable,
            submitting: observable,
            setUsername: action,
            setPassword: action,
            isSubmittable: computed,
        });
    }

    setUsername(value: string) { this.username = value; }
    setPassword(value: string) { this.password = value; }

    get isSubmittable(): boolean {
        return this.username.trim().length > 0 && this.password.trim().length > 0;
    }

    async submit() {
        runInAction(() => {
            this.submitting = true;
            this.error = null;
        });
        const result = await signupService({ username: this.username, password: this.password });
        runInAction(() => {
            this.submitting = false;
            if (result.ok) {
                this.authStore.setCurrentUser(result.data);
                this.navigate(pagesPageWithIdRouteValue(result.data.homepageId));
            } else {
                this.error = result.error.message;
            }
        });
    }
}
