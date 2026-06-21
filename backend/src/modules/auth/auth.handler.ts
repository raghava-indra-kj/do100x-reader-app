import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "@core/errors/api-error";
import { AuthError } from "./errors/auth-error";
import { AUTH_INVALID_CREDENTIALS } from "./errors/auth-error.constants";
import { UserError } from "@modules/user/errors/user-error";
import { USER_EMAIL_TAKEN } from "@modules/user/errors/user-error.constants";
import { signupUser } from "./signup.service";
import { signinUser } from "./signin.service";
import { signoutUser } from "./signout.service";
import { SignoutBody } from "./signout.models";
import { getMe } from "./me.service";

export async function handleSignup(req: Request, res: Response): Promise<void> {
    try {
        const result = await signupUser(req.body);
        res.status(StatusCodes.CREATED).json(result);
    } catch (err) {
        if (err instanceof UserError) {
            if (err.errorCode === USER_EMAIL_TAKEN) {
                throw new ApiError({
                    statusCode: StatusCodes.CONFLICT,
                    message: "Email is already taken",
                    errorCode: USER_EMAIL_TAKEN,
                });
            }
        }
        throw err;
    }
}

export async function handleSignin(req: Request, res: Response): Promise<void> {
    try {
        const result = await signinUser(req.body);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        if (err instanceof AuthError) {
            if (err.errorCode === AUTH_INVALID_CREDENTIALS) {
                throw new ApiError({
                    statusCode: StatusCodes.UNAUTHORIZED,
                    message: "Invalid credentials",
                    errorCode: AUTH_INVALID_CREDENTIALS,
                });
            }
        }
        throw err;
    }
}

export async function handleSignout(req: Request, res: Response): Promise<void> {
    const body = req.body as SignoutBody;
    await signoutUser({
        userId: req.currentUser.id,
        sessionId: req.currentUser.sessionId,
        allSessions: body.allSessions,
    });
    res.status(StatusCodes.NO_CONTENT).send();
}

export async function handleMe(req: Request, res: Response): Promise<void> {
    const result = await getMe({ userId: req.currentUser.id });
    res.status(StatusCodes.OK).json(result);
}
