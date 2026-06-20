import { z } from "zod";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
  PERSON_NAME_MAX_LENGTH
} from "./user.constants";
import { t } from "../../i18n/i18n";

export const NameField = z
  .string()
  .trim()
  .min(
    PERSON_NAME_MIN_LENGTH,
    PERSON_NAME_MIN_LENGTH === 1
      ? t("user:errors.name.required")
      : t("user:errors.name.minLength", { min: PERSON_NAME_MIN_LENGTH })
  )
  .max(PERSON_NAME_MAX_LENGTH, t("user:errors.name.maxLength", { max: PERSON_NAME_MAX_LENGTH }));

// Trims and lowercases the email BEFORE the format check
export const EmailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z
    .email(t("user:errors.email.invalid"))
    .max(EMAIL_MAX_LENGTH, t("user:errors.email.maxLength", { max: EMAIL_MAX_LENGTH }))
);

// Reusable password validator field
export const PasswordField = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    PASSWORD_MIN_LENGTH === 1
      ? t("user:errors.password.required")
      : t("user:errors.password.minLength", { min: PASSWORD_MIN_LENGTH })
  )
  .max(PASSWORD_MAX_LENGTH, t("user:errors.password.maxLength", { max: PASSWORD_MAX_LENGTH }));
