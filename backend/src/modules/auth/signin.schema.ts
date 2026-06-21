import { ZodType, z } from "zod";
import { SigninInput } from "./signin.types";

export const SigninSchema: ZodType<SigninInput> = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
