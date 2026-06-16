import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@lib/utils/cn';

const textareaVariants = cva(
    'w-full border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] transition-colors placeholder:text-[var(--color-text-subtle)] disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            size: {
                sm: 'px-3 py-2 text-sm rounded-[var(--radius-md)]',
                md: 'px-4 py-2.5 text-sm rounded-[var(--radius-md)]',
                lg: 'px-5 py-3 text-base rounded-[var(--radius-md)]',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    }
);

export interface TextareaProps
    extends Omit<ComponentPropsWithoutRef<typeof TextareaAutosize>, 'size'>,
        VariantProps<typeof textareaVariants> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, size, minRows = 3, ...props }, ref) => {
        return (
            <TextareaAutosize
                ref={ref}
                minRows={minRows}
                className={cn(textareaVariants({ size, className }))}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
