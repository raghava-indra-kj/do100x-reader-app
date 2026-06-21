import { randomBytes } from "crypto";
import { Prisma, PrismaClient } from "@prisma-generated";

const SESSION_TOKEN_BYTES = 32;

type PrismaClientOrTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function createSession({
  tx,
  userId,
}: {
  tx: PrismaClientOrTx | Prisma.TransactionClient;
  userId: string;
}): Promise<string> {
  const accessToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
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
