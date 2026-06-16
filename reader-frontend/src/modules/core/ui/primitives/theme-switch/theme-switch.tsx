import { Switch } from '@base-ui/react/switch';
import { cn } from '@lib/utils/cn';
import { Moon, Sun } from 'lucide-react';

export interface ThemeSwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

export function ThemeSwitch({ checked, onCheckedChange, className }: ThemeSwitchProps) {
    return (
        <Switch.Root
            checked={checked}
            onCheckedChange={onCheckedChange}
            className={cn(
                'flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-(--color-border-default) bg-(--color-surface-soft) p-0.5 transition-colors duration-150 ease-[ease] data-checked:bg-(--color-brand)',
                className
            )}
        >
            <Switch.Thumb
                className={cn(
                    'flex size-3.5 items-center justify-center rounded-full bg-(--color-text-strong) transition-[translate,background-color] duration-150 ease-[ease] data-checked:translate-x-4 data-checked:bg-white'
                )}
            >
                {checked ? (
                    <Moon size={8} className="text-(--navy-300)" />
                ) : (
                    <Sun size={8} className="text-(--amber-500)" />
                )}
            </Switch.Thumb>
        </Switch.Root>
    );
}
