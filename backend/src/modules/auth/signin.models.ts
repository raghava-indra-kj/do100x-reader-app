import { z } from "zod";
import {
  EMAIL_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@modules/user/user.constants";

export const SigninInputSchema = z.object({
  email: z.string().trim().toLowerCase().min(EMAIL_MIN_LENGTH).max(EMAIL_MAX_LENGTH).pipe(z.email()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type SigninInput = z.infer<typeof SigninInputSchema>;
