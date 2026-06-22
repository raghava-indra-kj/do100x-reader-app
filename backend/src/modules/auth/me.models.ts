import { z } from "zod";
import { userIdSchema } from "@modules/auth/user-id.models";

export const MeInputSchema = z.object({
    userId: userIdSchema,
});

export type MeInput = z.infer<typeof MeInputSchema>;

export type MeResult = {
    id: string;
    name: string;
    email: string;
    homepageId: string;
};
