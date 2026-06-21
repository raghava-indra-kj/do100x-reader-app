import { prisma } from "@core/db/prisma";
import { SignoutInput } from "./signout.models";

export async function signoutUser(input: SignoutInput): Promise<void> {
    await prisma.session.update({
        where: { token: input.sessionToken },
        data: { isActive: false },
    });
}
