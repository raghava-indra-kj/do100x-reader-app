import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@lib/utils/cn';
import { Tooltip } from '../tooltip';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 font-semibold select-none cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] enabled:hover:bg-[var(--color-brand-hover)] enabled:active:bg-[var(--color-brand-active)]',
                secondary:
                    'border border-[var(--color-border-strong)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] enabled:hover:bg-[var(--color-surface-soft)]',
                outlined:
                    'border border-[var(--color-border-strong)] text-[var(--color-text-body)] enabled:hover:bg-[var(--color-surface-soft)]',
                ghost:
                    'text-[var(--color-text-body)] enabled:hover:bg-[var(--color-surface-soft)] enabled:active:bg-[var(--color-surface-card)]',
            },
            size: {
                sm: 'text-sm',
                md: 'text-sm',
                lg: 'text-base',
            },
            iconOnly: {
                true: '',
                false: '',
            },
        },
        compoundVariants: [
            { iconOnly: false, size: 'sm', class: 'h-8 px-3 rounded-[var(--radius-md)]' },
            { iconOnly: false, size: 'md', class: 'h-10 px-5 rounded-[var(--radius-md)]' },
            { iconOnly: false, size: 'lg', class: 'h-12 px-6 rounded-[var(--radius-md)]' },
            { iconOnly: true, size: 'sm', class: 'h-8 w-8 rounded-[var(--radius-md)]' },
            { iconOnly: true, size: 'md', class: 'h-10 w-10 rounded-[var(--radius-md)]' },
            { iconOnly: true, size: 'lg', class: 'h-12 w-12 rounded-[var(--radius-md)]' },
        ],
        defaultVariants: {
            variant: 'primary',
            size: 'md',
            iconOnly: false,
        },
    }
);

const spinnerSize = { sm: 16, md: 18, lg: 20 } as const;

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    loading?: boolean;
    tooltip?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant, size, iconOnly, startIcon, endIcon, loading, tooltip, disabled, children, ...props },
        ref
    ) => {
        const spinner = <Loader2 className="animate-spin" size={spinnerSize[size ?? 'md']} />;
        const content = iconOnly ? (
            loading ? spinner : children
        ) : (
            <>
                {loading ? spinner : startIcon}
                {children}
                {endIcon}
            </>
        );

        const button = (
            <button
                ref={ref}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                className={cn(buttonVariants({ variant, size, iconOnly, className }))}
                {...props}
            >
                {content}
            </button>
        );

        return tooltip != null ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
