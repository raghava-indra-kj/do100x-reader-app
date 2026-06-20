import { z } from "zod";
import { EmailField } from "../user/user.schema";
import { t } from "../../i18n/i18n";

export const LoginReqSchema = z.object({
  email: EmailField,
  password: z.string().min(1, t("login:errors.password.required")),
});

export type LoginReq = z.infer<typeof LoginReqSchema>;

