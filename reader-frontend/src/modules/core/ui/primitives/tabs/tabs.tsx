import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '@lib/utils/cn';
import type { ReactNode } from 'react';

export { BaseTabs };

interface TabItem {
    value: string;
    label: ReactNode;
    panel: ReactNode;
}

export interface TabsProps {
    defaultValue?: string;
    tabs: TabItem[];
    className?: string;
    variant?: 'underline' | 'segmented';
}

export function Tabs({ defaultValue, tabs, className, variant = 'underline' }: TabsProps) {
    const isSegmented = variant === 'segmented';

    return (
        <BaseTabs.Root defaultValue={defaultValue} className={cn('flex h-full flex-col', className)}>
            <BaseTabs.List
                className={cn(
                    'shrink-0 relative flex',
                    isSegmented
                        ? 'gap-0.5 px-3 pt-3'
                        : 'border-b border-[var(--color-border-default)]',
                )}
            >
                {tabs.map((tab) => (
                    <BaseTabs.Tab
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                            'inline-flex items-center justify-center bg-transparent text-sm font-medium outline-none select-none cursor-pointer focus-visible:z-10',
                            isSegmented
                                ? 'h-8 flex-1 rounded-[var(--radius-md)] px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] data-active:text-[var(--color-brand)] data-active:bg-[var(--color-brand-soft)] data-active:shadow-sm transition-[background-color,color] duration-140 ease-out'
                                : 'h-10 px-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] data-active:text-[var(--color-brand)] transition-colors duration-140 ease-out',
                        )}
                    >
                        {tab.label}
                    </BaseTabs.Tab>
                ))}
                {!isSegmented && (
                    <BaseTabs.Indicator className="absolute bottom-0 left-0 h-0.5 bg-[var(--color-brand)] transition-[translate,width] duration-150 ease-in-out translate-x-[--active-tab-left] w-[--active-tab-width]" />
                )}
            </BaseTabs.List>
            {tabs.map((tab) => (
                <BaseTabs.Panel
                    key={tab.value}
                    value={tab.value}
                    className={cn('flex-1 overflow-y-auto', '[[hidden]]:hidden')}
                >
                    {tab.panel}
                </BaseTabs.Panel>
            ))}
        </BaseTabs.Root>
    );
}
