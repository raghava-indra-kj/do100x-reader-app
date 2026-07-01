import { z } from 'zod';

export const DbPageSchema = z.object({
    id: z.string(),
    userId: z.string(),
    parentPageId: z.string().nullable(),
    title: z.string(),
    content: z.string(),
    category: z.string().nullable(),
    sortOrder: z.number(),
    childrenCount: z.number(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    meaningSystemPrompt: z.string().nullable().optional(),
    explanationSystemPrompt: z.string().nullable().optional(),
    doubtSystemPrompt: z.string().nullable().optional(),
});

export type DbPage = z.infer<typeof DbPageSchema>;
