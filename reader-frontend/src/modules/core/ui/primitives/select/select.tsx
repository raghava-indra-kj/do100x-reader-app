import { Select as BaseSelect } from '@base-ui/react/select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import type { CSSProperties, ReactNode } from 'react';

export interface SelectProps<Value = string> {
    value?: Value | null;
    defaultValue?: Value | null;
    onValueChange?: (value: Value | null) => void;
    placeholder?: ReactNode;
    items: Record<string, ReactNode>;
    disabled?: boolean;
    name?: string;
    className?: string;
    style?: CSSProperties;
    popupClassName?: string;
}

export function Select<Value = string>({
    value,
    defaultValue,
    onValueChange,
    placeholder,
    items,
    disabled,
    name,
    className,
    style,
    popupClassName,
}: SelectProps<Value>) {
    return (
        <BaseSelect.Root<Value>
            value={value ?? undefined}
            defaultValue={defaultValue ?? undefined}
            onValueChange={onValueChange as (value: Value | null) => void}
            items={items}
            disabled={disabled}
            name={name}
            modal
        >
            <BaseSelect.Trigger
                className={cn(
                    'inline-flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-text-strong)] outline-none transition-colors hover:bg-[var(--color-surface-soft)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-offset-[var(--focus-ring-offset)] data-placeholder:text-[var(--color-text-subtle)] disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                style={style}
            >
                <BaseSelect.Value placeholder={placeholder} />
                <BaseSelect.Icon>
                    <ChevronDown size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                </BaseSelect.Icon>
            </BaseSelect.Trigger>
            <BaseSelect.Portal>
                <BaseSelect.Positioner sideOffset={4} className="z-50">
                    <BaseSelect.Popup
                        className={cn(
                            'origin-(--transform-origin) min-w-[var(--anchor-width)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-1 text-sm text-[var(--color-text-body)] shadow-lg outline-none transition-[opacity,transform] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
                            popupClassName
                        )}
                    >
                        <BaseSelect.List>
                            {Object.entries(items).map(([itemValue, itemLabel]) => (
                                <BaseSelect.Item
                                    key={itemValue}
                                    value={itemValue as Value}
                                    className={cn(
                                        'flex cursor-pointer items-center rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-colors data-highlighted:bg-[var(--color-surface-soft)] data-selected:font-semibold data-selected:text-[var(--color-brand)]'
                                    )}
                                >
                                    <BaseSelect.ItemText>{itemLabel}</BaseSelect.ItemText>
                                </BaseSelect.Item>
                            ))}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        </BaseSelect.Root>
    );
}
