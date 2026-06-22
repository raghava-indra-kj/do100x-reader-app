import { z } from "zod";
import { CurrentUser } from "@core/models/current-user";
import { pageIdSchema } from "@modules/page/page-id.models";
import { commentIdSchema } from "@modules/page/comment-id.models";

export const DeleteCommentInputSchema = z.object({
    currentUser: z.instanceof(CurrentUser),
    pageId: pageIdSchema,
    commentId: commentIdSchema,
});

export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;
