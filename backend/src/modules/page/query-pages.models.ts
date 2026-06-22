import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";

export const QueryPagesBodySchema = z.object({
    parentId: z.string().trim().min(1).nullish(),
    searchQuery: z.string().trim().nullish(),
});

export type QueryPagesBody = z.infer<typeof QueryPagesBodySchema>;

export const QueryPagesInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    parentId: z.string().trim().min(1).nullish(),
    searchQuery: z.string().trim().nullish(),
});

export type QueryPagesInput = z.infer<typeof QueryPagesInputSchema>;
