import { z } from 'zod';

/** Reading aids a page or heading can carry. Mirrors the backend list; the backend validates it. */
export const PAGE_ANNOTATION_KINDS = ['summary', 'key_takeaway', 'try_this', 'be_aware', 'diagram'] as const;
export type PageAnnotationKind = typeof PAGE_ANNOTATION_KINDS[number];

export const PAGE_ANNOTATION_KIND_LABELS: Record<PageAnnotationKind, string> = {
    summary: 'Summary',
    key_takeaway: 'Key takeaway',
    try_this: 'Try this',
    be_aware: 'Be aware of this',
    diagram: 'Diagram',
};

export type PageAnnotationPlacement = 'before' | 'after';

/** What the reader sends to attach items: the page itself, or a heading identified by its anchor key. */
export type PageAnnotationAnchorInput = { type: 'page' } | { type: 'heading'; key: string };

export const PageAnnotationSchema = z.object({
    id: z.string(),
    pageId: z.string(),
    anchor: z.discriminatedUnion('type', [
        z.object({ type: z.literal('page') }),
        z.object({ type: z.literal('heading'), key: z.string(), level: z.number(), titleSnapshot: z.string() }),
    ]),
    kind: z.string(),
    title: z.string(),
    content: z.string(),
    format: z.string(),
    displayOrder: z.number(),
    placement: z.enum(['before', 'after']).nullable(),
    origin: z.string(),
    stale: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type PageAnnotation = z.infer<typeof PageAnnotationSchema>;

export interface PageAnnotationPatch {
    title?: string;
    content?: string;
    placement?: PageAnnotationPlacement | null;
}

export interface NewPageAnnotation {
    kind: PageAnnotationKind;
    title: string;
    content: string;
    placement?: PageAnnotationPlacement | null;
}
