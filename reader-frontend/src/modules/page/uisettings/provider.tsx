import { useMemo, type ReactNode } from 'react';
import { PageUiSettingsContext, PageUiSettingsStore } from './store';

export function PageUiSettingsProvider({ children }: { children: ReactNode }) {
    const store = useMemo(() => new PageUiSettingsStore(), []);
    return (
        <PageUiSettingsContext.Provider value={store}>
            {children}
        </PageUiSettingsContext.Provider>
    );
}
