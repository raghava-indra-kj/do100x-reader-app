import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { PAGE_TITLE_MIN_LENGTH, PAGE_TITLE_MAX_LENGTH, PAGE_CONTENT_MAX_LENGTH } from "@modules/page/page.constants";
import { pageIdSchema } from "@modules/page/page-id.models";

export const UpdatePageBodySchema = z.object({
    title: z.string().trim().min(PAGE_TITLE_MIN_LENGTH).max(PAGE_TITLE_MAX_LENGTH),
    content: z.string().max(PAGE_CONTENT_MAX_LENGTH).nullish(),
});

export type UpdatePageBody = z.infer<typeof UpdatePageBodySchema>;

export const UpdatePageInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
    title: z.string().trim().min(PAGE_TITLE_MIN_LENGTH).max(PAGE_TITLE_MAX_LENGTH),
    content: z.string().max(PAGE_CONTENT_MAX_LENGTH).nullish(),
});

export type UpdatePageInput = z.infer<typeof UpdatePageInputSchema>;
