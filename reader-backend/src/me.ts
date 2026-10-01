import { Router } from "express";
import { prisma } from "./prisma";
import { issueSession, clearSession } from "./session";
import { credentialsSchema } from "./auth-input";
import type { Prisma, PrismaClient } from "@prisma/client";

export function createMeRouter(db: PrismaClient | Prisma.TransactionClient = prisma) {
  const router = Router();

  router.post("/", async (req, res) => {
    const input = credentialsSchema.safeParse(req.body);
    if (!input.success) {
      res.status(422).json({ message: input.error.issues[0]?.message ?? "Invalid credentials" });
      return;
    }
    const { username, password } = input.data;

    const user = await db.appuser.findFirst({
      where: { username, password },
      select: { id: true, username: true, password: true, homepageId: true },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    issueSession(res, user.id);
    res.json(user);
  });

  router.post("/logout", (_req, res) => {
    clearSession(res);
    res.status(204).send();
  });

  return router;
}

export default createMeRouter();
