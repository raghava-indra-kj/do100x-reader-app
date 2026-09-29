import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

async function getCurrentUserId(req: { headers: { [key: string]: unknown } }): Promise<string | null> {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId) return null;
  const user = await prisma.appuser.findUnique({ where: { id: userId }, select: { id: true } });
  return user?.id ?? null;
}

router.get("/", async (req, res) => {
  const userId = await getCurrentUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Sign in to view preferences" });
    return;
  }

  const preferences = await prisma.user_preferences.findUnique({ where: { userId } });
  res.json({ motivationsEnabled: preferences?.motivationsEnabled ?? false });
});

router.patch("/", async (req, res) => {
  const userId = await getCurrentUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Sign in to update preferences" });
    return;
  }
  const { motivationsEnabled } = req.body as { motivationsEnabled?: unknown };
  if (typeof motivationsEnabled !== "boolean") {
    res.status(400).json({ message: "motivationsEnabled must be a boolean" });
    return;
  }

  const preferences = await prisma.user_preferences.upsert({
    where: { userId },
    create: { userId, motivationsEnabled },
    update: { motivationsEnabled },
  });
  res.json({ motivationsEnabled: preferences.motivationsEnabled });
});

export default router;
