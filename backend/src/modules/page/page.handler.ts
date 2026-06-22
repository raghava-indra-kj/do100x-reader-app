import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { PageError } from "./errors/page-error";
import { PAGE_NOT_FOUND, PAGE_ACCESS_DENIED, INVALID_PAGE_ID } from "./errors/page-error.constants";
import { getPage } from "./get-page.service";
import { queryPages } from "./query-pages.service";
import { QueryPagesBody } from "./query-pages.models";
import { requirePageIdParam } from "./validators/page-id.validator";

export async function handleQueryPages(req: Request, res: Response): Promise<void> {
    const body = req.body as QueryPagesBody;
    const result = await queryPages({
        currentUser: req.currentUser,
        parentId: body.parentId,
        searchQuery: body.searchQuery,
    });
    res.status(StatusCodes.OK).json(result);
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
        if (err instanceof PageError) {
            if (err.errorCode === INVALID_PAGE_ID) {
                throw new ApiError({
                    statusCode: StatusCodes.BAD_REQUEST,
                    message: "Invalid page identifier",
                    errorCode: INVALID_PAGE_ID,
                });
            }
            if (err.errorCode === PAGE_NOT_FOUND) {
                throw new ApiError({
                    statusCode: StatusCodes.NOT_FOUND,
                    message: "Page not found",
                    errorCode: PAGE_NOT_FOUND,
                });
            }
            if (err.errorCode === PAGE_ACCESS_DENIED) {
                throw new ApiError({
                    statusCode: StatusCodes.FORBIDDEN,
                    message: "Access denied",
                    errorCode: PAGE_ACCESS_DENIED,
                });
            }
        }
        throw err;
    }
}
