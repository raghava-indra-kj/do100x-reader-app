import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";

export const QueryCommentsInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
});

export type QueryCommentsInput = z.infer<typeof QueryCommentsInputSchema>;
