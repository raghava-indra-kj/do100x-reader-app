import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.appuser.findFirst({
    where: { username, password },
    select: { id: true, username: true, password: true, homepageId: true },
  });

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  res.json(user);
});

export default router;
