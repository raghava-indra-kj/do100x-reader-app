import { prisma } from "@core/db/prisma";
import { IllegalStateError } from "@core/errors/illegal-state.error";
import { CurrentUser } from "@core/models/current-user";
import { AuthError } from "./errors/auth-error";
import { AUTH_INVALID_TOKEN, AUTH_SESSION_INACTIVE } from "./errors/auth-error.constants";

export async function resolveCurrentUser({ token }: { token: string }): Promise<CurrentUser> {
    const session = await prisma.session.findFirst({ where: { token } });
    if (!session) {
        throw new AuthError({ errorCode: AUTH_INVALID_TOKEN, message: "Invalid token" });
    }
    if (!session.isActive) {
        throw new AuthError({ errorCode: AUTH_SESSION_INACTIVE, message: "Session is no longer active" });
    }

    const user = await prisma.appuser.findUnique({ where: { id: session.userId } });
    if (!user) {
        throw new IllegalStateError({ message: `Session ${session.id} references non-existent user ${session.userId}` });
    }

    if (!user.homepageId) {
        throw new IllegalStateError({ message: `User ${user.id} has no homepage` });
    }

    return new CurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        homepageId: user.homepageId,
        sessionId: session.id,
    });
}
