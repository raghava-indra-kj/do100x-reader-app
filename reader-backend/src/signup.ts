import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { issueSession } from "./session";
import { credentialsSchema } from "./auth-input";
import type { Prisma, PrismaClient } from "@prisma/client";

export function createSignupRouter(db: PrismaClient | Prisma.TransactionClient = prisma) {
  const router = Router();

  router.post("/", async (req, res) => {
    const input = credentialsSchema.safeParse(req.body);
    if (!input.success) {
      res.status(422).json({ message: input.error.issues[0]?.message ?? "Invalid credentials" });
      return;
    }
    const { username, password } = input.data;

    const existing = await db.appuser.findFirst({ where: { username } });
    if (existing) {
      res.status(409).json({ message: "Username already taken" });
      return;
    }

    const userId = randomUUID();
    const pageId = randomUUID();
    const now = new Date();

    const createAccount = async (tx: Prisma.TransactionClient) => {
      const user = await tx.appuser.create({
        data: { id: userId, username, password, homepageId: pageId },
      });
      await tx.page.create({
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
      });
      return user;
    };
    const user = "$transaction" in db ? await db.$transaction(createAccount) : await createAccount(db);

    issueSession(res, user.id);
    res.status(201).json(user);
  });

  return router;
}

export default createSignupRouter();
