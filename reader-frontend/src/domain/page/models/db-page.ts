import { z } from 'zod';

export const DbPageSchema = z.object({
    id: z.string(),
    userId: z.string(),
    parentPageId: z.string().nullable(),
    title: z.string(),
    content: z.string(),
    contentVersion: z.number().int().nonnegative(),
    documentMetadata: z.object({ version: z.literal(1), blocks: z.array(z.object({ id: z.string(), kind: z.string(), start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })) }).nullable().optional(),
    category: z.string().nullable(),
    sortOrder: z.number(),
    childrenCount: z.number(),
    captureExpiresAt: z.coerce.date().nullable().optional(),
    captureSourceUrl: z.string().nullable().optional(),
    isPublic: z.boolean().optional().default(false),
    isPubliclyAccessible: z.boolean().optional().default(false),
    isOwner: z.boolean().optional().default(true),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    meaningSystemPrompt: z.string().nullable().optional(),
    explanationSystemPrompt: z.string().nullable().optional(),
    doubtSystemPrompt: z.string().nullable().optional(),
});

export type DbPage = z.infer<typeof DbPageSchema>;
