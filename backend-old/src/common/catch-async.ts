import { Request, Response, NextFunction, RequestHandler } from "express";

// A reusable type for any async route handler.
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async route handler so that thrown/rejected errors
 * are automatically forwarded to Express's error handler.
 */
export function catchAsync(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}