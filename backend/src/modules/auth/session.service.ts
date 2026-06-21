import { Prisma, PrismaClient } from "@prisma-generated";
import { generateToken } from "@lib/token";

type PrismaClientOrTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function createSession({
  tx,
  userId,
}: {
  tx: PrismaClientOrTx | Prisma.TransactionClient;
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
