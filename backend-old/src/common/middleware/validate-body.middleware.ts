import { ZodType } from "zod";
import { catchAsync } from "../catch-async";
import { VALIDATION_ERROR } from "../error-codes";
import { ValidationError } from "../errors/validation-error";

/**
 * Middleware that validates the request body against a Zod schema.
 * On failure, throws a `ValidationError` with a human‑readable message.
 * On success, replaces `req.body` with the parsed (and sanitised) data.
 */
export function validateBodyMiddleware(schema: ZodType) {
  return catchAsync(async (req, _res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError({
        errorCode: VALIDATION_ERROR,
        message: "Validation failed",
        data: errors,
      });
    }

    req.body = parsed.data;
    next();
  });
}