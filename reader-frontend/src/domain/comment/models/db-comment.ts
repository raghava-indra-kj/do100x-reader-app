import { z } from 'zod';

export const DbCommentSchema = z.object({
    id: z.string(),
    pageId: z.string(),
    pageTitle: z.string(),
    sectionTitle: z.string().nullable(),
    selectedText: z.string(),
    body: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type DbComment = z.infer<typeof DbCommentSchema>;
