import { prisma } from "../prisma";

export interface AuthenticatedMcpUser {
  id: string;
  username: string;
}

/**
 * Validates the user token / identifier.
 * Strictly verifies the token matches an existing appuser.
 * Returns null if missing, invalid, or user not found. No default fallback.
 */
export async function validateUserToken(token?: string): Promise<AuthenticatedMcpUser | null> {
  if (!token || !token.trim()) {
    return null;
  }

  const cleanToken = token.trim();

  // Match against appuser ID or username
  const user = await prisma.appuser.findFirst({
    where: {
      OR: [
        { id: cleanToken },
        { username: cleanToken },
      ],
    },
    select: { id: true, username: true },
  });

  if (user) {
    return user;
  }

  return null;
}
