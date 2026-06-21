import { prisma } from "@core/db/prisma";
import { SignoutInput } from "./signout.models";

export async function signoutUser({ userId }: SignoutInput): Promise<void> {
    await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
    });
}
