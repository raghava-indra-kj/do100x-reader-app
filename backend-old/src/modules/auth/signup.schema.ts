import { z } from "zod";
import { EmailField, NameField, PasswordField } from "../user/user.schema";

export const SignupReqSchema = z.object({
  name: NameField,
  email: EmailField,
  password: PasswordField,
});

export type SignupReq = z.infer<typeof SignupReqSchema>;