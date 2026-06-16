import { cn } from '@lib/utils/cn';
import type { ReactNode, LabelHTMLAttributes } from 'react';

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    children: ReactNode;
}

export function FormLabel({ className, children, ...props }: FormLabelProps) {
    return (
        <label className={cn('text-sm font-medium text-[var(--color-text-body)]', className)} {...props}>
            {children}
        </label>
    );
}
