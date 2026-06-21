import { z } from "zod";

export const SignoutBodySchema = z.object({
    allSessions: z.boolean().default(false),
});

export type SignoutBody = z.infer<typeof SignoutBodySchema>;

export type SignoutInput = {
    userId: string;
    sessionId: string;
    allSessions: boolean;
};
