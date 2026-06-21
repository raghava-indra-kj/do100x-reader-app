import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { UserError } from "@modules/user/errors/user-error";
import { USER_NO_HOMEPAGE } from "@modules/user/errors/user-error.constants";
import { AuthError } from "./errors/auth-error";
import { AUTH_UNAUTHENTICATED } from "./errors/auth-error.constants";
import { resolveCurrentUser } from "./resolve-current-user.service";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError({ statusCode: StatusCodes.UNAUTHORIZED, message: "Unauthenticated", errorCode: AUTH_UNAUTHENTICATED });
  }

  try {
    req.currentUser = await resolveCurrentUser({ token });
    next();
  } catch (err) {
    if (err instanceof AuthError && err.errorCode === AUTH_UNAUTHENTICATED) {
      throw new ApiError({ statusCode: StatusCodes.UNAUTHORIZED, message: "Unauthenticated", errorCode: AUTH_UNAUTHENTICATED });
    }
    if (err instanceof UserError && err.errorCode === USER_NO_HOMEPAGE) {
      throw new ApiError({ statusCode: StatusCodes.INTERNAL_SERVER_ERROR, message: "User account is incomplete", errorCode: USER_NO_HOMEPAGE });
    }
    throw err;
  }
}
