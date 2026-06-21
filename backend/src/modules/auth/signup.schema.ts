import { ZodType, z } from "zod";
import { SignupInput } from "./signup.types";

export const SignupSchema: ZodType<SignupInput> = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});
