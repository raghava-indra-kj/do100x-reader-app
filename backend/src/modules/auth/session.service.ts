import { randomBytes } from "crypto";
import { Prisma } from "@prisma-generated";
import { generateUuid } from "@lib/uuid";
import { SESSION_TOKEN_BYTES } from "@modules/auth/auth.constants";

export async function createSession({
    tx,
    userId,
}: {
    tx: Prisma.TransactionClient;
    userId: string;
}): Promise<string> {
    const accessToken = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
    await tx.session.create({
        data: {
            id: generateUuid(),
            userId,
            token: accessToken,
            isActive: true,
            createdAt: new Date(),
        },
    });
    return accessToken;
}
