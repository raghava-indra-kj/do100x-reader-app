import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";
import { commentIdSchema } from "@modules/page/comment-id.models";
import { COMMENT_MIN_LENGTH, COMMENT_MAX_LENGTH } from "@modules/page/comment.constants";

export const UpdateCommentBodySchema = z.object({
    comment: z.string().trim().min(COMMENT_MIN_LENGTH).max(COMMENT_MAX_LENGTH),
});

export type UpdateCommentBody = z.infer<typeof UpdateCommentBodySchema>;

export const UpdateCommentInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
    commentId: commentIdSchema,
    comment: z.string().trim().min(COMMENT_MIN_LENGTH).max(COMMENT_MAX_LENGTH),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;
