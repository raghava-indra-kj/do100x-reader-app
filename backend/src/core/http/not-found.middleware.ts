import { Request, Response } from "express";
import { ErrorResponse } from "./error-response";
import { RESOURCE_NOT_FOUND } from "./http-error.constants";

const NOT_FOUND_BODY: ErrorResponse = {
  errorCode: RESOURCE_NOT_FOUND,
  message: "Not found",
  data: null,
};

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json(NOT_FOUND_BODY);
}
