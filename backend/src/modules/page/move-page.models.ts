import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";

export const MovePageBodySchema = z
    .object({
        afterId: pageIdSchema.nullish(),
        beforeId: pageIdSchema.nullish(),
    })
    .refine((data) => data.afterId != null || data.beforeId != null, {
        message: "At least one of afterId or beforeId must be provided",
    });

export type MovePageBody = z.infer<typeof MovePageBodySchema>;

export const MovePageInputSchema = z
    .object({
        currentUser: z.instanceof(CurrentUser),
        pageId: pageIdSchema,
        afterId: pageIdSchema.nullish(),
        beforeId: pageIdSchema.nullish(),
    })
    .refine((data) => data.afterId != null || data.beforeId != null, {
        message: "At least one of afterId or beforeId must be provided",
    });

export type MovePageInput = z.infer<typeof MovePageInputSchema>;
