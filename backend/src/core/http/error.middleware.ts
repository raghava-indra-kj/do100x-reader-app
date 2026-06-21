import { env } from "@core/config/env";
import { ApiError } from "@core/errors/api-error";
import { AppError } from "@core/errors/app-error";
import { logger } from "@core/infra/logger";
import { NextFunction, Request, Response } from "express";
import { ErrorResponse } from "./error-response";

const INTERNAL_SERVER_ERROR = "Internal server error";

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
    errorCode: err.errorCode,
    message: INTERNAL_SERVER_ERROR,
    data: err.data,
    ...withDebugInfo(err),
  };
}

function buildGenericErrorBody(err: Error): ErrorResponse {
  return {
    errorCode: null,
    message: INTERNAL_SERVER_ERROR,
    data: null,
    ...withDebugInfo(err),
  };
}

const FALLBACK_ERROR_BODY: ErrorResponse = {
  errorCode: null,
  message: INTERNAL_SERVER_ERROR,
  data: null,
};

function toErrorResponse(err: unknown): { status: number; body: ErrorResponse } {
  if (err instanceof ApiError) return { status: err.statusCode, body: buildApiErrorBody(err) };
  if (err instanceof AppError) return { status: 500, body: buildAppErrorBody(err) };
  if (err instanceof Error) return { status: 500, body: buildGenericErrorBody(err) };
  return { status: 500, body: FALLBACK_ERROR_BODY };
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, method: req.method, url: req.url, requestId: req.requestId, clientRequestId: req.clientRequestId }, "Unhandled error");
  const { status, body } = toErrorResponse(err);
  res.status(status).json(body);
}
