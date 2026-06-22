import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";

export const QueryPagesBodySchema = z.object({
    parentId: pageIdSchema.nullish(),
    searchQuery: z.string().trim().nullish(),
});

export type QueryPagesBody = z.infer<typeof QueryPagesBodySchema>;

export const QueryPagesInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    parentId: pageIdSchema.nullish(),
    searchQuery: z.string().trim().nullish(),
});

export type QueryPagesInput = z.infer<typeof QueryPagesInputSchema>;
