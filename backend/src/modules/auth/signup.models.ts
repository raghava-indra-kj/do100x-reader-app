import { z } from "zod";
import {
    USER_NAME_MIN_LENGTH,
    USER_NAME_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    EMAIL_MIN_LENGTH,
    EMAIL_MAX_LENGTH,
} from "@modules/user/user.constants";

export const SignupInputSchema = z.object({
    name: z.string().trim().min(USER_NAME_MIN_LENGTH).max(USER_NAME_MAX_LENGTH),
    email: z.string().trim().toLowerCase().min(EMAIL_MIN_LENGTH).max(EMAIL_MAX_LENGTH).pipe(z.email()),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type SignupInput = z.infer<typeof SignupInputSchema>;
