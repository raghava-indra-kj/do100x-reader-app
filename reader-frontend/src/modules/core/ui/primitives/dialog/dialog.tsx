import type { ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@lib/utils/cn';

export interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    className?: string;
    labelledBy?: string;
    describedBy?: string;
}

export function Dialog({ open, onOpenChange, children, className, labelledBy, describedBy }: DialogProps) {
    return (
        <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
            <BaseDialog.Portal>
                <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-(--navy-800)/42 animate-fade-in" />
                <BaseDialog.Popup
                    aria-labelledby={labelledBy}
                    aria-describedby={describedBy}
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-(--color-surface-raised) rounded-xl p-8 shadow-lg',
                        className
                    )}
                >
                    {children}
                </BaseDialog.Popup>
            </BaseDialog.Portal>
        </BaseDialog.Root>
    );
}

export { BaseDialog };
