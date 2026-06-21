import { Prisma } from "@prisma/client";
import { generateToken } from "@lib/token";

export async function createSession({
  tx,
  userId,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
}): Promise<string> {
  const accessToken = generateToken();
  await tx.session.create({
    data: {
      userId,
      token: accessToken,
      isActive: true,
      createdAt: new Date(),
    },
  });
  return accessToken;
}
