import { z } from "zod";
import { PAGE_TITLE_MAX_LENGTH, PAGE_CATEGORY_MAX_LENGTH } from "./page.constants";
import { t } from "../../i18n/i18n";

// Reusable UUID validator for page id fields.
export const PageIdSchema = z.uuid(t("page:errors.id.invalid"));

// Request body for POST /pages.
export const CreatePageReqSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, t("page:errors.title.required"))
    .max(PAGE_TITLE_MAX_LENGTH, t("page:errors.title.maxLength", { max: PAGE_TITLE_MAX_LENGTH })),
  rawMarkdown: z.string().optional(),
  category: z.string().trim().max(PAGE_CATEGORY_MAX_LENGTH).nullable().optional(),
  parentPageId: PageIdSchema.nullable().optional(),
});

export type CreatePageReq = z.infer<typeof CreatePageReqSchema>;



