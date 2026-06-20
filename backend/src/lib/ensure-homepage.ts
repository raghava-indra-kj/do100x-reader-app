import { randomUUID } from "crypto";
import { prisma } from "../prisma";

/**
 * Ensures a user has a homepage. If `homepageId` is already set, returns it.
 * Otherwise creates a "Home" page in a transaction and links it to the user.
 */
export async function ensureHomepage(userId: string): Promise<string> {
  const user = await prisma.appuser.findUniqueOrThrow({ where: { id: userId } });

  if (user.homepageId) {
    return user.homepageId;
  }

  const pageId = randomUUID();
  const now = new Date();

  await prisma.$transaction([
    prisma.page.create({
      data: {
        id: pageId,
        userId,
        parentId: null,
        title: "Home",
        content: null,
        isPublic: false,
        sortOrder: 1,
        childrenCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.appuser.update({
      where: { id: userId },
      data: { homepageId: pageId },
    }),
  ]);

  return pageId;
}
