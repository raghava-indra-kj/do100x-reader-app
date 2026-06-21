import { NextFunction, Request, Response } from "express";
import { generateUuid, isValidUUID } from "@lib/uuid";
import { X_CLIENT_REQUEST_ID, X_REQUEST_ID } from "./http-headers.constants";

function resolveClientRequestId(req: Request): string | null {
  const clientRequestId = req.headers[X_CLIENT_REQUEST_ID];
  if (typeof clientRequestId !== "string") return null;
  return isValidUUID(clientRequestId) ? clientRequestId : null;
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
