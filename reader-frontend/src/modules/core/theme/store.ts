import { action, makeObservable, observable } from 'mobx';
import { createContext, useContext } from 'react';
import { Theme } from './theme';

export const THEME_STORAGE_KEY = "theme";

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') return Theme.LIGHT;
    const storedThemeValue = localStorage.getItem(THEME_STORAGE_KEY) ?? Theme.default().value;
    return Theme.fromValue(storedThemeValue) || Theme.default();
}

export const ThemeContext = createContext<ThemeStore | null>(null);
export const useThemeStore = () => {
    const store = useContext(ThemeContext);
    if (!store) {
        throw new Error("useThemeStore must be used within a ThemeProvider");
    }
    return store;
}

export class ThemeStore {

    theme: Theme;

    constructor() {
        this.theme = getInitialTheme();
        makeObservable(this, {
            theme: observable,
            changeTheme: action,
            changeThemeByValue: action,
            nextTheme: action,
        });
    }

    changeTheme(newTheme: Theme) {
        const previousTheme = this.theme;
        this.theme = newTheme;
        const root = document.documentElement;
        root.classList.remove(previousTheme.value);
        root.classList.add(this.theme.value);
        localStorage.setItem(THEME_STORAGE_KEY, this.theme.value);
    }

    changeThemeByValue(value: string) {
        const theme = Theme.fromValue(value);
        if (theme) {
            this.changeTheme(theme);
        }
    }

    nextTheme() {
        const idx = Theme.values.indexOf(this.theme);
        this.changeTheme(Theme.values[(idx + 1) % Theme.values.length]);
    }

    getCurrentTheme() { return this.theme; }
    getThemes() { return Theme.values; }
    getDefaultTheme() { return Theme.default(); }
}

export const themeStore = new ThemeStore();
