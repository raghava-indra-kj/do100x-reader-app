import { z } from 'zod';
export const CommentAnchorSchema = z.object({
    version: z.literal(1), kind: z.enum(['text', 'blocks']), quote: z.string(),
    status: z.enum(['attached', 'changed', 'partial', 'source-removed', 'ambiguous']),
    segments: z.array(z.object({ blockId: z.string(), start: z.number().int().nonnegative(), end: z.number().int().positive() })),
});

export const DbCommentSchema = z.object({
    id: z.string(),
    pageId: z.string(),
    pageTitle: z.string(),
    sectionTitle: z.string().nullable(),
    selectedText: z.string(),
    body: z.string(),
    anchor: CommentAnchorSchema.nullable().optional(),
    anchorRevision: z.number().int().nonnegative().nullable().optional(),
    resolvedAt: z.coerce.date().nullable().optional(),
    linkedPageId: z.string().nullable(),
    isExplanation: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type DbComment = z.infer<typeof DbCommentSchema>;
