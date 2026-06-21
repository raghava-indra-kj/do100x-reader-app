import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorResponse } from "./error-response";
import { RESOURCE_NOT_FOUND } from "./http-error.constants";

const NOT_FOUND_BODY: ErrorResponse = {
    errorCode: RESOURCE_NOT_FOUND,
    message: "Not found",
};

export function notFoundMiddleware(_req: Request, res: Response): void {
    res.status(StatusCodes.NOT_FOUND).json(NOT_FOUND_BODY);
}
