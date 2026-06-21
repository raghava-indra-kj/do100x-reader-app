import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { formatZodError } from "@core/models/validation-issue";
import { REQUEST_BODY_VALIDATION_FAILED } from "./http-error.constants";

export function validateReqBody<T>(schema: ZodType<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            throw new ApiError({
                statusCode: StatusCodes.BAD_REQUEST,
                message: "Request body validation failed",
                errorCode: REQUEST_BODY_VALIDATION_FAILED,
                data: formatZodError(result.error),
            });
        }
        req.body = result.data;
        next();
    };
}
