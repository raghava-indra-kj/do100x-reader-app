import { prisma } from "@core/db/prisma";
import { CurrentUser } from "@core/models/current-user";
import { UserError } from "@modules/user/errors/user-error";
import { USER_NO_HOMEPAGE } from "@modules/user/errors/user-error.constants";
import { AuthError } from "./errors/auth-error";
import { AUTH_UNAUTHENTICATED } from "./errors/auth-error.constants";

export async function resolveCurrentUser({ token }: { token: string }): Promise<CurrentUser> {
    const session = await prisma.session.findFirst({ where: { token, isActive: true } });
    if (!session) throw new AuthError({ errorCode: AUTH_UNAUTHENTICATED, message: "Unauthenticated" });

    const user = await prisma.appuser.findUnique({ where: { id: session.userId } });
    if (!user) throw new AuthError({ errorCode: AUTH_UNAUTHENTICATED, message: "Unauthenticated" });

    if (!user.homepageId) {
        throw new UserError({ errorCode: USER_NO_HOMEPAGE, message: "User account is incomplete" });
    }

    return new CurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        homepageId: user.homepageId,
        sessionId: session.id,
    });
}
