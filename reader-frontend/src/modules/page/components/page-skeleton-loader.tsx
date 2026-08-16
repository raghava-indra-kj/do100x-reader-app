import { Loader2 } from 'lucide-react';

export function PageSkeletonLoader() {
    return (
        <div className="mx-auto max-w-[var(--container-prose-2xwide)] px-[var(--space-6)] py-[var(--space-8)] animate-in fade-in duration-200">
            {/* Top Loading Status Indicator */}
            <div className="flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] w-fit text-xs text-[var(--color-text-muted)] shadow-xs">
                <Loader2 size={13} className="animate-spin text-[var(--color-brand)]" />
                <span>Loading page content&hellip;</span>
            </div>

            {/* Title Skeleton */}
            <div className="flex flex-col gap-3 mb-10">
                <div className="h-4 w-24 rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-9 w-3/4 max-w-lg rounded-lg bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-3 w-1/3 rounded-md bg-[var(--color-surface-raised)]/70 animate-pulse mt-1" />
            </div>

            {/* Content Lines Skeleton - Paragraph 1 */}
            <div className="flex flex-col gap-3 mb-8">
                <div className="h-4 w-full rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[94%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[98%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[85%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[60%] rounded-md bg-[var(--color-surface-raised)]/80 animate-pulse" />
            </div>

            {/* Sub-heading Skeleton */}
            <div className="flex flex-col gap-3 mb-6 mt-8">
                <div className="h-6 w-1/2 max-w-sm rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
            </div>

            {/* Content Lines Skeleton - Paragraph 2 */}
            <div className="flex flex-col gap-3 mb-8">
                <div className="h-4 w-[96%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[92%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[98%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-4 w-[70%] rounded-md bg-[var(--color-surface-raised)] animate-pulse" />
            </div>

            {/* Code / Block Quote Skeleton */}
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/50 p-5 flex flex-col gap-2.5 my-6">
                <div className="h-3.5 w-1/4 rounded bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-[var(--color-surface-raised)] animate-pulse" />
                <div className="h-3.5 w-1/2 rounded bg-[var(--color-surface-raised)] animate-pulse" />
            </div>
        </div>
    );
}
