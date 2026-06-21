import { appuser } from "@prisma-generated";
import { AuthUser } from "./auth.models";

export function toAuthUser(user: appuser & { homepageId: string }): AuthUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        homepageId: user.homepageId,
    };
}
