import { Request, Response } from "express";
import { ErrorResponse } from "./error-response";

const NOT_FOUND_BODY: ErrorResponse = {
  errorCode: null,
  message: "Not found",
  data: null,
};

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json(NOT_FOUND_BODY);
}
