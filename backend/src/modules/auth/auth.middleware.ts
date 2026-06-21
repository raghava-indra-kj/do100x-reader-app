import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { CurrentUser } from "@core/models/current-user";
import { AuthError } from "./errors/auth-error";
import { AUTH_INVALID_TOKEN, AUTH_SESSION_INACTIVE } from "./errors/auth-error.constants";
import { resolveCurrentUser } from "./resolve-current-user.service";

async function resolveTokenToUser(token: string): Promise<CurrentUser> {
    try {
        return await resolveCurrentUser({ token });
    } catch (err) {
        if (err instanceof AuthError) {
            if (err.errorCode === AUTH_INVALID_TOKEN) {
                throw new ApiError({
                    statusCode: StatusCodes.UNAUTHORIZED,
                    message: "Invalid token",
                    errorCode: AUTH_INVALID_TOKEN,
                });
            }
            if (err.errorCode === AUTH_SESSION_INACTIVE) {
                throw new ApiError({
                    statusCode: StatusCodes.UNAUTHORIZED,
                    message: "Session is no longer active",
                    errorCode: AUTH_SESSION_INACTIVE,
                });
            }
        }
        throw err;
    }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError({
            statusCode: StatusCodes.UNAUTHORIZED,
            message: "Unauthenticated",
            errorCode: AUTH_INVALID_TOKEN,
        });
    }

    req.currentUser = await resolveTokenToUser(token);
    next();
}

export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization;
    if (!token) {
        req.optCurrentUser = null;
        next();
        return;
    }

    req.optCurrentUser = await resolveTokenToUser(token);
    next();
}
