import { XCircle } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import type { ReactNode } from 'react';

export interface FormErrorProps {
    message: string;
    className?: string;
    children?: ReactNode;
}

export function FormError({ message, className, children }: FormErrorProps) {
    return (
        <div className={cn('flex items-start gap-2 text-sm text-[var(--color-error)]', className)}>
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span>{children ?? message}</span>
        </div>
    );
}
