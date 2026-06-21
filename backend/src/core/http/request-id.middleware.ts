import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { generateUuid, isValidUUID } from "@lib/uuid";
import { ApiError } from "@core/errors/api-error";
import { X_CLIENT_REQUEST_ID, X_REQUEST_ID } from "./http-headers.constants";
import { REQUEST_INVALID_CLIENT_REQUEST_ID } from "./http-error.constants";

function resolveClientRequestId(req: Request): string | null {
  const clientRequestId = req.headers[X_CLIENT_REQUEST_ID];
  if (typeof clientRequestId !== "string") return null;
  if (!isValidUUID(clientRequestId)) {
    throw new ApiError({ statusCode: StatusCodes.BAD_REQUEST, message: "Invalid client request ID", errorCode: REQUEST_INVALID_CLIENT_REQUEST_ID });
  }
  return clientRequestId;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateUuid();
  const clientRequestId = resolveClientRequestId(req);

  req.requestId = requestId;
  req.clientRequestId = clientRequestId;

  res.setHeader(X_REQUEST_ID, requestId);
  if (clientRequestId !== null) {
    res.setHeader(X_CLIENT_REQUEST_ID, clientRequestId);
  }

  next();
}
