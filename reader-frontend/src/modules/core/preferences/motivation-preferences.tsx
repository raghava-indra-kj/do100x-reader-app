import { apiClient } from '@core/api/api-client';
import { useAuthStore } from '@modules/auth/provider/store';
import { makeAutoObservable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

export function canShowMotivations(authenticated: boolean, enabled: boolean, publiclyAccessible = false): boolean {
    return authenticated && enabled && !publiclyAccessible;
}

export class MotivationPreferencesStore {
    readonly userId: string | null;
    motivationsEnabled = false;
    isLoading = true;
    isSaving = false;

    constructor(userId: string | null) {
        this.userId = userId;
        makeAutoObservable(this, { userId: false });
    }

    async load() {
        if (!this.userId) {
            runInAction(() => { this.isLoading = false; });
            return;
        }
        try {
            const { data } = await apiClient.get('/user-preferences');
            runInAction(() => {
                this.motivationsEnabled = data.motivationsEnabled === true;
            });
        } catch {
            // Fail closed: motivations are opt-in, even if preferences cannot be loaded.
            runInAction(() => { this.motivationsEnabled = false; });
        } finally {
            runInAction(() => { this.isLoading = false; });
        }
    }

    async setMotivationsEnabled(enabled: boolean): Promise<boolean> {
        if (!this.userId || this.isLoading || this.isSaving) return false;
        this.isSaving = true;
        try {
            const { data } = await apiClient.patch('/user-preferences', { motivationsEnabled: enabled });
            if (data.motivationsEnabled !== enabled) return false;
            runInAction(() => { this.motivationsEnabled = enabled; });
            return true;
        } catch {
            return false;
        } finally {
            runInAction(() => { this.isSaving = false; });
        }
    }
}

const MotivationPreferencesContext = createContext<MotivationPreferencesStore | null>(null);

export function useMotivationPreferences(): MotivationPreferencesStore {
    const store = useContext(MotivationPreferencesContext);
    if (!store) throw new Error('useMotivationPreferences must be used within MotivationPreferencesProvider');
    return store;
}

export const MotivationPreferencesProvider = observer(function MotivationPreferencesProvider({ children }: { children: ReactNode }) {
    const authStore = useAuthStore();
    const userId = authStore.optCurrentUser?.id ?? null;
    const preferences = useMemo(() => new MotivationPreferencesStore(userId), [userId]);

    useEffect(() => { void preferences.load(); }, [preferences]);

    return (
        <MotivationPreferencesContext.Provider value={preferences}>
            {children}
        </MotivationPreferencesContext.Provider>
    );
});
