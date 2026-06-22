import { prisma } from "@core/db/prisma";
import { SignoutInput, SignoutInputSchema } from "./signout.models";

export async function signoutUser(input: SignoutInput): Promise<void> {
    const { userId, sessionId, allSessions } = SignoutInputSchema.parse(input);
    if (allSessions) {
        await prisma.session.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });
    } else {
        await prisma.session.update({
            where: { id: sessionId },
            data: { isActive: false },
        });
    }
}
