import { z } from 'zod';

export const PageSearchResponseSchema = z.object({
    items: z.array(z.object({
        id: z.string().uuid(),
        title: z.string(),
        category: z.string().nullable(),
        updatedAt: z.string().datetime(),
        ancestors: z.array(z.object({ id: z.string().uuid(), title: z.string() })),
        pathIncomplete: z.boolean(),
    })),
    hasMore: z.boolean(),
});
export type PageSearchResponse = z.infer<typeof PageSearchResponseSchema>;
