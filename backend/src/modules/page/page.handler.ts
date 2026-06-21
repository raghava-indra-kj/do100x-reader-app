import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { PageError } from "./errors/page-error";
import { PAGE_NOT_FOUND, PAGE_ACCESS_DENIED } from "./errors/page-error.constants";
import { getPage } from "./get-page.service";
import { requirePageIdParam } from "./validators/page-id.validator";

export async function handleGetPage(req: Request, res: Response): Promise<void> {
    const pageId = requirePageIdParam(req.params.id);

    try {
        const result = await getPage({
            pageId,
            currentUser: req.optCurrentUser,
        });
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        if (err instanceof PageError) {
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
