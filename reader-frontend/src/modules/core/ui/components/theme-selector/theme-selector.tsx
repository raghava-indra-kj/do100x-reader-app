import { Observer } from 'mobx-react-lite';
import { Select } from '@modules/core/ui/primitives/select';
import { useThemeStore, Theme } from '@modules/core/theme';
import type { CSSProperties } from 'react';

const themeItems = Object.fromEntries(Theme.values.map(t => [t.value, t.name]));

export interface ThemeSelectorProps {
    className?: string;
    style?: CSSProperties;
}

export function ThemeSelector({ className, style }: ThemeSelectorProps) {
    const themeStore = useThemeStore();
    return (
        <Observer>
            {() => (
                <Select
                    value={themeStore.theme.value}
                    onValueChange={(value) => themeStore.changeThemeByValue(value!)}
                    items={themeItems}
                    placeholder="Theme"
                    className={className}
                    style={style}
                />
            )}
        </Observer>
    );
}
