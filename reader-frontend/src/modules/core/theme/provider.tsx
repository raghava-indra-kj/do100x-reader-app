import { useMemo, type ReactNode } from 'react';
import { ThemeContext, ThemeStore } from './store';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const store = useMemo(() => new ThemeStore(), []);
    return (
        <ThemeContext.Provider value={store}>
            {children}
        </ThemeContext.Provider>
    );
}