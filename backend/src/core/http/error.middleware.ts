import { env } from "@core/config/env";
import { ApiError } from "@core/errors/api-error";
import { AppError } from "@core/errors/app-error";
import { logger } from "@core/infra/logger";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ErrorResponse } from "./error-response";
import { SERVER_INTERNAL_ERROR } from "./http-error.constants";

const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

function withDebugInfo(err: Error): Partial<ErrorResponse> {
    return env.isDebug ? { debugMessage: err.message, stack: err.stack } : {};
}

function buildApiErrorBody(err: ApiError): ErrorResponse {
    return {
        errorCode: err.errorCode,
        message: err.message,
        data: err.data,
        ...withDebugInfo(err),
    };
}

function buildAppErrorBody(err: AppError): ErrorResponse {
    return {
        errorCode: err.errorCode ?? SERVER_INTERNAL_ERROR,
        message: INTERNAL_SERVER_ERROR_MESSAGE,
        data: err.data,
        ...withDebugInfo(err),
    };
}

function buildGenericErrorBody(err: Error): ErrorResponse {
    return {
        errorCode: SERVER_INTERNAL_ERROR,
        message: INTERNAL_SERVER_ERROR_MESSAGE,
        ...withDebugInfo(err),
    };
}

const FALLBACK_ERROR_BODY: ErrorResponse = {
    errorCode: SERVER_INTERNAL_ERROR,
    message: INTERNAL_SERVER_ERROR_MESSAGE,
};

function toErrorResponse(err: unknown): { status: number; body: ErrorResponse } {
    if (err instanceof ApiError) return { status: err.statusCode, body: buildApiErrorBody(err) };
    if (err instanceof AppError) return { status: StatusCodes.INTERNAL_SERVER_ERROR, body: buildAppErrorBody(err) };
    if (err instanceof Error) return { status: StatusCodes.INTERNAL_SERVER_ERROR, body: buildGenericErrorBody(err) };
    return { status: StatusCodes.INTERNAL_SERVER_ERROR, body: FALLBACK_ERROR_BODY };
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const { status, body } = toErrorResponse(err);

    const isServerError = status >= StatusCodes.INTERNAL_SERVER_ERROR;
    const shouldLog = isServerError || env.isDebug;

    if (shouldLog) {
        const context = {
            err,
            method: req.method,
            url: req.url,
            requestId: req.requestId,
            clientRequestId: req.clientRequestId,
        };
        if (isServerError) {
            logger.error(context, "Server error");
        } else {
            logger.warn(context, "Client error");
        }
    }

    res.status(status).json(body);
}
