import { z } from 'zod';

export const DbPageListItemSchema = z.object({
    id: z.string(),
    userId: z.string(),
    parentPageId: z.string().nullable(),
    title: z.string(),
    category: z.string().nullable(),
    sortOrder: z.number(),
    childrenCount: z.number(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export type DbPageListItem = z.infer<typeof DbPageListItemSchema>;
