import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { AppError } from "../errors";
import { AUTH_REQUIRED } from "../error-codes";

// Extend Express Request to carry userId after auth
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Express middleware that validates the Authorization: Bearer <token> header
 * against active sessions. Sets req.userId on success.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const session = await prisma.session.findFirst({
    where: { token, isActive: true },
  });

  if (!session) {
    throw new AppError(AUTH_REQUIRED, 401, "You must be logged in to do this.");
  }

  req.userId = session.userId;
  next();
}
