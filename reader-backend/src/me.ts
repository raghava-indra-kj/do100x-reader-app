import { Router } from "express";
import { prisma } from "./prisma";
import { issueSession, clearSession } from "./session";

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

  issueSession(res, user.id);
  res.json(user);
});

router.post("/logout", (_req, res) => {
  clearSession(res);
  res.status(204).send();
});

export default router;
