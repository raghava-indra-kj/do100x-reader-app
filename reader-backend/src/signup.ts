import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

const router = Router();

router.post("/", async (req, res) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  const existing = await prisma.appuser.findFirst({ where: { username } });
  if (existing) {
    res.status(409).json({ message: "Username already taken" });
    return;
  }

  const userId = randomUUID();
  const pageId = randomUUID();
  const now = new Date();

  await prisma.$transaction([
    prisma.appuser.create({
      data: { id: userId, username, password, homepageId: pageId },
    }),
    prisma.page.create({
      data: {
        id: pageId,
        userId,
        parentId: null,
        title: "Home",
        content: null,
        sortOrder: 1,
        childrenCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    }),
  ]);

  const user = await prisma.appuser.findUniqueOrThrow({ where: { id: userId } });

  res.status(201).json(user);
});

export default router;
