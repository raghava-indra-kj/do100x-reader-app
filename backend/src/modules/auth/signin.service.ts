import { appuser } from "@prisma-generated";
import { prisma } from "@core/db/prisma";
import { IllegalStateError } from "@core/errors/illegal-state.error";
import { verifyPassword } from "@lib/password";
import { AuthError } from "./errors/auth-error";
import { AUTH_INVALID_CREDENTIALS } from "./errors/auth-error.constants";
import { SigninInput, SigninInputSchema } from "./signin.models";
import { AuthResult, AuthToken } from "./auth.models";
import { createSession } from "./session.service";
import { toAuthUser } from "./auth-result.mapper";

export async function signinUser(input: SigninInput): Promise<AuthResult> {
    const parsed = SigninInputSchema.parse(input);

    const user = await prisma.appuser.findUnique({ where: { email: parsed.email } });
    if (!user) {
        throw new AuthError({ errorCode: AUTH_INVALID_CREDENTIALS, message: "Invalid credentials" });
    }

    const valid = await verifyPassword({ hash: user.password, plain: parsed.password });
    if (!valid) {
        throw new AuthError({ errorCode: AUTH_INVALID_CREDENTIALS, message: "Invalid credentials" });
    }

    if (!user.homepageId) {
        throw new IllegalStateError({ message: `User ${user.id} has no homepage` });
    }

    const accessToken = await createSession({ tx: prisma, userId: user.id });

    const authUser = toAuthUser(user as appuser & { homepageId: string });
    const token: AuthToken = { accessToken };
    return { user: authUser, token };
}
