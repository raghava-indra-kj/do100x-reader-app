import { z } from "zod";
import { PAGE_TITLE_MAX_LENGTH, PAGE_CATEGORY_MAX_LENGTH } from "./page.constants";
import { t } from "../../i18n/i18n";

// Request body for PUT /pages/:pageId (all fields optional).
export const UpdatePageReqSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, t("page:errors.title.required"))
    .max(PAGE_TITLE_MAX_LENGTH, t("page:errors.title.maxLength", { max: PAGE_TITLE_MAX_LENGTH }))
    .optional(),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export type UpdatePageReq = z.infer<typeof UpdatePageReqSchema>;

