import { Observer } from 'mobx-react-lite';
import { ThemeIcon } from '@modules/core/branding';
import { Select } from '@modules/core/ui/primitives/select';
import { useThemeStore, Theme } from '@modules/core/theme';
import type { CSSProperties } from 'react';

const themeItems = Object.fromEntries(Theme.values.map(theme => [
    theme.value,
    <span className="flex items-center gap-1.5"><ThemeIcon theme={theme} /><span className="theme-option-name truncate">{theme.name}</span></span>,
]));

export interface ThemeSelectorProps {
    className?: string;
    style?: CSSProperties;
    compact?: boolean;
}

export function ThemeSelector({ className, style, compact = false }: ThemeSelectorProps) {
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
                    popupClassName={compact ? 'suite-appbar-popup' : undefined}
                    alignItemWithTrigger={compact ? false : undefined}
                    style={style}
                    tooltip="Theme"
                    ariaLabel={`Theme: ${themeStore.theme.name}`}
                />
            )}
        </Observer>
    );
}
