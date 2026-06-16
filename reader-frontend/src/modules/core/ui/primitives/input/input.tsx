import { forwardRef } from 'react';
import { Input as BaseInput, type InputProps as BaseInputProps } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@lib/utils/cn';

const inputVariants = cva(
    'w-full border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] transition-colors placeholder:text-[var(--color-text-subtle)] disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            size: {
                sm: 'h-8 px-3 text-sm rounded-[var(--radius-md)]',
                md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
                lg: 'h-12 px-5 text-base rounded-[var(--radius-md)]',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    }
);

export interface InputProps
    extends Omit<BaseInputProps, 'size'>,
        VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, size, ...props }, ref) => {
        return (
            <BaseInput
                ref={ref}
                className={cn(inputVariants({ size, className }))}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input, inputVariants };
