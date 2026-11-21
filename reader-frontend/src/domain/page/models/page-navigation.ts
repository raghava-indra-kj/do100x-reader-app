import { z } from 'zod';

const pageLabel = z.object({ id: z.string(), title: z.string() });
export const PageNavigationSchema = z.object({
    path: z.array(pageLabel).min(1),
    children: z.array(pageLabel.extend({ parentPageId: z.string(), childrenCount: z.number().int().nonnegative() })),
});
export type PageNavigation = z.infer<typeof PageNavigationSchema>;
