import { ApiError } from "@core/errors/api-error";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { CreatePageBody } from "./create-page.models";
import { createPage } from "./create-page.service";
import { deletePage } from "./delete-page.service";
import { PageError } from "./errors/page-error";
import {
    INVALID_PAGE_ID,
    PAGE_ACCESS_DENIED,
    PAGE_CANNOT_DELETE_HOMEPAGE,
    PAGE_INVALID_MOVE_POSITION,
    PAGE_NEIGHBOR_NOT_FOUND,
    PAGE_NEIGHBOR_NOT_SIBLING,
    PAGE_NOT_FOUND,
    PAGE_PARENT_NOT_FOUND,
} from "./errors/page-error.constants";
import { getPage } from "./get-page.service";
import { MovePageBody } from "./move-page.models";
import { movePage } from "./move-page.service";
import { QueryPagesBody } from "./query-pages.models";
import { queryPages } from "./query-pages.service";
import { UpdatePageBody } from "./update-page.models";
import { updatePage } from "./update-page.service";
import { requirePageIdParam } from "./validators/page-id.validator";
import { CommentError } from "./errors/comment-error";
import { COMMENT_NOT_FOUND, COMMENT_ACCESS_DENIED, INVALID_COMMENT_ID } from "./errors/comment-error.constants";
import { queryComments } from "./query-comments.service";
import { createComment } from "./create-comment.service";
import { updateComment } from "./update-comment.service";
import { deleteComment } from "./delete-comment.service";
import { CreateCommentBody } from "./create-comment.models";
import { UpdateCommentBody } from "./update-comment.models";
import { requireCommentIdParam } from "./validators/comment-id.validator";

function handlePageError(err: unknown): never {
    if (err instanceof PageError) {
        if (err.errorCode === INVALID_PAGE_ID) {
            throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Invalid page identifier", errorCode: INVALID_PAGE_ID });
        }
        if (err.errorCode === PAGE_PARENT_NOT_FOUND) {
            throw new ApiError({ statusCode: StatusCodes.NOT_FOUND, message: "Parent page not found", errorCode: PAGE_PARENT_NOT_FOUND });
        }
        if (err.errorCode === PAGE_NOT_FOUND) {
            throw new ApiError({ statusCode: StatusCodes.NOT_FOUND, message: "Page not found", errorCode: PAGE_NOT_FOUND });
        }
        if (err.errorCode === PAGE_ACCESS_DENIED) {
            throw new ApiError({ statusCode: StatusCodes.FORBIDDEN, message: "Access denied", errorCode: PAGE_ACCESS_DENIED });
        }
        if (err.errorCode === PAGE_NEIGHBOR_NOT_FOUND) {
            throw new ApiError({ statusCode: StatusCodes.NOT_FOUND, message: "Neighbor page not found", errorCode: PAGE_NEIGHBOR_NOT_FOUND });
        }
        if (err.errorCode === PAGE_NEIGHBOR_NOT_SIBLING) {
            throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Neighbor page is not a sibling", errorCode: PAGE_NEIGHBOR_NOT_SIBLING });
        }
        if (err.errorCode === PAGE_INVALID_MOVE_POSITION) {
            throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Invalid move position", errorCode: PAGE_INVALID_MOVE_POSITION });
        }
        if (err.errorCode === PAGE_CANNOT_DELETE_HOMEPAGE) {
            throw new ApiError({ statusCode: StatusCodes.FORBIDDEN, message: "Cannot delete the homepage", errorCode: PAGE_CANNOT_DELETE_HOMEPAGE });
        }
    }
    throw err;
}

function handleCommentEndpointError(err: unknown): never {
    if (err instanceof PageError) {
        if (err.errorCode === PAGE_NOT_FOUND) {
            throw new ApiError({ statusCode: StatusCodes.NOT_FOUND, message: "Page not found", errorCode: PAGE_NOT_FOUND });
        }
    }
    if (err instanceof CommentError) {
        if (err.errorCode === INVALID_COMMENT_ID) {
            throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Invalid comment identifier", errorCode: INVALID_COMMENT_ID });
        }
        if (err.errorCode === COMMENT_NOT_FOUND) {
            throw new ApiError({ statusCode: StatusCodes.NOT_FOUND, message: "Comment not found", errorCode: COMMENT_NOT_FOUND });
        }
        if (err.errorCode === COMMENT_ACCESS_DENIED) {
            throw new ApiError({ statusCode: StatusCodes.FORBIDDEN, message: "Access denied", errorCode: COMMENT_ACCESS_DENIED });
        }
    }
    throw err;
}

export async function handleQueryPages(req: Request, res: Response): Promise<void> {
    const body = req.body as QueryPagesBody;
    const result = await queryPages({
        currentUser: req.currentUser,
        parentId: body.parentId,
        searchQuery: body.searchQuery,
    });
    res.status(StatusCodes.OK).json(result);
}

export async function handleCreatePage(req: Request, res: Response): Promise<void> {
    const body = req.body as CreatePageBody;
    try {
        const result = await createPage({
            currentUser: req.currentUser,
            title: body.title,
            content: body.content,
            parentId: body.parentId,
        });
        res.status(StatusCodes.CREATED).json(result);
    } catch (err) {
        handlePageError(err);
    }
}

export async function handleUpdatePage(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    const body = req.body as UpdatePageBody;
    try {
        const result = await updatePage({
            currentUser: req.currentUser,
            pageId,
            title: body.title,
            content: body.content,
        });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        handlePageError(err);
    }
}

export async function handleDeletePage(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    try {
        await deletePage({ currentUser: req.currentUser, pageId });
        res.status(StatusCodes.NO_CONTENT).send();
    } catch (err) {
        handlePageError(err);
    }
}

export async function handleMovePage(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    const body = req.body as MovePageBody;
    try {
        const result = await movePage({
            currentUser: req.currentUser,
            pageId,
            afterId: body.afterId,
            beforeId: body.beforeId,
        });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        handlePageError(err);
    }
}

export async function handleQueryComments(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    try {
        const result = await queryComments({ currentUser: req.currentUser, pageId });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        handleCommentEndpointError(err);
    }
}

export async function handleCreateComment(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    const body = req.body as CreateCommentBody;
    try {
        const result = await createComment({
            currentUser: req.currentUser,
            pageId,
            comment: body.comment,
            selectionText: body.selectionText,
        });
        res.status(StatusCodes.CREATED).json(result);
    } catch (err) {
        handleCommentEndpointError(err);
    }
}

export async function handleUpdateComment(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    const commentId = requireCommentIdParam(req.params.commentId);
    const body = req.body as UpdateCommentBody;
    try {
        const result = await updateComment({
            currentUser: req.currentUser,
            pageId,
            commentId,
            comment: body.comment,
        });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        handleCommentEndpointError(err);
    }
}

export async function handleDeleteComment(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    const commentId = requireCommentIdParam(req.params.commentId);
    try {
        await deleteComment({ currentUser: req.currentUser, pageId, commentId });
        res.status(StatusCodes.NO_CONTENT).send();
    } catch (err) {
        handleCommentEndpointError(err);
    }
}

export async function handleGetPage(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);
    try {
        const result = await getPage({
            pageId,
            currentUser: req.currentUser,
        });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        handlePageError(err);
    }
}
