import { z } from "zod";
import { COMMENT_BODY_MAX_LENGTH } from "./page.constants";
import { t } from "../../i18n/i18n";

export const CommentBodyField = z
  .string()
  .trim()
  .min(1, t("page:errors.comment.required"))
  .max(COMMENT_BODY_MAX_LENGTH, t("page:errors.comment.maxLength", { max: COMMENT_BODY_MAX_LENGTH }));

// Request body for creating or editing a comment.
export const CommentBodyReqSchema = z.object({
  body: CommentBodyField,
});

export type CommentBodyReq = z.infer<typeof CommentBodyReqSchema>;

