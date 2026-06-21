import { Router } from "express";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ success: true });
});

export { router as statusRouter };
