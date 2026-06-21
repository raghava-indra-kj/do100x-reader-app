import { prisma } from "@core/db/prisma";
import { SignoutInput } from "./signout.models";

export async function signoutUser({ userId, sessionId, allSessions }: SignoutInput): Promise<void> {
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
