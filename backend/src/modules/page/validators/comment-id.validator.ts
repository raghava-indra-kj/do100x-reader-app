import { ApiError } from "@core/errors/api-error";
import { StatusCodes } from "http-status-codes";
import { commentIdSchema } from "../comment-id.models";
import { CommentError } from "../errors/comment-error";
import { INVALID_COMMENT_ID } from "../errors/comment-error.constants";

export function parseCommentId(rawId: unknown): string | null {
    const result = commentIdSchema.safeParse(rawId);
    return result.success ? result.data : null;
}

export function requireCommentId(rawId: unknown): string {
    const commentId = parseCommentId(rawId);
    if (!commentId) {
        throw new CommentError({ errorCode: INVALID_COMMENT_ID, message: "Invalid comment identifier" });
    }
    return commentId;
}

export function requireCommentIdParam(rawId: unknown): string {
    const commentId = parseCommentId(rawId);
    if (!commentId) {
        throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Invalid comment identifier", errorCode: INVALID_COMMENT_ID });
    }
    return commentId;
}
