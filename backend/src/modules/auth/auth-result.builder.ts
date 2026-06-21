import { appuser } from "@prisma/client";
import { AuthResult, AuthUser, AuthToken } from "./auth.models";

export function toAuthUser(user: appuser & { homepageId: string }): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    homepageId: user.homepageId,
  };
}

export function buildAuthResult({
  user,
  token,
}: {
  user: AuthUser;
  token: AuthToken;
}): AuthResult {
  return { user, token };
}
