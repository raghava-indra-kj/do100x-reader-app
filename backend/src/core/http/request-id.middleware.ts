import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { isValidUUID } from "@lib/uuid";
import { X_CLIENT_REQUEST_ID, X_REQUEST_ID } from "./constant";

function resolveClientRequestId(req: Request): string | null {
  const header = req.headers[X_CLIENT_REQUEST_ID];
  if (typeof header !== "string") return null;
  return isValidUUID(header) ? header : null;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const clientRequestId = resolveClientRequestId(req);

  req.requestId = requestId;
  req.clientRequestId = clientRequestId;

  res.setHeader(X_REQUEST_ID, requestId);
  if (clientRequestId !== null) {
    res.setHeader(X_CLIENT_REQUEST_ID, clientRequestId);
  }

  next();
}
