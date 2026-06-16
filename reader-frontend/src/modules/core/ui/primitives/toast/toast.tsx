import type { ReactNode } from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@lib/utils/cn';

export const toastManager = BaseToast.createToastManager();

type ToastOptions = { description?: string; timeout?: number };

/** Call from anywhere — no hook required. */
export const toast = {
    show:    (title: string, opts?: ToastOptions) => toastManager.add({ title, ...opts }),
    success: (title: string, opts?: ToastOptions) => toastManager.add({ title, type: 'success', ...opts }),
    error:   (title: string, opts?: ToastOptions) => toastManager.add({ title, type: 'error', ...opts }),
    warning: (title: string, opts?: ToastOptions) => toastManager.add({ title, type: 'warning', ...opts }),
    promise: toastManager.promise.bind(toastManager) as typeof toastManager.promise,
};

const icons: Record<string, ReactNode> = {
    success: <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />,
    error:   <XCircle      size={16} className="mt-0.5 shrink-0 text-[var(--color-error)]" />,
    warning: <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />,
    info:    <Info          size={16} className="mt-0.5 shrink-0 text-[var(--color-info)]" />,
};

function ToastItem({ toast: t }: { toast: BaseToast.Root.ToastObject }) {
    return (
        <BaseToast.Root
            toast={t}
            className={cn(
                // CSS variables for the stack animation
                '[--gap:0.75rem] [--peek:0.5rem]',
                '[--scale:calc(max(0,1-(var(--toast-index)*0.05)))]',
                '[--shrink:calc(1-var(--scale))]',
                '[--height:var(--toast-frontmost-height,var(--toast-height))]',
                '[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
                // Positioning
                'absolute bottom-0 right-0 w-full origin-bottom select-none',
                'z-[calc(1000-var(--toast-index))]',
                // Height (collapses stack, expands on hover/focus)
                'h-[var(--height)] data-expanded:h-[var(--toast-height)]',
                // Hover bridge — keeps mouse over the viewport when moving between toasts
                'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',
                // Stack transform (collapsed)
                '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
                // Expanded transform
                'data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
                // Transitions
                '[transition:transform_0.4s_cubic-bezier(0.22,1,0.36,1),opacity_0.4s,height_0.15s]',
                // Enter
                'data-starting-style:[transform:translateY(150%)]',
                // Exit — no swipe
                '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
                // Exit — swipe directions
                'data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
                'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
                'data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
                'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
                'data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
                'data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
                // Opacity
                'data-ending-style:opacity-0 data-limited:opacity-0',
                // Appearance
                'rounded-lg bg-(--color-surface-raised) shadow-lg ring-1 ring-(--color-border-subtle)',
            )}
        >
            <BaseToast.Content className="flex h-full items-start gap-3 overflow-hidden p-4 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
                {t.type && icons[t.type]}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <BaseToast.Title className="text-sm font-semibold text-(--color-text-strong)" />
                    <BaseToast.Description className="text-sm text-(--color-text-body)" />
                </div>
                <BaseToast.Close className="cursor-pointer rounded p-1 text-(--color-text-muted) transition-colors enabled:hover:bg-(--color-surface-soft) enabled:hover:text-(--color-text-body)">
                    <X size={14} />
                </BaseToast.Close>
            </BaseToast.Content>
        </BaseToast.Root>
    );
}

function ToastViewport() {
    const { toasts } = BaseToast.useToastManager();
    return (
        <BaseToast.Portal>
            <BaseToast.Viewport className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} />
                ))}
            </BaseToast.Viewport>
        </BaseToast.Portal>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    return (
        <BaseToast.Provider toastManager={toastManager}>
            {children}
            <ToastViewport />
        </BaseToast.Provider>
    );
}

export { BaseToast };
