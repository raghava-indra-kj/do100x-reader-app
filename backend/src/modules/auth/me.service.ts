import { prisma } from "@core/db/prisma";
import { IllegalStateError } from "@core/errors/illegal-state.error";
import { MeInput, MeInputSchema, MeResult } from "./me.models";

export async function getMe(input: MeInput): Promise<MeResult> {
    const { userId } = MeInputSchema.parse(input);
    const user = await prisma.appuser.findUnique({ where: { id: userId } });
    if (!user) {
        throw new IllegalStateError({ message: `User ${userId} not found` });
    }
    if (!user.homepageId) {
        throw new IllegalStateError({ message: `User ${userId} has no homepage` });
    }
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        homepageId: user.homepageId,
    };
}
