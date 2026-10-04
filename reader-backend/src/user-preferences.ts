import { Router } from "express";
import { prisma } from "./prisma";
import { requireSession } from "./session";

const router = Router();
router.use(requireSession);


router.get("/", async (req, res) => {
  const userId = res.locals.userId as string;

  const preferences = await prisma.user_preferences.findUnique({ where: { userId } });
  res.json({ motivationsEnabled: preferences?.motivationsEnabled ?? false });
});

router.patch("/", async (req, res) => {
  const userId = res.locals.userId as string;
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
