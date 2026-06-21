import { NextFunction, Request, Response } from "express";
import { ZodType, ZodError } from "zod";
import { ApiError } from "@core/errors/api-error";
import { ValidationIssue } from "@core/models/validation-issue";
import { REQUEST_BODY_VALIDATION_FAILED } from "./http-error.constants";

function formatZodError(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateReqBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError({
        statusCode: 400,
        message: "Request body validation failed",
        errorCode: REQUEST_BODY_VALIDATION_FAILED,
        data: formatZodError(result.error),
      });
    }
    req.body = result.data;
    next();
  };
}
