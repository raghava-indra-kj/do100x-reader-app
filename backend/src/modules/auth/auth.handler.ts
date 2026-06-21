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

export async function handleSignup(req: Request, res: Response): Promise<void> {
    try {
        const result = await signupUser(req.body);
        res.status(StatusCodes.CREATED).json(result);
    } catch (err) {
        if (err instanceof UserError && err.errorCode === USER_EMAIL_TAKEN) {
            throw new ApiError({
                statusCode: StatusCodes.CONFLICT,
                message: "Email is already taken",
                errorCode: USER_EMAIL_TAKEN,
            });
        }
        throw err;
    }
}

export async function handleSignin(req: Request, res: Response): Promise<void> {
    try {
        const result = await signinUser(req.body);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        if (err instanceof AuthError && err.errorCode === AUTH_INVALID_CREDENTIALS) {
            throw new ApiError({
                statusCode: StatusCodes.UNAUTHORIZED,
                message: "Invalid credentials",
                errorCode: AUTH_INVALID_CREDENTIALS,
            });
        }
        throw err;
    }
}

export async function handleSignout(req: Request, res: Response): Promise<void> {
    const token = req.headers.authorization ?? "";
    await signoutUser({ sessionToken: token });
    res.status(StatusCodes.NO_CONTENT).send();
}

export async function handleMe(req: Request, res: Response): Promise<void> {
    res.status(StatusCodes.OK).json(req.currentUser);
}
