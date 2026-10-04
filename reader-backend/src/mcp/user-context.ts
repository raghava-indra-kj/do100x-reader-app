import { prisma } from "../prisma";

export interface AuthenticatedMcpUser {
  id: string;
  displayName: string | null;
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

  // MCP remains scoped by the internal account UUID.
  const user = await prisma.appuser.findFirst({
    where: { id: cleanToken, identities: { some: { provider: "GOOGLE" } } },
    select: { id: true, displayName: true },
  });

  if (user) {
    return user;
  }

  return null;
}
