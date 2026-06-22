import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";

export const ReparentPageBodySchema = z.object({
    newParentId: pageIdSchema,
});

export type ReparentPageBody = z.infer<typeof ReparentPageBodySchema>;

export const ReparentPageInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
    newParentId: pageIdSchema,
});

export type ReparentPageInput = z.infer<typeof ReparentPageInputSchema>;
