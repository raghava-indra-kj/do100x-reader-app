import { z } from "zod";
import { userIdSchema } from "@modules/auth/user-id.models";
import { sessionIdSchema } from "@modules/auth/session-id.models";

export const SignoutBodySchema = z.object({
    allSessions: z.boolean().default(false),
});

export type SignoutBody = z.infer<typeof SignoutBodySchema>;

export const SignoutInputSchema = z.object({
    userId: userIdSchema,
    sessionId: sessionIdSchema,
    allSessions: z.boolean().default(false),
});

export type SignoutInput = z.infer<typeof SignoutInputSchema>;
