import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";
import { COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH, SELECTION_TEXT_MAX_LENGTH } from "@modules/page/comment.constants";

export const CreateCommentBodySchema = z.object({
    comment: z.string().trim().min(COMMENT_MIN_LENGTH).max(COMMENT_MAX_LENGTH),
    selectionText: z.string().trim().max(SELECTION_TEXT_MAX_LENGTH).nullish(),
});

export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;

export const CreateCommentInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
    comment: z.string().trim().min(COMMENT_MIN_LENGTH).max(COMMENT_MAX_LENGTH),
    selectionText: z.string().trim().max(SELECTION_TEXT_MAX_LENGTH).nullish(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;
